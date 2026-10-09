import type { Project } from './scan';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Mudança sem commit mais antiga que isto vira alerta. */
export const STALE_CHANGES_MS = 2 * DAY_MS;
/** Projeto sem atividade há mais que isto conta como parado. */
export const IDLE_MS = 30 * DAY_MS;

export type AlertCode = 'mudancas-paradas' | 'atras-do-remoto' | 'sem-push' | 'parado' | 'sem-git';

export interface Alert {
  code: AlertCode;
  severity: 'atencao' | 'info';
  message: string;
}

/** Alertas de `project` no instante `now`, os de atenção primeiro. */
export function alertsFor(project: Pick<Project, 'kind' | 'git' | 'lastActivity'>, now: Date): Alert[] {
  const alerts: Alert[] = [];
  const age = (iso: string | null) => (iso === null ? null : now.getTime() - Date.parse(iso));
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (project.kind === 'sem-git') {
    alerts.push({ code: 'sem-git', severity: 'info', message: 'pasta sem git' });
  }

  const git = project.git;
  if (git) {
    const oldest = age(git.changes.oldestMtime);
    if (oldest !== null && oldest > STALE_CHANGES_MS) {
      alerts.push({ code: 'mudancas-paradas', severity: 'atencao', message: `mudanças sem commit há ${formatAge(oldest)}` });
    }
    if (git.behind !== null && git.behind > 0) {
      alerts.push({ code: 'atras-do-remoto', severity: 'atencao', message: `${plural(git.behind, 'commit', 'commits')} atrás do remoto` });
    }
    if (git.ahead !== null && git.ahead > 0) {
      alerts.push({ code: 'sem-push', severity: 'info', message: `${plural(git.ahead, 'commit', 'commits')} sem push` });
    }
  }

  const idle = age(project.lastActivity);
  if (idle !== null && idle > IDLE_MS) {
    alerts.push({ code: 'parado', severity: 'info', message: `sem atividade há ${formatAge(idle)}` });
  }

  return alerts.sort((a, b) => Number(b.severity === 'atencao') - Number(a.severity === 'atencao'));
}

/** Duração em texto curto: "5 min", "3 h", "2 dias", "4 meses". */
export function formatAge(ms: number): string {
  if (ms < 60 * MINUTE_MS) return `${Math.max(1, Math.floor(ms / MINUTE_MS))} min`;
  if (ms < DAY_MS) return `${Math.floor(ms / (60 * MINUTE_MS))} h`;
  const days = Math.floor(ms / DAY_MS);
  if (days < 60) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} meses`;
  return `${Math.floor(days / 365)} anos`;
}
