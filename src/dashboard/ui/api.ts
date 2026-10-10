import type { PlanView } from '../plan-view';
import type { Scan } from '../scan';
import type { ProjectPage } from '../server';

export type { Alert } from '../alerts';
export type { BuilderdevInfo, PlanSummary, VerifyRecord } from '../builderdev';
export type { CommitRef, OrphanPhase, PhaseView, PlanView } from '../plan-view';
export type { PhaseStatus } from '../../plan/status';
export type { Project, Scan } from '../scan';
export type { ProjectPage } from '../server';

/** O servidor não respondeu ou respondeu com erro. `status` é 0 quando não houve resposta. */
export class ApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

const TIMEOUT_MS = 30_000;

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new ApiError(`sem resposta do servidor: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text.slice(0, 200);
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? message;
    } catch {
      // resposta sem JSON: fica o texto
    }
    throw new ApiError(message || `o servidor respondeu ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** Varredura atual da raiz, feita pelo servidor no momento do pedido. */
export function fetchProjects(): Promise<Scan> {
  return getJson<Scan>('/api/projects');
}

/** Card do projeto e os planos dele, do mais recente ao mais antigo. */
export function fetchProject(name: string): Promise<ProjectPage> {
  return getJson<ProjectPage>(`/api/projects/${encodeURIComponent(name)}`);
}

export function fetchPlan(name: string, plan: string): Promise<PlanView> {
  return getJson<PlanView>(`/api/projects/${encodeURIComponent(name)}/plans/${encodeURIComponent(plan)}`);
}
