import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { loadTrack } from './reindex';
import { TRACKS, entryFields, type Entry } from './schema';

export const RECALL_LIMIT = 5;
export const FULL_LIMIT = 3;

/** Campos pesquisados, do mais forte para o mais fraco. */
const FIELDS = [
  { name: 'tags', weight: 6, kind: 'keyword' },
  { name: 'module', weight: 5, kind: 'keyword' },
  { name: 'applies_when', weight: 4, kind: 'text' },
  { name: 'summary', weight: 3, kind: 'text' },
  { name: 'title', weight: 2, kind: 'text' },
  { name: 'symptoms', weight: 1, kind: 'text' },
] as const;

type FieldName = (typeof FIELDS)[number]['name'];

const STOPWORDS = new Set(
  'a o as os e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos como mais the of and to in on for with is'.split(' '),
);

export interface RecallMatch {
  field: FieldName;
  /** Valores do campo que coincidiram (tags e module) ou termos encontrados no texto. */
  values: string[];
}

export interface RecallHit {
  entry: Entry;
  /** Soma, por termo, do peso do campo mais forte em que ele aparece. */
  score: number;
  matches: RecallMatch[];
}

/** Termos de busca: separa por espaço e vírgula, sem palavras vazias e sem repetição. */
export function parseTerms(args: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of args.join(' ').split(/[\s,]+/)) {
    const term = raw.trim();
    const key = normalizeWord(term);
    if (key.length < 2 || STOPWORDS.has(term.toLowerCase()) || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

/** Busca nas duas trilhas pelo frontmatter (e pelo título). Devolve até `limit` entradas com pontuação positiva. */
export function recall(root: string, terms: string[], limit = RECALL_LIMIT): RecallHit[] {
  const entries = TRACKS.flatMap((track) => loadTrack(root, track).entries);
  return entries
    .map((entry) => scoreEntry(entry, terms))
    .filter((hit) => hit.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        totalValues(b) - totalValues(a) ||
        (a.entry.slug < b.entry.slug ? -1 : a.entry.slug > b.entry.slug ? 1 : 0),
    )
    .slice(0, limit);
}

export function scoreEntry(entry: Entry, terms: string[]): RecallHit {
  const f = entryFields(entry);
  const values: Record<FieldName, string[]> = {
    tags: f.tags,
    module: f.module ? [f.module] : [],
    applies_when: f.appliesWhen,
    summary: f.summary ? [f.summary] : [],
    title: [entry.title, entry.slug.replace(/-/g, ' ')],
    symptoms: f.symptoms,
  };

  const found = new Map<FieldName, string[]>();
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of FIELDS) {
      const hits =
        field.kind === 'keyword'
          ? values[field.name].filter((v) => keywordMatches(v, term))
          : values[field.name].some((v) => textMatches(v, term))
            ? [term]
            : [];
      if (!hits.length) continue;
      best = Math.max(best, field.weight);
      const list = found.get(field.name) ?? [];
      for (const h of hits) if (!list.includes(h)) list.push(h);
      found.set(field.name, list);
    }
    score += best;
  }

  const matches = FIELDS.filter((field) => found.has(field.name)).map((field) => ({
    field: field.name,
    // Tags na ordem em que aparecem na entrada.
    values: field.name === 'tags' ? values.tags.filter((t) => found.get('tags')!.includes(t)) : found.get(field.name)!,
  }));
  return { entry, score, matches };
}

function totalValues(hit: RecallHit): number {
  return hit.matches.reduce((n, m) => n + m.values.length, 0);
}

/** Tag ou module: igual ao termo, ou uma das partes separadas por hífen igual ao termo. */
function keywordMatches(value: string, term: string): boolean {
  const t = normalizeWord(term);
  return normalizeWord(value) === t || value.split(/[-_\s]+/).some((part) => normalizeWord(part) === t);
}

/** Texto livre: alguma palavra igual ao termo, ou começando por ele quando o termo tem 4 letras ou mais. */
function textMatches(text: string, term: string): boolean {
  const t = normalizeWord(term);
  return words(text).some((w) => w === t || (t.length >= 4 && w.startsWith(t)));
}

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stripPlural);
}

/** Minúsculas, sem acento, sem hífen e sem o "s" de plural. */
function normalizeWord(value: string): string {
  return stripPlural(value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s._-]/g, ''));
}

function stripPlural(word: string): string {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

/** Lista numerada no formato da interface; com `full`, acrescenta o conteúdo dos primeiros `FULL_LIMIT` arquivos. */
export function formatRecall(root: string, hits: RecallHit[], options: { full?: boolean } = {}): string {
  const rel = (p: string) => relative(root, p).split(sep).join('/');
  const paths = hits.map((h) => rel(h.entry.path));
  const width = Math.max(0, ...paths.map((p) => p.length));
  const out: string[] = [];
  hits.forEach((hit, i) => {
    const f = entryFields(hit.entry);
    const indent = ' '.repeat(`${i + 1}. `.length);
    out.push(`${i + 1}. ${paths[i]!.padEnd(width)}   ${f.track || '?'}/${f.type || '?'} · ${f.module || '?'}`);
    out.push(`${indent}${f.summary || '(sem summary)'}`);
    out.push(`${indent}coincidiu: ${hit.matches.map((m) => `${m.field}(${m.values.join(', ')})`).join(', ')}`);
  });

  if (options.full) {
    hits.slice(0, FULL_LIMIT).forEach((hit, i) => {
      const content = readFileSync(hit.entry.path, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
      out.push('', `===== ${paths[i]} =====`, content);
    });
  }
  return out.join('\n');
}
