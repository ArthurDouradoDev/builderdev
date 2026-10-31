import { closeSync, existsSync, fstatSync, openSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { readPlanSteps } from '../git/log';
import { METRICS_FILE } from '../hooks/common';
import { listEntryFiles, readEntry, TRACK_DIRS } from '../memory/schema';
import { listPlans } from '../plan/find';
import { lintPlanFile } from '../plan/lint';
import { planStatus, type PhaseStatus, type PlanStatus } from '../plan/status';
import { readState } from '../state';

/** Quanto do fim do `metrics.jsonl` é lido para achar o último `verify`. */
export const METRICS_TAIL_BYTES = 64 * 1024;

export interface PhaseSummary {
  id: string;
  title: string;
  status: PhaseStatus;
  blockedBy: string[];
}

export interface PlanSummary {
  id: string;
  title: string;
  /** `created` do frontmatter (AAAA-MM-DD), ou `null` quando ausente. */
  created: string | null;
  phases: PhaseSummary[];
  done: number;
  total: number;
  counts: Record<PhaseStatus, number>;
  /** Problemas de severidade `erro` no `builderdev lint` deste plano. */
  lintErrors: number;
  /** Mensagem quando o plano não pôde ser lido; `phases` fica vazio. */
  error: string | null;
}

export interface ActivePhase {
  plan: string;
  phase: string;
  /** Vazio quando o plano ou a fase não existem mais. */
  title: string;
  startedAt: string;
  /**
   * Status calculado pelo `planStatus`; `null` quando o estado aponta para plano ou fase que não existe.
   * `concluida` quer dizer estado desatualizado: a fase já tem commit.
   */
  status: PhaseStatus | null;
  /** Dependências pendentes; não vazio só quando a fase foi ativada com `start --force`. */
  blockedBy: string[];
}

export type VerifyResult = 'aprovado' | 'falhou' | 'sem-mudanca';

export interface VerifyRecord {
  /** `sem-mudanca`: os arquivos não mudaram desde a última aprovação, então ela continua valendo. */
  result: VerifyResult;
  at: string;
  /** Comando que falhou. */
  command: string | null;
  durationMs: number | null;
  /** Log relativo à raiz do projeto. */
  log: string | null;
}

export interface MemoryCounts {
  /** Entradas em `.dev/memory`. */
  knowledge: number;
  /** Entradas em `.dev/errors`. */
  bugs: number;
  /** Entradas de bug com `occurrences > 1`. */
  repeated: number;
}

export interface BuilderdevInfo {
  /** Em ordem de nome de arquivo, como o `builderdev status`. */
  plans: PlanSummary[];
  /** `id` do plano em andamento (ver `pickCurrentPlan`); `null` sem plano com fases. */
  currentPlan: string | null;
  active: ActivePhase | null;
  /** Sem fase ativa: a primeira fase liberada (pendente) do plano atual. */
  next: { plan: string; phase: string; title: string } | null;
  /** Último `verify` da fase ativa; `null` sem fase ativa ou sem registro. */
  lastVerify: VerifyRecord | null;
  memory: MemoryCounts;
}

/**
 * Dados do BuilderDev de `dir` (raiz do projeto, com `.dev/plans`), lidos dos arquivos e do git no momento.
 * Plano ilegível vira um item com `error`; lança só quando o próprio git falha (o card já mostra o erro dele).
 */
export function builderdevInfo(dir: string): BuilderdevInfo {
  const steps = readPlanSteps(dir);
  const state = readState(dir);

  const plans = listPlans(dir).map((entry): PlanSummary => {
    const lintErrors = countLintErrors(join(dir, entry.path));
    const created = createdOf(entry.plan?.frontmatter.created);
    let status: Pick<PlanStatus, 'title' | 'phases' | 'error'>;
    try {
      status = planStatus(entry, steps, state);
    } catch (err) {
      status = { title: '', phases: [], error: (err as Error).message };
    }
    const phases = status.phases.map((p) => ({ id: p.id, title: p.title, status: p.status, blockedBy: p.blockedBy }));
    const counts: Record<PhaseStatus, number> = { concluida: 0, ativa: 0, bloqueada: 0, pendente: 0 };
    for (const p of phases) counts[p.status]++;
    return {
      id: entry.id,
      title: status.title,
      created,
      phases,
      done: counts.concluida,
      total: phases.length,
      counts,
      lintErrors,
      error: status.error ?? null,
    };
  });

  const active = state ? activePhase(state, plans) : null;
  const currentPlan = pickCurrentPlan(plans, active);
  const current = plans.find((p) => p.id === currentPlan);
  const nextPhase = !active && current ? current.phases.find((p) => p.status === 'pendente') : undefined;

  return {
    plans,
    currentPlan,
    active,
    next: nextPhase && current ? { plan: current.id, phase: nextPhase.id, title: nextPhase.title } : null,
    lastVerify: active ? lastVerify(dir, `${active.plan}/${active.phase}`) : null,
    memory: memoryCounts(dir),
  };
}

/**
 * Plano em andamento: o da fase ativa; sem ela, o mais recente (por `created`) com fase não concluída;
 * se todos estiverem concluídos, o mais recente deles. Planos ilegíveis ou sem fases ficam de fora.
 * No empate de `created`, vale o último na ordem de arquivo.
 */
export function pickCurrentPlan(plans: PlanSummary[], active: Pick<ActivePhase, 'plan' | 'status'> | null): string | null {
  if (active && active.status !== null) return active.plan;
  const usable = plans.filter((p) => !p.error && p.total > 0);
  const newest = (list: PlanSummary[]) =>
    list.reduce<PlanSummary | null>((best, p) => (best && (best.created ?? '') > (p.created ?? '') ? best : p), null);
  return (newest(usable.filter((p) => p.done < p.total)) ?? newest(usable))?.id ?? null;
}

function activePhase(state: { plan: string; phase: string; startedAt: string }, plans: PlanSummary[]): ActivePhase {
  const phase = plans.find((p) => p.id === state.plan)?.phases.find((p) => p.id === state.phase);
  return {
    plan: state.plan,
    phase: state.phase,
    title: phase?.title ?? '',
    startedAt: state.startedAt,
    status: phase?.status ?? null,
    blockedBy: phase && phase.status !== 'concluida' ? phase.blockedBy : [],
  };
}

function countLintErrors(file: string): number {
  try {
    return lintPlanFile(file).filter((p) => p.severity === 'erro').length;
  } catch {
    return 1;
  }
}

/** O `yaml` deixa datas como texto, mas aceita também `Date` e corta para AAAA-MM-DD. */
function createdOf(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

/** Último registro `evento: verify` de `ref` (`plano/fase`), lendo só o fim do arquivo. Linhas quebradas são ignoradas. */
export function lastVerify(dir: string, ref: string): VerifyRecord | null {
  const lines = tailLines(join(dir, METRICS_FILE), METRICS_TAIL_BYTES);
  for (let i = lines.length - 1; i >= 0; i--) {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(lines[i]!) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (!record || typeof record !== 'object' || record.evento !== 'verify' || record.fase !== ref) continue;
    const result = record.resultado;
    if (result !== 'aprovado' && result !== 'falhou' && result !== 'sem-mudanca') continue;
    return {
      result,
      at: typeof record.ts === 'string' ? record.ts : '',
      command: typeof record.comando === 'string' ? record.comando : null,
      durationMs: typeof record.duracao_ms === 'number' ? record.duracao_ms : null,
      log: typeof record.log === 'string' ? record.log : null,
    };
  }
  return null;
}

/** Linhas não vazias dos últimos `bytes` de `file`; a primeira é descartada se o corte caiu no meio dela. */
function tailLines(file: string, bytes: number): string[] {
  if (!existsSync(file)) return [];
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buffer = Buffer.alloc(size - start);
    const read = readSync(fd, buffer, 0, buffer.length, start);
    const lines = buffer.subarray(0, read).toString('utf8').split(/\r?\n/);
    if (start > 0) lines.shift();
    return lines.filter((l) => l.trim() !== '');
  } catch {
    return [];
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function memoryCounts(dir: string): MemoryCounts {
  const bugFiles = listEntryFiles(join(dir, TRACK_DIRS.bug));
  let repeated = 0;
  for (const file of bugFiles) {
    try {
      const occurrences = readEntry(file).frontmatter.occurrences;
      if (typeof occurrences === 'number' && occurrences > 1) repeated++;
    } catch {
      // Entrada malformada é assunto do `builderdev memory lint`; aqui só não conta como repetida.
    }
  }
  return { knowledge: listEntryFiles(join(dir, TRACK_DIRS.conhecimento)).length, bugs: bugFiles.length, repeated };
}
