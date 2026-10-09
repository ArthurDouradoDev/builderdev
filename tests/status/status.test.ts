import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readPlanSteps } from '../../src/git/log';
import { findPlan } from '../../src/plan/find';
import { formatPlanStatus, planStatus, type PhaseState } from '../../src/plan/status';
import { STATE_FILE, clearState, readState, startPhase } from '../../src/state';
import { buildCli, runCli, type BuiltCli } from '../helpers/cli';
import { commit, git, makeRepo, planSource, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

let root: string;

beforeEach(() => {
  root = makeRepo('builderdev-status-');
});

afterEach(() => {
  removeRepo(root);
});

const LINEAR = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];
const PARALLEL = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3', needs: ['f1'] }, { id: 'f4', needs: ['f2', 'f3'] }];

/** Status do plano `id` como `[fase, status, bloqueios, nº de commits]`. */
function statusOf(id: string, { all = false } = {}): Array<[string, string, string[], number]> {
  const phases = planStatus(findPlan(root, id), readPlanSteps(root, { all }), readState(root)).phases;
  return phases.map((p: PhaseState) => [p.id, p.status, p.blockedBy, p.commits.length]);
}

describe('status derivado do git', { timeout: 30_000 }, () => {
  it('cadeia linear: cada fase depende da anterior', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    expect(statusOf('linear')).toEqual([
      ['f1', 'pendente', [], 0],
      ['f2', 'bloqueada', ['f1'], 0],
      ['f3', 'bloqueada', ['f2'], 0],
    ]);

    commit(root, 'feat: f1', 'linear/f1');
    expect(statusOf('linear')).toEqual([
      ['f1', 'concluida', [], 1],
      ['f2', 'pendente', [], 0],
      ['f3', 'bloqueada', ['f2'], 0],
    ]);

    commit(root, 'feat: f2', 'linear/f2');
    commit(root, 'fix: ajuste da f2', 'linear/f2');
    expect(statusOf('linear')).toEqual([
      ['f1', 'concluida', [], 1],
      ['f2', 'concluida', [], 2],
      ['f3', 'pendente', [], 0],
    ]);
  });

  it('needs paralelo: f3 é liberada só com a f1, e f4 espera f2 e f3', () => {
    writePlan(root, 'par', planSource('par', PARALLEL));
    commit(root, 'feat: f1', 'par/f1');

    expect(statusOf('par')).toEqual([
      ['f1', 'concluida', [], 1],
      ['f2', 'pendente', [], 0],
      ['f3', 'pendente', [], 0],
      ['f4', 'bloqueada', ['f2', 'f3'], 0],
    ]);

    commit(root, 'feat: f3', 'par/f3');
    expect(statusOf('par').slice(2)).toEqual([
      ['f3', 'concluida', [], 1],
      ['f4', 'bloqueada', ['f2'], 0],
    ]);
  });

  it('ignora commits sem trailer e trailers de outros planos, e aceita a chave em minúsculas', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    commit(root, 'chore: sem trailer');
    commit(root, 'feat: outro plano', 'outro/f1', 'linear-2/f1');
    git(root, 'commit', '-q', '--allow-empty', '-m', 'feat: f1', '-m', 'plan-step: linear/f1');

    expect(statusOf('linear').map(([id, status]) => [id, status])).toEqual([
      ['f1', 'concluida'],
      ['f2', 'pendente'],
      ['f3', 'bloqueada'],
    ]);
  });

  it('um commit pode concluir várias fases, e cada fase lista seus commits', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    const hash = commit(root, 'feat: f1 e f2', 'linear/f1', 'linear/f2');

    const steps = readPlanSteps(root);
    expect(steps.get('linear/f1')).toEqual([hash]);
    expect(steps.get('linear/f2')).toEqual([hash]);
  });

  it('repositório sem commits: nada concluído, sem erro', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));

    expect(readPlanSteps(root).size).toBe(0);
    expect(readPlanSteps(root, { all: true }).size).toBe(0);
    expect(statusOf('linear')[0]).toEqual(['f1', 'pendente', [], 0]);
  });

  it('trailer em outra branch só aparece com --all', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    commit(root, 'chore: base');
    git(root, 'switch', '-q', '-c', 'outra');
    commit(root, 'feat: f1', 'linear/f1');
    git(root, 'switch', '-q', 'main');

    expect(statusOf('linear')[0]).toEqual(['f1', 'pendente', [], 0]);
    expect(statusOf('linear', { all: true })[0]).toEqual(['f1', 'concluida', [], 1]);
  });
});

describe('fase ativa', { timeout: 30_000 }, () => {
  it('start grava o estado local e a fase aparece como ativa', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    commit(root, 'feat: f1', 'linear/f1');

    const result = startPhase(root, 'linear/f2', { now: new Date('2026-09-29T12:00:00Z') });

    expect(result.warnings).toEqual([]);
    expect(result.title).toBe('Fase f2');
    expect(JSON.parse(readFileSync(join(root, STATE_FILE), 'utf8'))).toEqual({
      plan: 'linear',
      phase: 'f2',
      startedAt: '2026-09-29T12:00:00.000Z',
    });
    expect(statusOf('linear').map(([id, status]) => [id, status])).toEqual([
      ['f1', 'concluida'],
      ['f2', 'ativa'],
      ['f3', 'bloqueada'],
    ]);
  });

  it('fase bloqueada: start recusa sem --force e ativa com --force, mantendo o bloqueio visível', () => {
    writePlan(root, 'par', planSource('par', PARALLEL));

    expect(() => startPhase(root, 'par/f4')).toThrow('par/f4 está bloqueada: aguarda f2, f3 (use --force para ativar mesmo assim)');
    expect(readState(root)).toBeNull();

    const result = startPhase(root, 'par/f4', { force: true });
    expect(result.warnings).toEqual(['par/f4 está bloqueada: aguarda f2, f3']);
    expect(statusOf('par')[3]).toEqual(['f4', 'ativa', ['f2', 'f3'], 0]);
  });

  it('fase concluída vence a ativa, e start avisa', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    commit(root, 'feat: f1', 'linear/f1');

    const result = startPhase(root, 'linear/f1');

    expect(result.warnings[0]).toMatch(/^linear\/f1 já está concluída \([0-9a-f]{7}\)/);
    expect(statusOf('linear')[0]![1]).toBe('concluida');
  });

  it('start valida plano e fase, e registra a fase anterior', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));

    expect(() => startPhase(root, 'linear')).toThrow('formato <plano>/<fase>');
    expect(() => startPhase(root, 'nada/f1')).toThrow('plano "nada" não encontrado em .dev/plans/ (existentes: linear)');
    expect(() => startPhase(root, 'linear/f9')).toThrow('fase "f9" não existe no plano linear (fases: f1, f2, f3)');

    startPhase(root, 'linear/f1');
    commit(root, 'feat: f1', 'linear/f1');
    expect(startPhase(root, 'linear/f2').previous).toMatchObject({ plan: 'linear', phase: 'f1' });
  });

  it('stop limpa o estado; estado corrompido conta como nenhum', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    startPhase(root, 'linear/f1');

    expect(clearState(root)).toMatchObject({ plan: 'linear', phase: 'f1' });
    expect(existsSync(join(root, STATE_FILE))).toBe(false);
    expect(clearState(root)).toBeNull();

    writeFileSync(join(root, STATE_FILE), '{"plan": "linear",');
    expect(readState(root)).toBeNull();
    writeFileSync(join(root, STATE_FILE), '{"plan": "linear"}');
    expect(readState(root)).toBeNull();
  });
});

describe('formatPlanStatus', { timeout: 30_000 }, () => {
  it('segue o formato da tabela do plano', () => {
    writePlan(
      root,
      'v1',
      planSource('v1', [
        { id: 'f1', title: 'Fundação' },
        { id: 'f2', title: 'Status derivado' },
        { id: 'f3', title: 'Memória', needs: ['f1'] },
        { id: 'f4', title: 'Hooks', needs: ['f2', 'f3'] },
      ]),
    );
    const hash = commit(root, 'feat: f1', 'v1/f1');
    startPhase(root, 'v1/f2');

    expect(formatPlanStatus(planStatus(findPlan(root, 'v1'), readPlanSteps(root), readState(root)))).toBe(
      [
        'v1 · Plano v1',
        `  f1  concluída  Fundação         ${hash.slice(0, 7)}`,
        '  f2  ativa      Status derivado',
        '  f3  pendente   Memória',
        '  f4  bloqueada  Hooks            aguarda f2, f3',
      ].join('\n'),
    );
  });
});

describe('builderdev status (CLI)', { timeout: 30_000 }, () => {
  let cliDir: string;
  let cli: BuiltCli;

  beforeAll(() => {
    cliDir = mkdtempSync(join(tmpdir(), 'builderdev-cli-'));
    cli = buildCli(cliDir);
  });

  afterAll(() => {
    rmSync(cliDir, { recursive: true, force: true });
  });

  it('--json traz a fase ativa e, por fase, status, dependências e commits', () => {
    writePlan(root, 'par', planSource('par', PARALLEL));
    const hash = commit(root, 'feat: f1', 'par/f1');
    expect(runCli(cli, root, 'start', 'par/f2').status).toBe(0);

    const r = runCli(cli, root, 'status', 'par', '--json');

    expect(r.status).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.active).toMatchObject({ plan: 'par', phase: 'f2' });
    expect(data.plans).toHaveLength(1);
    expect(data.plans[0]).toMatchObject({ id: 'par', title: 'Plano par', path: '.dev/plans/par.md' });
    expect(data.plans[0].phases).toEqual([
      { id: 'f1', title: 'Fase f1', status: 'concluida', needs: null, dependsOn: [], blockedBy: [], commits: [hash] },
      { id: 'f2', title: 'Fase f2', status: 'ativa', needs: null, dependsOn: ['f1'], blockedBy: [], commits: [] },
      { id: 'f3', title: 'Fase f3', status: 'pendente', needs: ['f1'], dependsOn: ['f1'], blockedBy: [], commits: [] },
      { id: 'f4', title: 'Fase f4', status: 'bloqueada', needs: ['f2', 'f3'], dependsOn: ['f2', 'f3'], blockedBy: ['f2', 'f3'], commits: [] },
    ]);
  });

  it('sem argumento mostra todos os planos, também a partir de uma subpasta', () => {
    writePlan(root, 'a', planSource('a', [{ id: 'f1' }]));
    writePlan(root, 'b', planSource('b', [{ id: 'f1' }]));
    git(root, 'commit', '-q', '--allow-empty', '-m', 'chore: base');
    const sub = join(root, '.dev/plans');

    const r = runCli(cli, sub, 'status');

    expect(r.status).toBe(0);
    expect(r.stdout).toBe('a · Plano a\n  f1  pendente  Fase f1\n\nb · Plano b\n  f1  pendente  Fase f1\n');
  });

  it('start de fase bloqueada sai com 1 e explica; plano inexistente também', () => {
    writePlan(root, 'par', planSource('par', PARALLEL));

    const blocked = runCli(cli, root, 'start', 'par/f2');
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain('par/f2 está bloqueada: aguarda f1');

    const forced = runCli(cli, root, 'start', 'par/f2', '--force');
    expect(forced.status).toBe(0);
    expect(forced.stderr).toContain('aviso: par/f2 está bloqueada');
    expect(forced.stdout).toBe('fase ativa: par/f2 · Fase f2\n');

    expect(runCli(cli, root, 'status', 'zzz').stderr).toContain('plano "zzz" não encontrado');
    expect(runCli(cli, root, 'stop').stdout).toBe('fase par/f2 desativada\n');
    expect(runCli(cli, root, 'stop').stdout).toBe('nenhuma fase ativa\n');
  });

  it('avisa quando a fase ativa já foi concluída', () => {
    writePlan(root, 'linear', planSource('linear', LINEAR));
    runCli(cli, root, 'start', 'linear/f1');
    commit(root, 'feat: f1', 'linear/f1');

    expect(runCli(cli, root, 'status').stdout).toContain('A fase ativa linear/f1 já está concluída');
  });
});
