import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildReport, formatDuration, formatNumber, formatReport, isIsoDate, median } from '../../src/stats/report';
import { projectSlug } from '../../src/stats/transcripts';
import { buildCli, type BuiltCli } from '../helpers/cli';

const FIXTURES = fileURLToPath(new URL('../fixtures/transcripts/', import.meta.url));
const ERRORS = fileURLToPath(new URL('../fixtures/memory/projeto/.dev/errors/', import.meta.url));

let cliDir: string;
let cli: BuiltCli;
let tmp: string;
let project: string;
let configDir: string;
let projectsDir: string;

beforeAll(() => {
  cliDir = mkdtempSync(join(tmpdir(), 'betterdev-cli-'));
  cli = buildCli(cliDir);
});

afterAll(() => {
  rmSync(cliDir, { recursive: true, force: true });
});

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'betterdev-report-'));
  project = join(tmp, 'projeto');
  configDir = join(tmp, 'claude');
  projectsDir = join(configDir, 'projects');
  mkdirSync(project);
  cpSync(FIXTURES, join(projectsDir, projectSlug(project)), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

/** `betterdev stats` com os históricos em `$CLAUDE_CONFIG_DIR/projects`. */
function stats(...args: string[]) {
  const r = spawnSync(process.execPath, [cli.script, 'stats', ...args], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('median e formatação', () => {
  it('mediana de quantidade ímpar, par e vazia', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('números no formato brasileiro e durações curtas', () => {
    expect(formatNumber(38412)).toBe('38.412');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(0.4, 1)).toBe('0,4');
    expect(formatNumber(999)).toBe('999');
    expect(formatDuration(42 * 60_000)).toBe('42min');
    expect(formatDuration(65 * 60_000)).toBe('1h05');
    expect(formatDuration(10_000)).toBe('<1min');
  });

  it('valida a data do --split-at', () => {
    expect(isIsoDate('2026-09-24')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('24/09/2026')).toBe(false);
  });
});

describe('buildReport', () => {
  it('sem data de corte, um período com todas as sessões', () => {
    const report = buildReport(project, { projectsDir });
    expect(report.emptySessions).toBe(1);
    expect(report.groups).toEqual([
      {
        label: 'todas',
        sessions: 4,
        openingTokens: (30_000 + 38_412) / 2,
        toolCallsBeforeEdit: 1,
        sessionsWithEdit: 3,
        compactionsPerSession: 0.5,
        compactionsEstimated: true,
        repeatedErrors: null,
      },
    ]);
  });

  it('divide as medianas pela data de corte', () => {
    const report = buildReport(project, { projectsDir, splitAt: '2026-09-24' });
    expect(report.sessions.map((s) => s.date)).toEqual(['2026-09-10', '2026-09-12', '2026-09-25', '2026-09-28']);
    expect(report.groups).toMatchObject([
      { label: 'antes', sessions: 2, openingTokens: 34_206, toolCallsBeforeEdit: 2, sessionsWithEdit: 2, compactionsPerSession: 0 },
      { label: 'depois', sessions: 2, openingTokens: 26_590, toolCallsBeforeEdit: 0, sessionsWithEdit: 1, compactionsPerSession: 1 },
    ]);
  });

  it('a sessão do dia do corte entra no depois', () => {
    const report = buildReport(project, { projectsDir, splitAt: '2026-09-12' });
    expect(report.groups.map((g) => g.sessions)).toEqual([1, 3]);
  });

  it('soma occurrences - 1 dos erros registrados, só no período mais recente', () => {
    cpSync(ERRORS, join(project, '.dev/errors'), { recursive: true });
    const report = buildReport(project, { projectsDir, splitAt: '2026-09-24' });
    expect(report.repeatedErrors).toEqual({ total: 1, entries: [{ slug: 'viewshed-crs-metrico', occurrences: 2 }] });
    expect(report.groups.map((g) => g.repeatedErrors)).toEqual([null, 1]);
  });

  it('o texto traz a tabela por sessão e o resumo por período', () => {
    cpSync(ERRORS, join(project, '.dev/errors'), { recursive: true });
    const text = formatReport(buildReport(project, { projectsDir, splitAt: '2026-09-24' }));
    const lines = text.split('\n');

    expect(lines[0]).toBe(`4 sessões de ${project} (1 sem resposta do modelo, ignorada)`);
    expect(text).toMatch(/^data +sessão +duração +abertura +até editar +tool calls +compactações$/m);
    expect(text).toMatch(/^2026-09-10 +sessao-b +42min +38\.412 +3 +5 +~0$/m);
    expect(text).toMatch(/^2026-09-25 .* - .* ~0$/m);
    expect(lines.indexOf('-- a partir de 2026-09-24 --')).toBe(lines.findIndex((l) => l.startsWith('2026-09-25')) - 1);
    expect(text).toMatch(/^ +antes \(2 sessões\) +depois \(2 sessões\)$/m);
    expect(text).toMatch(/^tokens na abertura +34\.206 +26\.590$/m);
    expect(text).toMatch(/^tool calls até editar +2 +0$/m);
    expect(text).toMatch(/^compactações\/sessão +0,0 \(estimado\) +1,0 \(estimado\)$/m);
    expect(text).toMatch(/^erros repetidos +- +1$/m);
    expect(text).toContain('erros que voltaram: viewshed-crs-metrico (2x)');
  });
});

describe('betterdev stats', { timeout: 30_000 }, () => {
  it('--json é estável entre execuções', () => {
    const first = stats('--split-at', '2026-09-24', '--json');
    const second = stats('--split-at', '2026-09-24', '--json');

    expect(first.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout) as { splitAt: string; sessions: Array<Record<string, unknown>>; groups: unknown[] };
    expect(report.splitAt).toBe('2026-09-24');
    expect(report.groups).toHaveLength(2);
    expect(Object.keys(report.sessions[0]!)).toEqual([
      'id',
      'start',
      'end',
      'durationMs',
      'openingTokens',
      'toolCallsBeforeEdit',
      'toolCalls',
      'compactions',
      'compactionsEstimated',
      'date',
    ]);
  });

  it('--project aponta para outra pasta', () => {
    const r = spawnSync(process.execPath, [cli.script, 'stats', '--project', project], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^ +todas \(4 sessões\)$/m);
  });

  it('data de corte inválida é erro de uso', () => {
    expect(stats('--split-at', '24/09/2026')).toMatchObject({ status: 2 });
  });

  it('projeto sem históricos sai com 1 e diz onde procurou', () => {
    rmSync(projectsDir, { recursive: true, force: true });
    const r = stats();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('nenhum histórico do Claude Code');
  });
});
