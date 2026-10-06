import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntryParseError, INDEX_FILE, TRACKS, TRACK_DIRS, entryFields, listEntryFiles, readEntry, type Entry, type Track } from './schema';

export const INDEX_HEADER = '<!-- GERADO por betterdev reindex; não editar -->';
export const INDEX_MAX_LINES = 200;
const INDEX_TITLES: Record<Track, string> = { conhecimento: 'Memória', bug: 'Erros' };

/** `- [slug](slug.md) · track/type · module · tag1, tag2 - summary` */
export function indexLine(entry: Entry): string {
  const f = entryFields(entry);
  const kind = `${f.track || '?'}/${f.type || '?'}`;
  return `- [${entry.slug}](${entry.slug}.md) · ${kind} · ${f.module || '?'} · ${f.tags.join(', ') || '?'} - ${f.summary || '?'}`;
}

/** Conteúdo do índice: cabeçalho, título e uma linha por entrada, por `module` e depois por slug. Determinístico. */
export function buildIndex(track: Track, entries: Entry[]): string {
  const key = (e: Entry) => {
    const module = entryFields(e).module;
    return [module.toLowerCase(), module, e.slug];
  };
  const sorted = [...entries].sort((a, b) => compareKeys(key(a), key(b)));
  const count = `${sorted.length} ${sorted.length === 1 ? 'entrada' : 'entradas'}`;
  return [INDEX_HEADER, `# ${INDEX_TITLES[track]} · ${count}`, '', ...sorted.map(indexLine), ''].join('\n');
}

export function indexLineCount(content: string): number {
  return content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;
}

export interface SkippedEntry {
  path: string;
  line: number;
  message: string;
}

/** Entradas legíveis da pasta da trilha; as de frontmatter ilegível vão para `skipped`. */
export function loadTrack(root: string, track: Track): { entries: Entry[]; skipped: SkippedEntry[] } {
  const entries: Entry[] = [];
  const skipped: SkippedEntry[] = [];
  for (const file of listEntryFiles(join(root, TRACK_DIRS[track]))) {
    try {
      entries.push(readEntry(file));
    } catch (err) {
      if (!(err instanceof EntryParseError)) throw err;
      skipped.push({ path: file, line: err.line, message: err.message });
    }
  }
  return { entries, skipped };
}

export interface ReindexResult {
  track: Track;
  /** Caminho do índice relativo à raiz. */
  path: string;
  entries: number;
  lines: number;
  changed: boolean;
  overBudget: boolean;
  skipped: SkippedEntry[];
}

/**
 * Regenera `index.md` de cada trilha cuja pasta existe. Só grava quando o conteúdo muda,
 * e grava mesmo acima do orçamento: quem chama decide o que fazer com `overBudget`.
 */
export function reindex(root: string): ReindexResult[] {
  const results: ReindexResult[] = [];
  for (const track of TRACKS) {
    const dir = join(root, TRACK_DIRS[track]);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const { entries, skipped } = loadTrack(root, track);
    const content = buildIndex(track, entries);
    const file = join(dir, INDEX_FILE);
    const changed = !existsSync(file) || readFileSync(file, 'utf8') !== content;
    if (changed) writeFileSync(file, content);
    const lines = indexLineCount(content);
    results.push({
      track,
      path: `${TRACK_DIRS[track]}/${INDEX_FILE}`,
      entries: entries.length,
      lines,
      changed,
      overBudget: lines > INDEX_MAX_LINES,
      skipped,
    });
  }
  return results;
}

/** Comparação por código de caractere, independente da localidade da máquina. */
function compareKeys(a: string[], b: string[]): number {
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
