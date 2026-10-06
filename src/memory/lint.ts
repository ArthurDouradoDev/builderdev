import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Problem } from '../plan/lint';
import { PLACEHOLDERS } from './entry';
import { INDEX_FILE, TRACKS, TRACK_DIRS, EntryParseError, bodyLines, listEntryFiles, readEntry, slugProblems, validateEntry, type Entry, type Track } from './schema';
import { INDEX_MAX_LINES, buildIndex, indexLineCount } from './reindex';

export const ENTRY_MAX_LINES = 40;
export const CLAUDE_MD_MAX_LINES = 150;

/** Mesmo formato de `FileReport` do lint de planos; `file` é absoluto. */
export interface MemoryReport {
  file: string;
  problems: Problem[];
}

const DIR_TRACKS: Record<string, Track> = { memory: 'conhecimento', errors: 'bug' };

/** Trilha esperada pela pasta do arquivo (`memory/` ou `errors/`); `null` fora delas. */
export function trackOfPath(path: string): Track | null {
  return DIR_TRACKS[basename(dirname(resolve(path)))] ?? null;
}

/** Arquivo de entrada: `.md` dentro de uma pasta `memory/` ou `errors/`, exceto o índice gerado. */
export function isEntryPath(path: string): boolean {
  return path.endsWith('.md') && basename(path) !== INDEX_FILE && trackOfPath(path) !== null;
}

/** Problemas de uma entrada isolada: schema, nome do arquivo, pasta da trilha, tamanho e texto do modelo esquecido. */
export function lintEntry(entry: Entry): Problem[] {
  const problems = validateEntry(entry);
  for (const message of slugProblems(entry.slug)) problems.push({ line: 1, severity: 'erro', code: 'slug-invalid', message });

  const expected = trackOfPath(entry.path);
  const track = entry.frontmatter.track;
  if (expected && (TRACKS as readonly unknown[]).includes(track) && track !== expected) {
    problems.push({
      line: entry.fieldLines.track ?? 1,
      severity: 'erro',
      code: 'track-dir-mismatch',
      message: `track "${String(track)}" fica em ${TRACK_DIRS[track as Track]}/, não em ${TRACK_DIRS[expected]}/`,
    });
  }

  const body = bodyLines(entry);
  if (body.length > ENTRY_MAX_LINES) {
    problems.push({ line: entry.bodyStartLine, severity: 'erro', code: 'entry-too-long', message: `corpo com ${body.length} linhas (máximo ${ENTRY_MAX_LINES})` });
  }
  entry.lines.forEach((text, i) => {
    const placeholder = i + 1 >= entry.bodyStartLine && PLACEHOLDERS.find((p) => text.includes(p));
    if (placeholder) {
      problems.push({ line: i + 1, severity: 'erro', code: 'entry-placeholder', message: `linha ainda com o texto do modelo (${placeholder}): substitua pelo conteúdo` });
    }
  });

  return problems.sort((a, b) => a.line - b.line);
}

/**
 * Valida as entradas do projeto em `root`. Sem `targets`, valida todas, o orçamento dos dois índices e o `.dev/CLAUDE.md`.
 * Com `targets`, valida só esses arquivos, mas a regra do corpus compara com todas as entradas do projeto,
 * e o orçamento do índice é checado nas pastas onde há algum alvo.
 */
export function lintMemory(root: string, targets?: string[]): MemoryReport[] {
  const dirs = TRACKS.map((track) => ({ track, dir: resolve(root, TRACK_DIRS[track]) }));
  const projectFiles = dirs.flatMap(({ dir }) => listEntryFiles(dir).map((f) => resolve(f)));
  const targetFiles = targets ? targets.map((t) => resolve(t)) : projectFiles;

  const entries = new Map<string, Entry>();
  const reports = new Map<string, Problem[]>();
  for (const file of new Set([...projectFiles, ...targetFiles])) {
    try {
      entries.set(file, readEntry(file));
    } catch (err) {
      if (!(err instanceof EntryParseError)) throw err;
      reports.set(file, [{ line: err.line, severity: 'erro', code: 'frontmatter-invalid', message: err.message }]);
    }
  }

  const corpus = corpusProblems([...entries.values()]);
  const out: MemoryReport[] = targetFiles.map((file) => {
    const entry = entries.get(file);
    const problems = entry ? [...lintEntry(entry), ...(corpus.get(file) ?? [])].sort((a, b) => a.line - b.line) : (reports.get(file) ?? []);
    return { file, problems };
  });

  for (const { track, dir } of dirs) {
    if (targets && !targetFiles.some((f) => dirname(f) === dir)) continue;
    const inDir = [...entries.values()].filter((e) => dirname(resolve(e.path)) === dir);
    const lines = indexLineCount(buildIndex(track, inDir));
    if (lines > INDEX_MAX_LINES) {
      out.push({
        file: join(dir, INDEX_FILE),
        problems: [{ line: 1, severity: 'erro', code: 'index-too-long', message: `o índice teria ${lines} linhas (máximo ${INDEX_MAX_LINES}): funda ou remova entradas` }],
      });
    }
  }

  if (!targets) {
    const claude = join(root, '.dev', 'CLAUDE.md');
    if (existsSync(claude)) out.push({ file: claude, problems: lintClaudeMd(claude) });
  }
  return out;
}

export function lintClaudeMd(path: string): Problem[] {
  const lines = indexLineCount(readFileSync(path, 'utf8'));
  return lines > CLAUDE_MD_MAX_LINES
    ? [{ line: CLAUDE_MD_MAX_LINES + 1, severity: 'erro', code: 'claude-md-too-long', message: `.dev/CLAUDE.md tem ${lines} linhas (máximo ${CLAUDE_MD_MAX_LINES})` }]
    : [];
}

interface Use {
  value: string;
  entry: Entry;
}

/**
 * Regra do corpus: avisa quando o `module` ou uma tag de uma entrada é quase igual a um valor usado em outra.
 * Valores parecidos formam um grupo; o valor mais usado do grupo é o sugerido, e cada uso diferente dele recebe o aviso.
 * Devolve os avisos por `entry.path`.
 */
export function corpusProblems(entries: Entry[]): Map<string, Problem[]> {
  const out = new Map<string, Problem[]>();
  const add = (entry: Entry, problem: Problem) => out.set(entry.path, [...(out.get(entry.path) ?? []), problem]);

  const modules: Use[] = [];
  const tags: Use[] = [];
  for (const entry of entries) {
    const fm = entry.frontmatter;
    if (typeof fm.module === 'string' && fm.module.trim()) modules.push({ value: fm.module.trim(), entry });
    if (Array.isArray(fm.tags)) {
      for (const tag of new Set(fm.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== ''))) tags.push({ value: tag.trim(), entry });
    }
  }

  for (const [kind, uses] of [['module', modules], ['tag', tags]] as const) {
    for (const { use, canonical, count } of nearDuplicates(uses)) {
      const usedIn = `${kind === 'tag' ? 'já usada' : 'já usado'} em ${count} ${count === 1 ? 'entrada' : 'entradas'}`;
      add(use.entry, {
        line: use.entry.fieldLines[kind === 'tag' ? 'tags' : 'module'] ?? 1,
        severity: 'aviso',
        code: `corpus-${kind}`,
        message: `${kind} "${use.value}" é quase igual a "${canonical}", ${usedIn}: use "${canonical}"`,
      });
    }
  }
  return out;
}

function nearDuplicates(uses: Use[]): Array<{ use: Use; canonical: string; count: number }> {
  const stats = new Map<string, { count: number; created: string }>();
  for (const { value, entry } of uses) {
    const created = typeof entry.frontmatter.created === 'string' ? entry.frontmatter.created : '9999-99-99';
    const s = stats.get(value);
    stats.set(value, s ? { count: s.count + 1, created: s.created < created ? s.created : created } : { count: 1, created });
  }

  // Agrupa valores parecidos (union-find sobre os pares).
  const values = [...stats.keys()].sort();
  const parent = new Map(values.map((v) => [v, v]));
  const find = (v: string): string => (parent.get(v) === v ? v : find(parent.get(v)!));
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (similar(values[i]!, values[j]!)) parent.set(find(values[j]!), find(values[i]!));
    }
  }

  const canonical = new Map<string, string>();
  for (const v of values) {
    const group = find(v);
    const best = canonical.get(group);
    if (best === undefined || preferred(v, best)) canonical.set(group, v);
  }

  return uses
    .map((use) => {
      const c = canonical.get(find(use.value))!;
      return { use, canonical: c, count: stats.get(c)!.count };
    })
    .filter(({ use, canonical: c }) => use.value !== c);

  // Mais usado; depois no formato limpo (minúsculas e hífen); depois o mais antigo; depois a ordem alfabética.
  function preferred(a: string, b: string): boolean {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    if (sa.count !== sb.count) return sa.count > sb.count;
    const clean = (v: string) => /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u.test(v);
    if (clean(a) !== clean(b)) return clean(a);
    if (sa.created !== sb.created) return sa.created < sb.created;
    return a < b;
  }
}

/** Caixa, acento, hífen, sublinhado e plural com "s" não contam; a distância de edição tolerada cresce com o tamanho. */
export function similar(a: string, b: string): boolean {
  const x = normalizeValue(a);
  const y = normalizeValue(b);
  if (x === y) return true;
  const shorter = Math.min(x.length, y.length);
  const tolerance = shorter >= 8 ? 2 : shorter >= 5 ? 1 : 0;
  return tolerance > 0 && editDistance(x, y) <= tolerance;
}

export function normalizeValue(value: string): string {
  let s = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s._-]/g, '');
  if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1);
  return s;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}
