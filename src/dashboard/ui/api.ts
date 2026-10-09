import type { Scan } from '../scan';

export type { Alert } from '../alerts';
export type { Project, Scan } from '../scan';

/** O servidor não respondeu ou respondeu com erro. */
export class ApiError extends Error {}

const TIMEOUT_MS = 30_000;

/** Varredura atual da raiz, feita pelo servidor no momento do pedido. */
export async function fetchProjects(): Promise<Scan> {
  let res: Response;
  try {
    res = await fetch('/api/projects', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new ApiError(`sem resposta do servidor: ${(err as Error).message}`);
  }
  if (!res.ok) throw new ApiError(`o servidor respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as Scan;
}
