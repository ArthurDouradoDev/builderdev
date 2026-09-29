import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HOOK_BLOCK, hooksDir, installHook, uninstallHook } from '../../src/git/hooks-install';
import { buildCli, gitWithCli, type BuiltCli } from '../helpers/cli';
import { git, makeRepo, removeRepo, useIsolatedGit } from '../helpers/repo';

useIsolatedGit();

let root: string;
let hook: string;

beforeEach(() => {
  root = makeRepo('betterdev-hooks-');
  hook = join(root, '.git/hooks/prepare-commit-msg');
});

afterEach(() => {
  removeRepo(root);
});

const FOREIGN = '#!/bin/sh\n# hook de outra ferramenta\necho "outra ferramenta" >&2\n';

describe('hooks install', { timeout: 30_000 }, () => {
  it('hook ausente: cria um arquivo executável com o bloco', () => {
    expect(installHook(root)).toEqual({ action: 'criado', path: '.git/hooks/prepare-commit-msg' });

    expect(readFileSync(hook, 'utf8')).toBe(`#!/bin/sh\n${HOOK_BLOCK}\n`);
    if (process.platform !== 'win32') expect(statSync(hook).mode & 0o111).toBe(0o111);
    expect(existsSync(`${hook}.bak`)).toBe(false);
  });

  it('hook com o marcador: atualiza só o bloco e não mexe no resto', () => {
    const old = HOOK_BLOCK.replace('commit-msg "$1" "$2"', 'commit-msg "$1"');
    writeFileSync(hook, `#!/bin/sh\necho antes\n\n${old}\necho depois\n`);

    expect(installHook(root).action).toBe('atualizado');
    expect(readFileSync(hook, 'utf8')).toBe(`#!/bin/sh\necho antes\n\n${HOOK_BLOCK}\necho depois\n`);
    expect(existsSync(`${hook}.bak`)).toBe(false);

    expect(installHook(root).action).toBe('inalterado');
  });

  it('hook de outra ferramenta: salva .bak e acrescenta o bloco no final', () => {
    writeFileSync(hook, FOREIGN);

    const result = installHook(root);

    expect(result).toEqual({
      action: 'acrescentado',
      path: '.git/hooks/prepare-commit-msg',
      backup: '.git/hooks/prepare-commit-msg.bak',
    });
    expect(readFileSync(`${hook}.bak`, 'utf8')).toBe(FOREIGN);
    expect(readFileSync(hook, 'utf8')).toBe(`${FOREIGN}\n${HOOK_BLOCK}\n`);
    expect(installHook(root).action).toBe('inalterado');
  });

  it('respeita core.hooksPath, também rodando de uma subpasta', () => {
    git(root, 'config', 'core.hooksPath', '.githooks');
    const sub = join(root, 'src/deep');
    mkdirSync(sub, { recursive: true });

    expect(hooksDir(sub)).toBe(join(root, '.githooks'));
    expect(installHook(sub)).toEqual({ action: 'criado', path: '../../.githooks/prepare-commit-msg' });
    expect(existsSync(join(root, '.githooks/prepare-commit-msg'))).toBe(true);
    expect(existsSync(hook)).toBe(false);

    expect(uninstallHook(root)).toEqual({ action: 'removido', path: '.githooks/prepare-commit-msg' });
    expect(existsSync(join(root, '.githooks/prepare-commit-msg'))).toBe(false);
  });

  it('fora de um repositório git, falha com mensagem clara', () => {
    const outside = mkdtempSync(join(tmpdir(), 'betterdev-nogit-'));
    try {
      expect(() => installHook(outside)).toThrow(/^git rev-parse: not a git repository/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('hooks uninstall', { timeout: 30_000 }, () => {
  it('hook criado pelo betterdev: apaga o arquivo', () => {
    installHook(root);

    expect(uninstallHook(root).action).toBe('removido');
    expect(existsSync(hook)).toBe(false);
    expect(uninstallHook(root).action).toBe('ausente');
  });

  it.each([
    ['com quebra de linha final', FOREIGN],
    ['sem quebra de linha final', FOREIGN.trimEnd()],
    ['com linhas em branco no final', `${FOREIGN}\n\n`],
  ])('hook alheio %s: volta byte a byte ao original e apaga o .bak', (_, original) => {
    writeFileSync(hook, original);
    installHook(root);

    expect(uninstallHook(root).action).toBe('restaurado');
    expect(readFileSync(hook, 'utf8')).toBe(original);
    expect(existsSync(`${hook}.bak`)).toBe(false);
  });

  it('hook alheio editado depois do install: remove só o bloco e mantém o .bak', () => {
    writeFileSync(hook, FOREIGN);
    installHook(root);
    writeFileSync(hook, readFileSync(hook, 'utf8').replace('echo "outra', 'echo "nova linha"\necho "outra'));

    expect(uninstallHook(root).action).toBe('bloco removido');
    expect(readFileSync(hook, 'utf8')).toBe(FOREIGN.replace('echo "outra', 'echo "nova linha"\necho "outra'));
    expect(readFileSync(`${hook}.bak`, 'utf8')).toBe(FOREIGN);
  });

  it('hook sem o bloco fica intacto', () => {
    writeFileSync(hook, FOREIGN);

    expect(uninstallHook(root).action).toBe('ausente');
    expect(readFileSync(hook, 'utf8')).toBe(FOREIGN);
  });
});

describe('o hook instalado nunca bloqueia um commit', { timeout: 60_000 }, () => {
  let cliDir: string;
  let cli: BuiltCli;
  let failing: BuiltCli;

  beforeAll(() => {
    cliDir = mkdtempSync(join(tmpdir(), 'betterdev-cli-'));
    cli = buildCli(cliDir);
    // Um betterdev que sempre falha, para provar que a falha dele não chega ao git.
    failing = { script: cli.script, binDir: join(cliDir, 'failing') };
    mkdirSync(failing.binDir);
    writeFileSync(join(failing.binDir, 'betterdev'), '#!/bin/sh\necho "betterdev quebrado" >&2\nexit 7\n', { mode: 0o755 });
  });

  afterAll(() => {
    rmSync(cliDir, { recursive: true, force: true });
  });

  const commitCount = () => Number(git(root, 'rev-list', '--count', '--all').trim() || 0);

  it('sem betterdev no PATH, com betterdev falhando e com betterdev funcionando', () => {
    installHook(root);

    expect(gitWithCli(null, root, 'commit', '-q', '--allow-empty', '-m', 'sem cli').status).toBe(0);
    const broken = gitWithCli(failing, root, 'commit', '-q', '--allow-empty', '-m', 'cli quebrado');
    expect(broken.status).toBe(0);
    expect(broken.stderr).toContain('betterdev quebrado');
    expect(gitWithCli(cli, root, 'commit', '-q', '--allow-empty', '-m', 'cli ok').status).toBe(0);
    expect(commitCount()).toBe(3);
  });

  it('preserva o código de saída do hook alheio', () => {
    writeFileSync(hook, '#!/bin/sh\necho "validação da outra ferramenta falhou" >&2\nfalse\n');
    installHook(root);

    const r = gitWithCli(cli, root, 'commit', '-q', '--allow-empty', '-m', 'barrado pela outra ferramenta');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('validação da outra ferramenta falhou');
    expect(commitCount()).toBe(0);
  });
});
