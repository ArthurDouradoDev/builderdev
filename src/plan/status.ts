import { planPhases, type PlanEntry } from './find';
import type { ActiveState } from '../state';

/** Valores estáveis, sem acento, para o JSON; `STATUS_LABEL` tem a forma exibida. */
export type PhaseStatus = 'concluida' | 'ativa' | 'bloqueada' | 'pendente';

export const STATUS_LABEL: Record<PhaseStatus, string> = {
  concluida: 'concluída',
  ativa: 'ativa',
  bloqueada: 'bloqueada',
  pendente: 'pendente',
};

export interface PhaseState {
  id: string;
  title: string;
  status: PhaseStatus;
  /** `needs` como declarado no YAML; `null` quando ausente. */
  needs: string[] | null;
  /** Dependências efetivas: `needs`, ou a fase anterior quando `needs` está ausente. */
  dependsOn: string[];
  /** Dependências ainda não concluídas. */
  blockedBy: string[];
  /** Commits com o trailer da fase, do mais recente ao mais antigo. */
  commits: string[];
}

export interface PlanStatus {
  id: string;
  title: string;
  path: string;
  phases: PhaseState[];
  /** Presente quando o plano não pôde ser lido; `phases` fica vazio. */
  error?: string;
}

/**
 * Status de cada fase. Precedência: concluída (tem commit) > ativa (estado local) > bloqueada > pendente.
 * A ativa vem antes da bloqueada porque só chega lá com `start --force`; `blockedBy` continua preenchido.
 */
export function planStatus(entry: PlanEntry, steps: Map<string, string[]>, active: ActiveState | null): PlanStatus {
  const title = typeof entry.plan?.frontmatter.title === 'string' ? entry.plan.frontmatter.title.trim() : '';
  if (!entry.plan) return { id: entry.id, title, path: entry.path, phases: [], error: entry.error };

  const phases = planPhases(entry.plan);
  const commitsOf = (phaseId: string) => steps.get(`${entry.id}/${phaseId}`) ?? [];
  return {
    id: entry.id,
    title,
    path: entry.path,
    phases: phases.map((phase, index): PhaseState => {
      const declared = phase.yaml.data.needs;
      const needs = Array.isArray(declared) ? declared.filter((n): n is string => typeof n === 'string') : null;
      const previous = phases[index - 1];
      const dependsOn = needs ?? (previous ? [previous.id] : []);
      const blockedBy = dependsOn.filter((dep) => commitsOf(dep).length === 0);
      const commits = commitsOf(phase.id);
      const isActive = active?.plan === entry.id && active.phase === phase.id;
      const status: PhaseStatus = commits.length
        ? 'concluida'
        : isActive
          ? 'ativa'
          : blockedBy.length
            ? 'bloqueada'
            : 'pendente';
      return { id: phase.id, title: phase.title, status, needs, dependsOn, blockedBy, commits };
    }),
  };
}

/** Tabela de um plano, no formato do `betterdev status`. */
export function formatPlanStatus(status: PlanStatus): string {
  const header = status.title ? `${status.id} · ${status.title}` : status.id;
  if (status.error) return `${header}\n  erro: ${status.error}`;
  if (!status.phases.length) return `${header}\n  (nenhuma fase no YAML)`;

  const idWidth = Math.max(...status.phases.map((p) => p.id.length));
  const statusWidth = Math.max(...status.phases.map((p) => STATUS_LABEL[p.status].length));
  const titleWidth = Math.max(...status.phases.map((p) => p.title.length));
  const rows = status.phases.map((p) => {
    const detail = phaseDetail(p);
    const cells = [p.id.padEnd(idWidth), STATUS_LABEL[p.status].padEnd(statusWidth), detail ? p.title.padEnd(titleWidth) : p.title];
    if (detail) cells.push(detail);
    return `  ${cells.join('  ')}`;
  });
  return [header, ...rows].join('\n');
}

function phaseDetail(p: PhaseState): string {
  if (p.commits.length) {
    const more = p.commits.length > 1 ? ` +${p.commits.length - 1}` : '';
    return `${p.commits[0]!.slice(0, 7)}${more}`;
  }
  return p.blockedBy.length ? `aguarda ${p.blockedBy.join(', ')}` : '';
}
