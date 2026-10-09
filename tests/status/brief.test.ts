import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { brief } from '../../src/plan/brief';
import { findPlan } from '../../src/plan/find';
import { startPhase } from '../../src/state';
import { buildCli, runCli, type BuiltCli } from '../helpers/cli';
import { makeRepo, planSource, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

let root: string;

beforeEach(() => {
  root = makeRepo('builderdev-brief-');
});

afterEach(() => {
  removeRepo(root);
});

const PHASES = [{ id: 'f1', title: 'Primeira' }, { id: 'f2', title: 'Segunda', needs: ['f1'] }, { id: 'f3', title: 'Terceira' }];

describe('brief', { timeout: 30_000 }, () => {
  it('contém só a fase pedida, com Contexto e Fora do escopo', () => {
    writePlan(root, 'demo', planSource('demo', PHASES));

    const text = brief(findPlan(root, 'demo'), 'f2');

    expect(text).toBe(
      [
        '# Plano demo · demo/f2',
        'Plano: .dev/plans/demo.md',
        '',
        '## Contexto',
        '',
        'Contexto do plano demo.',
        '',
        '## Fora do escopo',
        '',
        '- O que fica para depois.',
        '',
        '## Entrada no YAML',
        '',
        '```yaml',
        '- id: f2',
        '  title: Segunda',
        '  needs: [f1]',
        '  files: [src/f2.ts]',
        '  verify: ["npm test -- f2"]',
        '  commit_msg: "feat: entrega da f2"',
        '```',
        '',
        '## f2 · Segunda',
        '',
        '### Objetivo',
        '',
        'Texto exclusivo da f2.',
        '',
        '### Escopo',
        '',
        '#### Código',
        '',
        '- `src/f2.ts`',
        '',
        '### Validação visual',
        '',
        '- Conferir a f2.',
        '',
      ].join('\n'),
    );
    for (const other of ['f1', 'f3']) {
      expect(text).not.toContain(`Texto exclusivo da ${other}`);
      expect(text).not.toContain(`## ${other} ·`);
      expect(text).not.toContain(`src/${other}.ts`);
    }
  });

  it('a última fase não leva junto o resto do frontmatter nem seções que não são do brief', () => {
    const source = planSource('demo', PHASES)
      .replace('phases:\n', 'phases:\n  # fases em ordem\n')
      .replace('    commit_msg: "feat: entrega da f3"\n---', '    # comentário da f3\n    commit_msg: "feat: entrega da f3"\n\nbranch: feat/demo\n---')
      .replace('## Fora do escopo', '## Restrições herdadas\n\n- Restrição que não entra.\n\n## Fora do escopo');
    writePlan(root, 'demo', source);

    const text = brief(findPlan(root, 'demo'), 'f3');

    expect(text).toContain(
      ['```yaml', '- id: f3', '  title: Terceira', '  files: [src/f3.ts]', '  verify: ["npm test -- f3"]', '  # comentário da f3', '  commit_msg: "feat: entrega da f3"', '```'].join('\n'),
    );
    expect(text).not.toContain('branch: feat/demo');
    expect(text).not.toContain('Restrição que não entra');
    expect(text).toContain('## Fora do escopo');
    expect(text).not.toContain('Texto exclusivo da f2');
  });

  it('aceita lista de fases sem indentação e em estilo de fluxo', () => {
    const compact = planSource('demo', PHASES).replace(/^ {2}/gm, '');
    writePlan(root, 'demo', compact);
    expect(brief(findPlan(root, 'demo'), 'f1')).toContain('```yaml\n- id: f1\n  title: Primeira\n  files: [src/f1.ts]');

    const flow = planSource('flow', [{ id: 'f1', title: 'Primeira' }]).replace(
      /phases:\n[\s\S]*?\n---/,
      'phases: [{ id: f1, title: Primeira, files: [a.ts], verify: [npm test], commit_msg: "feat: a" }]\n---',
    );
    writePlan(root, 'flow', flow);
    expect(brief(findPlan(root, 'flow'), 'f1')).toContain('```yaml\n- id: f1\n  title: Primeira\n  files:\n    - a.ts');
  });

  it('fase inexistente gera erro claro', () => {
    writePlan(root, 'demo', planSource('demo', PHASES));

    expect(() => brief(findPlan(root, 'demo'), 'f7')).toThrow('fase "f7" não existe no plano demo (fases: f1, f2, f3)');
  });
});

describe('builderdev brief (CLI)', { timeout: 30_000 }, () => {
  let cliDir: string;
  let cli: BuiltCli;

  beforeAll(() => {
    cliDir = mkdtempSync(join(tmpdir(), 'builderdev-cli-'));
    cli = buildCli(cliDir);
  });

  afterAll(() => {
    rmSync(cliDir, { recursive: true, force: true });
  });

  it('sem argumento usa a fase ativa; sem fase ativa, explica o que fazer', () => {
    writePlan(root, 'demo', planSource('demo', [{ id: 'f1', title: 'Primeira' }, { id: 'f2', title: 'Segunda', needs: [] }]));

    const none = runCli(cli, root, 'brief');
    expect(none.status).toBe(1);
    expect(none.stderr).toContain('nenhuma fase ativa: use builderdev start <plano>/<fase>');

    startPhase(root, 'demo/f2');
    const active = runCli(cli, root, 'brief');
    expect(active.status).toBe(0);
    expect(active.stdout).toBe(brief(findPlan(root, 'demo'), 'f2'));

    expect(runCli(cli, root, 'brief', 'demo/f1').stdout).toContain('## f1 · Primeira');
  });
});
