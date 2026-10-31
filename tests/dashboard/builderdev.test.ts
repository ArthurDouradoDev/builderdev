import { appendFileSync, cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { METRICS_TAIL_BYTES, builderdevInfo, lastVerify } from '../../src/dashboard/builderdev';
import { clearState, writeState } from '../../src/state';
import { commit, git, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

const FIXTURE = fileURLToPath(new URL('../fixtures/dashboard/projeto', import.meta.url));
const METRICS = '.dev/.local/metrics.jsonl';

// Cópia da fixture com commits reais: importacao concluída (f1, f2) e relatorios com a f1 concluída.
// O repositório é montado uma vez; cada teste trabalha numa cópia dele (commits no Windows são lentos).
let template: string;
let dir: string;

beforeAll(() => {
  template = mkdtempSync(join(tmpdir(), 'builderdev bd modelo '));
  cpSync(FIXTURE, template, { recursive: true });
  git(template, 'init', '-q', '-b', 'main');
  git(template, 'add', '.dev/plans', '.dev/memory', '.dev/errors');
  git(template, 'commit', '-q', '-m', 'docs: planos');
  commit(template, 'feat: leitura do CSV', 'importacao/f1');
  commit(template, 'feat: validação das linhas importadas', 'importacao/f2');
  commit(template, 'feat: coleta dos dados do relatório', 'relatorios/f1');
}, 60_000);

afterAll(() => {
  removeRepo(template);
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'builderdev bd '));
  cpSync(template, dir, { recursive: true });
});

afterEach(() => {
  removeRepo(dir);
});

describe('builderdevInfo', { timeout: 30_000 }, () => {
  it('resume cada plano com fases, contagem por status e lint', () => {
    const info = builderdevInfo(dir);
    expect(info.plans.map((p) => p.id)).toEqual(['importacao', 'relatorios']);

    const [importacao, relatorios] = info.plans;
    expect(importacao).toMatchObject({
      title: 'Importação de planilhas',
      created: '2026-09-15',
      done: 2,
      total: 2,
      counts: { concluida: 2, ativa: 0, bloqueada: 0, pendente: 0 },
      lintErrors: 0,
      error: null,
    });
    expect(relatorios).toMatchObject({
      title: 'Relatórios mensais',
      created: '2026-09-01',
      done: 1,
      total: 4,
      counts: { concluida: 1, ativa: 1, bloqueada: 1, pendente: 1 },
      lintErrors: 0,
    });
    expect(relatorios!.phases.map((p) => [p.id, p.status])).toEqual([
      ['f1', 'concluida'],
      ['f2', 'ativa'],
      ['f3', 'bloqueada'],
      ['f4', 'pendente'],
    ]);
    expect(relatorios!.phases[2]!.blockedBy).toEqual(['f2']);
  });

  it('currentPlan: o plano da fase ativa', () => {
    const info = builderdevInfo(dir);
    expect(info.currentPlan).toBe('relatorios');
    expect(info.active).toEqual({
      plan: 'relatorios',
      phase: 'f2',
      title: 'Geração do PDF',
      startedAt: '2026-10-08T09:00:00.000Z',
      status: 'ativa',
      blockedBy: [],
    });
    expect(info.next).toBeNull();
  });

  it('currentPlan: sem fase ativa, o mais recente com fase não concluída, mesmo que outro seja mais novo', () => {
    clearState(dir);
    const info = builderdevInfo(dir);
    // importacao é mais nova (2026-09-15), mas está concluída.
    expect(info.currentPlan).toBe('relatorios');
    expect(info.active).toBeNull();
    expect(info.lastVerify).toBeNull();
    expect(info.next).toEqual({ plan: 'relatorios', phase: 'f2', title: 'Geração do PDF' });
  });

  it('currentPlan: com todos concluídos, o último concluído', () => {
    clearState(dir);
    for (const phase of ['f2', 'f3', 'f4']) commit(dir, `feat: ${phase}`, `relatorios/${phase}`);
    const info = builderdevInfo(dir);
    expect(info.currentPlan).toBe('importacao');
    expect(info.next).toBeNull();
  });

  it('estado apontando para plano inexistente cai na regra sem fase ativa', () => {
    writeState(dir, { plan: 'sumiu', phase: 'f1', startedAt: '2026-10-08T09:00:00.000Z' });
    const info = builderdevInfo(dir);
    expect(info.active).toMatchObject({ plan: 'sumiu', phase: 'f1', title: '', status: null });
    expect(info.currentPlan).toBe('relatorios');
  });

  it('fase ativa bloqueada (start --force) e fase ativa já concluída', () => {
    writeState(dir, { plan: 'relatorios', phase: 'f3', startedAt: '' });
    expect(builderdevInfo(dir).active).toMatchObject({ status: 'ativa', blockedBy: ['f2'] });

    writeState(dir, { plan: 'importacao', phase: 'f1', startedAt: '' });
    const info = builderdevInfo(dir);
    expect(info.active).toMatchObject({ status: 'concluida', blockedBy: [] });
    expect(info.currentPlan).toBe('importacao');
  });

  it('lastVerify: o registro mais recente da fase ativa, ignorando outras fases e linhas quebradas', () => {
    const info = builderdevInfo(dir);
    // Depois do aprovado das 11h há uma linha quebrada da f2 e um falhou da importacao/f2.
    expect(info.lastVerify).toEqual({
      result: 'aprovado',
      at: '2026-10-08T11:00:00.000Z',
      command: null,
      durationMs: 3900,
      log: '.dev/.local/verify/2026-10-08T11-00-00.log',
    });
    expect(lastVerify(dir, 'importacao/f2')).toMatchObject({ result: 'falhou', command: 'npm test -- validacao' });
    expect(lastVerify(dir, 'relatorios/f9')).toBeNull();
  });

  it('lastVerify: lê só o fim do arquivo e descarta a linha cortada', () => {
    const old = JSON.stringify({ evento: 'verify', fase: 'relatorios/f2', resultado: 'falhou', ts: '2026-10-09T00:00:00.000Z' });
    const filler = `${JSON.stringify({ evento: 'compact', trigger: 'auto', pad: 'x'.repeat(200) })}\n`;
    // O registro antigo fica antes da janela lida; depois dele, só preenchimento.
    writeFileSync(join(dir, METRICS), `${old}\n${filler.repeat(Math.ceil((METRICS_TAIL_BYTES * 2) / filler.length))}`);
    expect(lastVerify(dir, 'relatorios/f2')).toBeNull();

    appendFileSync(join(dir, METRICS), `${old}\n`);
    expect(lastVerify(dir, 'relatorios/f2')).toMatchObject({ result: 'falhou', at: '2026-10-09T00:00:00.000Z' });
  });

  it('metrics.jsonl ausente ou só com lixo não lança erro', () => {
    rmSync(join(dir, METRICS));
    expect(builderdevInfo(dir).lastVerify).toBeNull();
    writeFileSync(join(dir, METRICS), '{quebrado\n\n[1,2]\nnull\n"texto"\n');
    expect(builderdevInfo(dir).lastVerify).toBeNull();
  });

  it('plano inválido vira error com a contagem do lint, sem derrubar os outros', () => {
    writePlan(dir, 'quebrado', '---\nid: [quebrado\n---\n# Quebrado\n');
    writePlan(dir, 'incompleto', '---\nid: incompleto\ntitle: Incompleto\nphases:\n  - id: f1\n    title: Única\n---\n\n# Incompleto\n');
    const info = builderdevInfo(dir);
    const byId = Object.fromEntries(info.plans.map((p) => [p.id, p]));

    expect(byId.quebrado).toMatchObject({ error: expect.stringMatching(/frontmatter inválido/), lintErrors: 1, total: 0, phases: [] });
    // Lido, mas fora do formato: tem status e a contagem do lint.
    expect(byId.incompleto!.error).toBeNull();
    expect(byId.incompleto!.total).toBe(1);
    expect(byId.incompleto!.lintErrors).toBeGreaterThan(1);
    expect(byId.relatorios!.error).toBeNull();
    expect(info.currentPlan).toBe('relatorios');
  });

  it('conta as entradas de memória e de erro, e os erros repetidos', () => {
    expect(builderdevInfo(dir).memory).toEqual({ knowledge: 2, bugs: 2, repeated: 1 });
    writeFileSync(join(dir, '.dev/errors/sem-frontmatter.md'), '# sem frontmatter\n');
    expect(builderdevInfo(dir).memory).toEqual({ knowledge: 2, bugs: 3, repeated: 1 });
  });
});
