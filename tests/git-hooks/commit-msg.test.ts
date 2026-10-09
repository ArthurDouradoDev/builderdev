import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prepareCommitMsg } from '../../src/commit-msg';
import { installHook } from '../../src/git/hooks-install';
import { startPhase } from '../../src/state';
import { buildCli, gitWithCli, type BuiltCli } from '../helpers/cli';
import { commit, git, makeRepo, planSource, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

let root: string;
let msg: string;

const PLAN = planSource('demo', [
  { id: 'f1', commitMsg: 'feat: primeira entrega' },
  { id: 'f2', commitMsg: 'feat: segunda entrega' },
]);

/** O que o git põe em COMMIT_EDITMSG num `git commit` sem -m. */
const GIT_TEMPLATE = [
  '',
  "# Please enter the commit message for your changes. Lines starting",
  "# with '#' will be ignored, and an empty message aborts the commit.",
  '#',
  '# On branch main',
  '',
].join('\n');

beforeEach(() => {
  root = makeRepo('builderdev-commitmsg-');
  msg = join(root, '.git/COMMIT_EDITMSG');
  writePlan(root, 'demo', PLAN);
});

afterEach(() => {
  removeRepo(root);
});

const trailerCount = (text: string) => text.match(/^Plan-Step: /gim)?.length ?? 0;

describe('prepareCommitMsg', { timeout: 30_000 }, () => {
  it('sem fase ativa, o arquivo fica intacto', () => {
    writeFileSync(msg, GIT_TEMPLATE);

    expect(prepareCommitMsg(msg, undefined, root)).toEqual({ action: 'ignorado', reason: 'nenhuma fase ativa' });
    expect(readFileSync(msg, 'utf8')).toBe(GIT_TEMPLATE);
  });

  it('mensagem vazia recebe o commit_msg da fase e o trailer, antes dos comentários do git', () => {
    startPhase(root, 'demo/f1');
    writeFileSync(msg, GIT_TEMPLATE);

    expect(prepareCommitMsg(msg, undefined, root).action).toBe('preenchido');
    expect(readFileSync(msg, 'utf8')).toBe(`feat: primeira entrega\n\nPlan-Step: demo/f1\n${GIT_TEMPLATE}`);
  });

  it('mensagem vazia do commit -v: o diff depois da tesoura não conta como texto', () => {
    startPhase(root, 'demo/f1');
    const verbose = `${GIT_TEMPLATE}# ------------------------ >8 ------------------------\n# Do not modify or remove the line above.\ndiff --git a/x b/x\n+linha\n`;
    writeFileSync(msg, verbose);

    expect(prepareCommitMsg(msg, undefined, root).action).toBe('preenchido');
    const text = readFileSync(msg, 'utf8');
    expect(text.startsWith('feat: primeira entrega\n\nPlan-Step: demo/f1\n')).toBe(true);
    expect(text.endsWith('diff --git a/x b/x\n+linha\n')).toBe(true);
  });

  it('mensagem existente recebe só o trailer', () => {
    startPhase(root, 'demo/f1');
    writeFileSync(msg, 'fix: corrige a borda\n\nDetalhe do corpo.\n');

    expect(prepareCommitMsg(msg, 'message', root).action).toBe('trailer');
    expect(readFileSync(msg, 'utf8')).toBe('fix: corrige a borda\n\nDetalhe do corpo.\n\nPlan-Step: demo/f1\n');
  });

  it('não duplica o trailer, nem troca o de outra fase', () => {
    startPhase(root, 'demo/f1');
    const withTrailer = 'feat: primeira entrega\n\nPlan-Step: demo/f1\n';
    writeFileSync(msg, withTrailer);
    expect(prepareCommitMsg(msg, 'commit', root).action).toBe('inalterado');
    expect(readFileSync(msg, 'utf8')).toBe(withTrailer);

    const otherPhase = 'feat: antiga\n\nplan-step: demo/f2\n';
    writeFileSync(msg, otherPhase);
    expect(prepareCommitMsg(msg, 'commit', root).action).toBe('inalterado');
    expect(readFileSync(msg, 'utf8')).toBe(otherPhase);
  });

  it.each(['merge', 'squash'])('origem %s é ignorada', (source) => {
    startPhase(root, 'demo/f1');
    writeFileSync(msg, "Merge branch 'outra'\n");

    expect(prepareCommitMsg(msg, source, root)).toEqual({ action: 'ignorado', reason: source });
    expect(readFileSync(msg, 'utf8')).toBe("Merge branch 'outra'\n");
  });

  it('rebase ou cherry-pick em andamento: commits reaproveitados não recebem o trailer', () => {
    startPhase(root, 'demo/f1');
    writeFileSync(msg, 'chore: commit antigo\n');
    mkdirSync(join(root, '.git/rebase-merge'));

    expect(prepareCommitMsg(msg, 'message', root)).toEqual({ action: 'ignorado', reason: 'rebase-merge' });
    expect(readFileSync(msg, 'utf8')).toBe('chore: commit antigo\n');
  });

  it('usa o caractere de comentário configurado no git', () => {
    git(root, 'config', 'core.commentChar', ';');
    startPhase(root, 'demo/f1');
    writeFileSync(msg, '\n; Please enter the commit message\n;\n');

    expect(prepareCommitMsg(msg, undefined, root).action).toBe('preenchido');
  });

  it('fase ativa que não existe mais gera erro, que o CLI transforma em aviso', () => {
    startPhase(root, 'demo/f1');
    rmSync(join(root, '.dev/plans/demo.md'));
    writeFileSync(msg, GIT_TEMPLATE);

    expect(() => prepareCommitMsg(msg, undefined, root)).toThrow('plano "demo" não encontrado');
    expect(readFileSync(msg, 'utf8')).toBe(GIT_TEMPLATE);
  });
});

describe('prepare-commit-msg com git de verdade', { timeout: 60_000 }, () => {
  let cliDir: string;
  let cli: BuiltCli;

  beforeAll(() => {
    cliDir = mkdtempSync(join(tmpdir(), 'builderdev-cli-'));
    cli = buildCli(cliDir);
  });

  afterAll(() => {
    rmSync(cliDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    installHook(root);
  });

  const run = (...args: string[]) => {
    const r = gitWithCli(cli, root, ...args);
    expect(r.status, r.stderr).toBe(0);
    return r;
  };
  const message = (rev = 'HEAD') => git(root, 'log', '-1', '--format=%B', rev).trimEnd();

  it('commit sem -m: o editor abre com o commit_msg da fase e o trailer', () => {
    startPhase(root, 'demo/f1');
    const editorDir = mkdtempSync(join(tmpdir(), 'builderdev-editor-'));
    const seen = join(editorDir, 'seen.txt').replace(/\\/g, '/');
    const editor = process.env.GIT_EDITOR;
    try {
      // "Editor" que só copia o que recebeu, para conferir o que o usuário veria.
      process.env.GIT_EDITOR = `cp "$1" "${seen}" #`;
      run('commit', '--allow-empty');
      const opened = readFileSync(seen, 'utf8');
      expect(opened.startsWith('feat: primeira entrega\n\nPlan-Step: demo/f1\n\n#')).toBe(true);
    } finally {
      process.env.GIT_EDITOR = editor;
      rmSync(editorDir, { recursive: true, force: true });
    }
    expect(message()).toBe('feat: primeira entrega\n\nPlan-Step: demo/f1');
  });

  it('commit -m: mantém a mensagem e acrescenta o trailer', () => {
    startPhase(root, 'demo/f1');
    run('commit', '-q', '--allow-empty', '-m', 'fix: ajuste pontual');

    expect(message()).toBe('fix: ajuste pontual\n\nPlan-Step: demo/f1');
  });

  it('--amend não duplica o trailer, com ou sem nova mensagem', () => {
    startPhase(root, 'demo/f1');
    run('commit', '-q', '--allow-empty', '-m', 'feat: primeira entrega');
    run('commit', '-q', '--amend', '--allow-empty', '--no-edit');
    expect(trailerCount(message())).toBe(1);

    run('commit', '-q', '--amend', '--allow-empty');
    expect(trailerCount(message())).toBe(1);

    run('commit', '-q', '--amend', '--allow-empty', '-m', 'feat: primeira entrega, revista');
    expect(message()).toBe('feat: primeira entrega, revista\n\nPlan-Step: demo/f1');
  });

  it('merge não recebe trailer', () => {
    commit(root, 'chore: base');
    git(root, 'switch', '-q', '-c', 'outra');
    commit(root, 'chore: trabalho na outra branch');
    git(root, 'switch', '-q', 'main');
    commit(root, 'chore: trabalho na main');
    startPhase(root, 'demo/f1');

    run('merge', '--no-ff', 'outra');

    expect(git(root, 'rev-list', '--count', '--merges', 'HEAD').trim()).toBe('1');
    expect(trailerCount(message())).toBe(0);
  });

  it('rebase não põe o trailer em commits antigos', () => {
    commit(root, 'chore: base');
    commit(root, 'chore: um');
    commit(root, 'chore: dois');
    startPhase(root, 'demo/f1');

    run('rebase', '-q', '--force-rebase', 'HEAD~2');

    expect(git(root, 'log', '--format=%B', 'HEAD~2..HEAD')).not.toMatch(/Plan-Step/i);
  });

  it('sem fase ativa, o commit sai como veio', () => {
    run('commit', '-q', '--allow-empty', '-m', 'chore: sem fase');

    expect(message()).toBe('chore: sem fase');
  });

  it('fase ativa desatualizada: o commit passa, com aviso', () => {
    startPhase(root, 'demo/f1');
    rmSync(join(root, '.dev/plans/demo.md'));

    const r = run('commit', '-q', '--allow-empty', '-m', 'chore: segue');

    expect(r.stderr).toContain('builderdev commit-msg: plano "demo" não encontrado');
    expect(r.stderr).toContain('builderdev stop');
    expect(message()).toBe('chore: segue');
  });
});
