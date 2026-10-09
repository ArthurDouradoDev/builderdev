import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gitAsync } from '../git/log';

/** Caminhos de `git status` cujo `mtime` é lido; o resto só entra na contagem. */
export const MAX_STAT_PATHS = 200;

export interface LastCommit {
  hash: string;
  subject: string;
  /** ISO 8601, data do commit (não do autor). */
  date: string;
  author: string;
}

export interface GitChanges {
  /** Rastreados com qualquer mudança: modificados, removidos, renomeados, no índice ou não. */
  modified: number;
  /** Não rastreados (`??`); uma pasta nova conta como um. */
  untracked: number;
  /** Menor e maior `mtime` (ISO) entre os caminhos que ainda existem; `null` sem mudanças. */
  oldestMtime: string | null;
  newestMtime: string | null;
}

export interface GitInfo {
  /** Nome da branch, ou o hash curto quando `detached`. */
  branch: string;
  detached: boolean;
  /** `null` em repositório sem commits. */
  lastCommit: LastCommit | null;
  changes: GitChanges;
  /** Commits do upstream que faltam aqui e daqui que faltam no upstream, pelo último fetch; `null` sem upstream. */
  behind: number | null;
  ahead: number | null;
  /** Commits alcançáveis de HEAD nos últimos 7 dias. */
  commitsLast7Days: number;
  /** O mais recente entre o último commit e a mudança sem commit mais nova. */
  lastActivity: string | null;
}

/** Dados do git de `dir`, que precisa ser a raiz do repositório. Lança `GitError` se `dir` não for um. */
export async function gitInfo(dir: string): Promise<GitInfo> {
  // O teto impede o git de subir para um repositório acima quando o .git de `dir` está quebrado.
  const run = (args: string[]) => gitAsync(args, dir, { GIT_CEILING_DIRECTORIES: dirname(dir) });

  // Antes das outras: o hash de HEAD, ou `null` em repositório sem commits.
  const head = await run(['rev-parse', '--verify', '-q', 'HEAD']).then(
    (out) => out.trim() || null,
    async () => {
      await run(['rev-parse', '--git-dir']); // quando nem repositório é, lança com a mensagem do git
      return null;
    },
  );

  const [branchRef, lastCommit, changes, upstream, recent] = await Promise.all([
    head ? run(['rev-parse', '--abbrev-ref', 'HEAD']) : run(['symbolic-ref', '--short', 'HEAD']),
    head ? run(['log', '-1', '--format=%h%x1f%s%x1f%cI%x1f%an']).then(parseLastCommit) : null,
    run(['status', '--porcelain=v1', '-z']).then((out) => readChanges(dir, out)),
    head ? run(['rev-list', '--left-right', '--count', '@{u}...HEAD']).then(parseAheadBehind, () => null) : null,
    head ? run(['rev-list', '--count', '--since=7.days', 'HEAD']).then((out) => Number(out.trim()) || 0) : 0,
  ]);

  const name = branchRef.trim();
  const detached = name === 'HEAD';
  return {
    branch: detached ? head!.slice(0, 7) : name,
    detached,
    lastCommit,
    changes,
    behind: upstream?.behind ?? null,
    ahead: upstream?.ahead ?? null,
    commitsLast7Days: recent,
    lastActivity: latest([lastCommit?.date ?? null, changes.newestMtime]),
  };
}

function parseLastCommit(out: string): LastCommit | null {
  const [hash, subject, date, author] = out.trim().split('\x1f');
  if (!hash || date === undefined) return null;
  return { hash, subject: (subject ?? '').trim(), date: new Date(date).toISOString(), author: author ?? '' };
}

function parseAheadBehind(out: string): { behind: number; ahead: number } | null {
  const [behind, ahead] = out.trim().split(/\s+/).map(Number);
  return behind === undefined || ahead === undefined || Number.isNaN(behind) || Number.isNaN(ahead) ? null : { behind, ahead };
}

/** Conta e data as entradas de `git status --porcelain=v1 -z`. */
async function readChanges(dir: string, out: string): Promise<GitChanges> {
  const tokens = out.split('\0');
  const paths: string[] = [];
  let modified = 0;
  let untracked = 0;
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i]!;
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    if (code === '!!') continue;
    if (code === '??') untracked++;
    else modified++;
    paths.push(entry.slice(3));
    // Renomeado ou copiado: o caminho de origem vem no token seguinte.
    if (code.includes('R') || code.includes('C')) i++;
  }

  const times = await Promise.all(paths.slice(0, MAX_STAT_PATHS).map((p) => mtimeOf(join(dir, p))));
  const valid = times.filter((t): t is number => t !== null);
  const iso = (t: number | undefined) => (t === undefined ? null : new Date(t).toISOString());
  return {
    modified,
    untracked,
    oldestMtime: iso(valid.length ? Math.min(...valid) : undefined),
    newestMtime: iso(valid.length ? Math.max(...valid) : undefined),
  };
}

/** `mtime` em ms, ou `null` quando o caminho não existe mais (arquivo removido). */
export async function mtimeOf(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

/** A mais recente das datas ISO, ignorando as nulas. */
export function latest(dates: Array<string | null>): string | null {
  const times = dates.filter((d): d is string => d !== null).map((d) => Date.parse(d));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}
