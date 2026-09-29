import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readPlanSteps } from './git/log';
import { ProjectError, findPhase, findPlan, parsePhaseRef } from './plan/find';
import { planStatus } from './plan/status';

/** Fase ativa deste clone. Fica em `.dev/.local/`, fora do git: cada dev tem a sua. */
export interface ActiveState {
  plan: string;
  phase: string;
  startedAt: string;
}

export const STATE_FILE = '.dev/.local/state.json';

/** Estado gravado, ou `null` quando não há fase ativa ou o arquivo não é um estado válido. */
export function readState(root: string): ActiveState | null {
  const file = join(root, STATE_FILE);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as Partial<ActiveState>;
    if (typeof data.plan !== 'string' || typeof data.phase !== 'string') return null;
    return { plan: data.plan, phase: data.phase, startedAt: typeof data.startedAt === 'string' ? data.startedAt : '' };
  } catch {
    return null;
  }
}

export function writeState(root: string, state: ActiveState): void {
  const file = join(root, STATE_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
}

/** Apaga o estado. Devolve o que estava gravado. */
export function clearState(root: string): ActiveState | null {
  const previous = readState(root);
  rmSync(join(root, STATE_FILE), { force: true });
  return previous;
}

export interface StartResult {
  state: ActiveState;
  title: string;
  previous: ActiveState | null;
  warnings: string[];
}

/**
 * `betterdev start <plano>/<fase>`: valida que a fase existe e grava o estado.
 * Fase bloqueada só é ativada com `force`; fase já concluída é ativada com aviso.
 */
export function startPhase(root: string, ref: string, { force = false, now = new Date() } = {}): StartResult {
  const { plan: planId, phase: phaseId } = parsePhaseRef(ref);
  const entry = findPlan(root, planId);
  const phase = findPhase(entry, phaseId);

  const status = planStatus(entry, readPlanSteps(root), null).phases.find((p) => p.id === phase.id)!;
  const warnings: string[] = [];
  if (status.status === 'concluida') {
    warnings.push(`${ref} já está concluída (${status.commits[0]!.slice(0, 7)}); os próximos commits também recebem o trailer`);
  } else if (status.blockedBy.length) {
    const reason = `${ref} está bloqueada: aguarda ${status.blockedBy.join(', ')}`;
    if (!force) throw new ProjectError(`${reason} (use --force para ativar mesmo assim)`);
    warnings.push(reason);
  }

  const previous = readState(root);
  const state: ActiveState = { plan: entry.id, phase: phase.id, startedAt: now.toISOString() };
  writeState(root, state);
  return { state, title: phase.title, previous, warnings };
}
