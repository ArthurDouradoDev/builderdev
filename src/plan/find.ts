import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { PlanParseError, readPlan, type Plan, type YamlPhase } from './parse';

/** Erro esperado de uso do projeto (plano ou fase inexistente, fase bloqueada...). O CLI mostra a mensagem e sai com 1. */
export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectError';
  }
}

export const PLANS_DIR = '.dev/plans';

/** Primeira pasta, de `start` para cima, que contém `.dev/`. Sem nenhuma, devolve `start`. */
export function findProjectRoot(start = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (isDir(join(dir, '.dev'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

export interface PlanEntry {
  /** `id` do frontmatter; sem ele, o nome do arquivo. É o que vai no trailer `Plan-Step`. */
  id: string;
  /** Caminho relativo à raiz do projeto, com `/`. */
  path: string;
  plan?: Plan;
  /** Mensagem quando o plano não pôde ser lido. */
  error?: string;
}

export interface PhaseEntry {
  id: string;
  title: string;
  yaml: YamlPhase;
}

/** Todos os planos de `.dev/plans/`, em ordem de nome de arquivo. */
export function listPlans(root: string): PlanEntry[] {
  const dir = join(root, PLANS_DIR);
  if (!isDir(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => loadPlan(root, join(dir, f)));
}

function loadPlan(root: string, file: string): PlanEntry {
  const path = relative(root, file).split(sep).join('/');
  const fallbackId = basename(file, '.md');
  try {
    const plan = readPlan(file);
    const id = typeof plan.frontmatter.id === 'string' && plan.frontmatter.id.trim() ? plan.frontmatter.id.trim() : fallbackId;
    return { id, path, plan };
  } catch (err) {
    if (err instanceof PlanParseError) return { id: fallbackId, path, error: `${path}:${err.line}: ${err.message}` };
    throw err;
  }
}

/** Plano pelo `id`. Lança `ProjectError` com os ids disponíveis quando não existe ou não pôde ser lido. */
export function findPlan(root: string, id: string, plans = listPlans(root)): PlanEntry & { plan: Plan } {
  const entry = plans.find((p) => p.id === id);
  if (entry?.plan) return entry as PlanEntry & { plan: Plan };
  if (entry?.error) throw new ProjectError(`o plano "${id}" não pôde ser lido: ${entry.error}`);
  const known = plans.map((p) => p.id);
  const existing = known.length ? `existentes: ${known.join(', ')}` : 'a pasta não tem planos';
  throw new ProjectError(`plano "${id}" não encontrado em ${PLANS_DIR}/ (${existing})`);
}

/** Fases do YAML com `id` em texto, na ordem do arquivo. As demais ficam para o `lint`. */
export function planPhases(plan: Plan): PhaseEntry[] {
  return plan.phases
    .filter((p) => p.isMapping && typeof p.data.id === 'string')
    .map((p) => ({
      id: p.data.id as string,
      title: typeof p.data.title === 'string' ? p.data.title.trim() : '',
      yaml: p,
    }));
}

export function findPhase(entry: PlanEntry & { plan: Plan }, phaseId: string): PhaseEntry {
  const phases = planPhases(entry.plan);
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase) {
    throw new ProjectError(`fase "${phaseId}" não existe no plano ${entry.id} (fases: ${phases.map((p) => p.id).join(', ')})`);
  }
  return phase;
}

/** Separa `plano/fase`. */
export function parsePhaseRef(ref: string): { plan: string; phase: string } {
  const at = ref.lastIndexOf('/');
  const plan = ref.slice(0, at).trim();
  const phase = ref.slice(at + 1).trim();
  if (at < 0 || !plan || !phase) throw new ProjectError(`"${ref}" não está no formato <plano>/<fase>, ex.: v1-nucleo/f2`);
  return { plan, phase };
}

function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
