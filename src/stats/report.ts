import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadTrack } from '../memory/reindex';
import { TRACK_DIRS } from '../memory/schema';
import { defaultProjectsDir, projectSessions, type SessionStats } from './transcripts';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Resumo de um período: medianas por sessão, compactações em média. `null` quando não há sessão que dê o número. */
export interface GroupSummary {
  label: 'todas' | 'antes' | 'depois';
  sessions: number;
  openingTokens: number | null;
  /** Mediana só entre as sessões que editaram algum arquivo. */
  toolCallsBeforeEdit: number | null;
  sessionsWithEdit: number;
  compactionsPerSession: number | null;
  /** Alguma sessão do período teve as compactações estimadas. */
  compactionsEstimated: boolean;
  /** Soma de `occurrences - 1` na trilha bug; só no período mais recente, porque é o estado atual do registro. */
  repeatedErrors: number | null;
}

export interface ReportSession extends Omit<SessionStats, 'file'> {
  /** Data local do início, `AAAA-MM-DD`; é ela que o `--split-at` compara. */
  date: string;
}

export interface StatsReport {
  project: string;
  splitAt: string | null;
  transcriptDirs: string[];
  /** Arquivos de sessão sem nenhuma resposta do modelo, fora das contas. */
  emptySessions: number;
  sessions: ReportSession[];
  groups: GroupSummary[];
  /** `null` quando o projeto ainda não tem `.dev/errors/`. */
  repeatedErrors: { total: number; entries: Array<{ slug: string; occurrences: number }> } | null;
}

export function isIsoDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Data local de um instante ISO, `AAAA-MM-DD`: uma sessão às 22h de 23/09 em Brasília é do dia 23, não do 24 em UTC. */
export function localDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Monta o relatório do projeto em `projectRoot`. Com `splitAt`, as sessões iniciadas antes dessa data (local)
 * formam o período "antes", e as do dia em diante, o "depois".
 */
export function buildReport(projectRoot: string, options: { splitAt?: string; projectsDir?: string } = {}): StatsReport {
  const { dirs, sessions, empty } = projectSessions(projectRoot, options.projectsDir ?? defaultProjectsDir());
  const rows: ReportSession[] = sessions.map(({ file: _file, ...s }) => ({ ...s, date: localDate(s.start) }));
  const repeatedErrors = readRepeatedErrors(projectRoot);
  const splitAt = options.splitAt ?? null;

  const periods: Array<[GroupSummary['label'], ReportSession[]]> = splitAt
    ? [
        ['antes', rows.filter((s) => s.date < splitAt)],
        ['depois', rows.filter((s) => s.date >= splitAt)],
      ]
    : [['todas', rows]];
  const groups = periods.map(([label, group], i) => summarize(label, group, i === periods.length - 1 ? (repeatedErrors?.total ?? null) : null));

  return { project: projectRoot, splitAt, transcriptDirs: dirs, emptySessions: empty, sessions: rows, groups, repeatedErrors };
}

function summarize(label: GroupSummary['label'], sessions: ReportSession[], repeatedErrors: number | null): GroupSummary {
  const edited = sessions.map((s) => s.toolCallsBeforeEdit).filter((n): n is number => n !== null);
  const compactions = sessions.reduce((sum, s) => sum + s.compactions, 0);
  return {
    label,
    sessions: sessions.length,
    openingTokens: median(sessions.map((s) => s.openingTokens)),
    toolCallsBeforeEdit: median(edited),
    sessionsWithEdit: edited.length,
    compactionsPerSession: sessions.length ? compactions / sessions.length : null,
    compactionsEstimated: sessions.some((s) => s.compactionsEstimated),
    repeatedErrors,
  };
}

/** Erros registrados que voltaram: soma de `occurrences - 1` na trilha bug. */
function readRepeatedErrors(projectRoot: string): StatsReport['repeatedErrors'] {
  if (!existsSync(join(projectRoot, TRACK_DIRS.bug))) return null;
  const entries = loadTrack(projectRoot, 'bug')
    .entries.map((e) => ({ slug: e.slug, occurrences: e.frontmatter.occurrences }))
    .filter((e): e is { slug: string; occurrences: number } => Number.isInteger(e.occurrences) && (e.occurrences as number) > 1);
  return { total: entries.reduce((sum, e) => sum + e.occurrences - 1, 0), entries };
}

/** Número no formato brasileiro: `38.412`, `0,4`. */
export function formatNumber(value: number, decimals = 0): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return '<1min';
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

/** Tabela por sessão e, no fim, o resumo por período. */
export function formatReport(report: StatsReport): string {
  const out: string[] = [];
  const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;
  const ignored = report.emptySessions ? ` (${plural(report.emptySessions, 'sem resposta do modelo, ignorada', 'sem resposta do modelo, ignoradas')})` : '';
  out.push(`${plural(report.sessions.length, 'sessão', 'sessões')} de ${report.project}${ignored}`);
  out.push(...report.transcriptDirs.map((dir) => `  históricos: ${dir}`));
  if (!report.sessions.length) return out.join('\n');

  const header = ['data', 'sessão', 'duração', 'abertura', 'até editar', 'tool calls', 'compactações'];
  const right = [false, false, true, true, true, true, true];
  const rows = report.sessions.map((s) => [
    s.date,
    s.id.slice(0, 8),
    formatDuration(s.durationMs),
    formatNumber(s.openingTokens),
    s.toolCallsBeforeEdit === null ? '-' : formatNumber(s.toolCallsBeforeEdit),
    formatNumber(s.toolCalls),
    `${s.compactionsEstimated ? '~' : ''}${s.compactions}`,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => (right[i] ? c.padStart(widths[i]!) : c.padEnd(widths[i]!))).join('  ').trimEnd();
  out.push('', line(header));
  const splitIndex = report.splitAt ? report.sessions.findIndex((s) => s.date >= report.splitAt!) : -1;
  rows.forEach((row, i) => {
    if (i === splitIndex) out.push(`-- a partir de ${report.splitAt} --`);
    out.push(line(row));
  });

  out.push('', ...formatSummary(report.groups));
  out.push('', 'tokens e tool calls: mediana por sessão · compactações: média por sessão · ~ estimado pela queda de contexto');
  if (report.repeatedErrors?.entries.length) {
    out.push(`erros que voltaram: ${report.repeatedErrors.entries.map((e) => `${e.slug} (${e.occurrences}x)`).join(', ')}`);
  }
  return out.join('\n');
}

function formatSummary(groups: GroupSummary[]): string[] {
  const dash = (v: number | null, decimals = 0) => (v === null ? '-' : formatNumber(v, decimals));
  const table = [
    ['', ...groups.map((g) => `${g.label} (${g.sessions} ${g.sessions === 1 ? 'sessão' : 'sessões'})`)],
    ['tokens na abertura', ...groups.map((g) => dash(g.openingTokens === null ? null : Math.round(g.openingTokens)))],
    ['tool calls até editar', ...groups.map((g) => dash(g.toolCallsBeforeEdit, Number.isInteger(g.toolCallsBeforeEdit ?? 0) ? 0 : 1))],
    ['compactações/sessão', ...groups.map((g) => `${dash(g.compactionsPerSession, 1)}${g.compactionsEstimated && g.sessions ? ' (estimado)' : ''}`)],
    ['erros repetidos', ...groups.map((g) => dash(g.repeatedErrors))],
  ];
  const widths = table[0]!.map((_, i) => Math.max(...table.map((r) => r[i]!.length)));
  return table.map((row) => row.map((c, i) => c.padEnd(widths[i]! + (i < row.length - 1 ? 3 : 0))).join('').trimEnd());
}
