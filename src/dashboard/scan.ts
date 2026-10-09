import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { type Alert, alertsFor } from './alerts';
import { type GitInfo, gitInfo, latest, mtimeOf } from './git-info';

/** Projetos lidos ao mesmo tempo: cada um dispara ~5 processos git. */
export const SCAN_CONCURRENCY = 4;

export type ProjectKind = 'sem-git' | 'git' | 'builderdev';

export interface Project {
  /** Nome da pasta, que identifica o projeto na raiz. */
  name: string;
  path: string;
  kind: ProjectKind;
  /** `null` em pasta sem git ou quando a leitura falhou. */
  git: GitInfo | null;
  lastActivity: string | null;
  alerts: Alert[];
  /** Mensagem da falha ao ler o projeto; o card mostra isto no lugar dos dados. */
  error: string | null;
}

export interface Scan {
  root: string;
  scannedAt: string;
  durationMs: number;
  /** Os com alerta de atenção primeiro; dentro de cada grupo, da atividade mais recente à mais antiga. */
  projects: Project[];
}

/** Lê as pastas de primeiro nível de `root`, sem as ocultas e sem `node_modules`. */
export async function scanRoot(root: string, now: () => Date = () => new Date()): Promise<Scan> {
  const started = performance.now();
  const abs = resolve(root);
  const dirs = (await readdir(abs, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const at = now();
  const projects = await mapLimit(dirs, SCAN_CONCURRENCY, (name) => readProject(join(abs, name), name, at));
  return {
    root: abs,
    scannedAt: at.toISOString(),
    durationMs: Math.round(performance.now() - started),
    projects: projects.sort(byAttention),
  };
}

export function classify(dir: string): ProjectKind {
  if (!existsSync(join(dir, '.git'))) return 'sem-git';
  return existsSync(join(dir, '.dev', 'plans')) ? 'builderdev' : 'git';
}

async function readProject(path: string, name: string, now: Date): Promise<Project> {
  const kind = classify(path);
  const base = { name, path, kind };
  try {
    const git = kind === 'sem-git' ? null : await gitInfo(path);
    const lastActivity = git ? git.lastActivity : await newestEntry(path);
    return { ...base, git, lastActivity, alerts: alertsFor({ kind, git, lastActivity }, now), error: null };
  } catch (err) {
    return { ...base, git: null, lastActivity: null, alerts: [], error: (err as Error).message };
  }
}

/** `mtime` mais recente entre as entradas de primeiro nível de `dir` (o da própria pasta, se vazia). */
async function newestEntry(dir: string): Promise<string | null> {
  const names = await readdir(dir);
  const times = await Promise.all([dir, ...names.map((n) => join(dir, n))].map(mtimeOf));
  return latest(times.map((t) => (t === null ? null : new Date(t).toISOString())));
}

function byAttention(a: Project, b: Project): number {
  const attention = (p: Project) => Number(p.alerts.some((x) => x.severity === 'atencao'));
  const time = (p: Project) => (p.lastActivity ? Date.parse(p.lastActivity) : 0);
  return attention(b) - attention(a) || time(b) - time(a) || a.name.localeCompare(b.name);
}

/** `fn` em cada item, com no máximo `limit` ao mesmo tempo; a saída segue a ordem de `items`. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
