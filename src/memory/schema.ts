import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { LineCounter, isMap, isScalar, parseDocument } from 'yaml';
import type { Problem } from '../plan/lint';

export type Track = 'conhecimento' | 'bug';
export const TRACKS: readonly Track[] = ['conhecimento', 'bug'];

export const TYPES: Record<Track, readonly string[]> = {
  conhecimento: ['convencao', 'decisao', 'padrao', 'ferramenta', 'fluxo', 'pratica'],
  bug: ['build', 'teste', 'runtime', 'performance', 'dados', 'seguranca', 'ui', 'integracao', 'logica'],
};

/** Pasta de cada trilha, relativa à raiz do projeto. */
export const TRACK_DIRS: Record<Track, string> = { conhecimento: '.dev/memory', bug: '.dev/errors' };
export const INDEX_FILE = 'index.md';

export const SUMMARY_MAX = 120;
export const TAGS_MAX = 8;
export const APPLIES_WHEN_MAX = 5;
export const SYMPTOMS_MAX = 5;

const COMMON_FIELDS = ['track', 'type', 'module', 'summary', 'tags', 'created', 'updated', 'applies_when'];
const BUG_FIELDS = ['symptoms', 'root_cause', 'resolution', 'occurrences'];

const TAG = /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_DATE = /(?:^|-)(?:\d{4}-\d{2}(?:-\d{2})?|\d{8})(?:-|$)/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const H1 = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** Erro de leitura da entrada (frontmatter ausente ou inválido). `line` é 1-based no arquivo. */
export class EntryParseError extends Error {
  constructor(message: string, readonly line: number) {
    super(message);
    this.name = 'EntryParseError';
  }
}

export interface Entry {
  /** Caminho do arquivo, como recebido. */
  path: string;
  /** Nome do arquivo sem `.md`. */
  slug: string;
  lines: string[];
  frontmatter: Record<string, unknown>;
  /** Linha de cada chave do frontmatter. */
  fieldLines: Record<string, number>;
  /** Primeira linha depois do `---` que fecha o frontmatter. */
  bodyStartLine: number;
  /** Primeiro `# título` do corpo; sem ele, o slug. */
  title: string;
}

/** Campos já convertidos, tolerantes a valores ausentes ou malformados (para índice e busca). */
export interface EntryFields {
  track: string;
  type: string;
  module: string;
  summary: string;
  tags: string[];
  appliesWhen: string[];
  symptoms: string[];
}

export function readEntry(path: string): Entry {
  return parseEntry(readFileSync(path, 'utf8'), path);
}

export function parseEntry(source: string, path: string): Entry {
  const lines = source.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    throw new EntryParseError("frontmatter ausente: a entrada deve começar com uma linha '---' seguida do YAML", 1);
  }
  const closeIndex = lines.findIndex((l, i) => i > 0 && (l.trim() === '---' || l.trim() === '...'));
  if (closeIndex < 0) throw new EntryParseError("frontmatter sem fechamento: falta a linha '---' que encerra o YAML", 1);

  const lineCounter = new LineCounter();
  const doc = parseDocument(lines.slice(1, closeIndex).join('\n'), { lineCounter });
  const fileLine = (offset: number) => lineCounter.linePos(offset).line + 1;
  const firstError = doc.errors[0];
  if (firstError) {
    const reason = (firstError.message.split('\n')[0] ?? '').replace(/ at line \d+, column \d+:?$/, '');
    throw new EntryParseError(`frontmatter inválido: ${reason}`, fileLine(firstError.pos[0]));
  }
  if (!isMap(doc.contents)) throw new EntryParseError('frontmatter inválido: o YAML deve ser um mapeamento (chave: valor)', 2);

  const fieldLines: Record<string, number> = {};
  for (const { key } of doc.contents.items) {
    if (isScalar(key) && key.range) fieldLines[String(key.value)] = fileLine(key.range[0]);
  }
  const slug = basename(path).replace(/\.md$/, '');
  return {
    path,
    slug,
    lines,
    frontmatter: (doc.toJS() ?? {}) as Record<string, unknown>,
    fieldLines,
    bodyStartLine: closeIndex + 2,
    title: findTitle(lines, closeIndex + 1) ?? slug,
  };
}

function findTitle(lines: string[], startIndex: number): string | null {
  let fence: string | null = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      continue;
    }
    const m = H1.exec(line);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

/** Linhas do corpo, sem as linhas vazias do começo e do fim. */
export function bodyLines(entry: Entry): string[] {
  const body = entry.lines.slice(entry.bodyStartLine - 1);
  let start = 0;
  let end = body.length;
  while (start < end && body[start]!.trim() === '') start++;
  while (end > start && body[end - 1]!.trim() === '') end--;
  return body.slice(start, end);
}

export function entryFields(entry: Entry): EntryFields {
  const fm = entry.frontmatter;
  const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim() : '');
  const list = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
  return {
    track: text(fm.track),
    type: text(fm.type),
    module: text(fm.module),
    summary: text(fm.summary),
    tags: list(fm.tags),
    appliesWhen: list(fm.applies_when),
    symptoms: list(fm.symptoms),
  };
}

/** Arquivos de entrada da pasta, em ordem de nome, sem o `index.md` gerado. */
export function listEntryFiles(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== INDEX_FILE)
    .sort()
    .map((f) => join(dir, f));
}

/** Problemas do nome do arquivo: precisa ser um slug (minúsculas, números e hífen) sem data. */
export function slugProblems(slug: string): string[] {
  if (!SLUG.test(slug)) return [`"${slug}" não é um slug: use minúsculas sem acento, números e hífen (ex.: viewshed-crs-metrico)`];
  if (SLUG_DATE.test(slug)) return [`"${slug}" tem data no nome: o slug descreve o assunto, e a data fica em "created"`];
  return [];
}

/** Valida o frontmatter contra o schema da trilha declarada em `track`. */
export function validateEntry(entry: Entry): Problem[] {
  const problems: Problem[] = [];
  const fm = entry.frontmatter;
  const at = (field: string) => entry.fieldLines[field] ?? 1;
  const error = (field: string, code: string, message: string) => problems.push({ line: at(field), severity: 'erro', code, message });
  const warn = (field: string, code: string, message: string) => problems.push({ line: at(field), severity: 'aviso', code, message });
  const present = (field: string) => fm[field] !== undefined && fm[field] !== null && fm[field] !== '';

  const track = fm.track;
  const isTrack = typeof track === 'string' && (TRACKS as readonly string[]).includes(track);
  if (!present('track')) error('track', 'field-missing', `campo "track" ausente: use ${TRACKS.join(' | ')}`);
  else if (!isTrack) error('track', 'track-invalid', `track "${String(track)}" inválida: use ${TRACKS.join(' | ')}`);

  if (!present('type')) {
    error('type', 'field-missing', `campo "type" ausente${isTrack ? `: use ${TYPES[track as Track].join(' | ')}` : ''}`);
  } else if (isTrack && !TYPES[track as Track].includes(String(fm.type))) {
    error('type', 'type-enum', `type "${String(fm.type)}" não existe na trilha ${track}: use ${TYPES[track as Track].join(' | ')}`);
  }

  for (const field of ['module', 'summary']) {
    if (!present(field)) error(field, 'field-missing', `campo "${field}" ausente ou vazio`);
    else if (typeof fm[field] !== 'string') error(field, 'field-invalid', `"${field}" deve ser texto`);
  }
  if (typeof fm.summary === 'string') {
    if (/\n/.test(fm.summary.trim())) error('summary', 'summary-multiline', '"summary" deve ter uma linha só: ela vira a linha do índice');
    else if (fm.summary.trim().length > SUMMARY_MAX) {
      error('summary', 'summary-too-long', `"summary" tem ${fm.summary.trim().length} caracteres (máximo ${SUMMARY_MAX})`);
    }
  }

  checkList('tags', 1, TAGS_MAX, true);
  if (Array.isArray(fm.tags)) {
    for (const tag of fm.tags) {
      if (typeof tag === 'string' && !TAG.test(tag)) error('tags', 'tag-format', `tag "${tag}" fora do formato: minúsculas e hífen (ex.: ui-web)`);
    }
  }
  if (present('applies_when')) checkList('applies_when', 0, APPLIES_WHEN_MAX, false);

  if (!present('created')) error('created', 'field-missing', 'campo "created" ausente: use a data AAAA-MM-DD');
  for (const field of ['created', 'updated']) {
    if (present(field) && !isDate(fm[field])) error(field, 'date-invalid', `"${field}" deve ser uma data AAAA-MM-DD, não "${String(fm[field])}"`);
  }

  if (track === 'bug') {
    checkList('symptoms', 1, SYMPTOMS_MAX, true);
    for (const field of ['root_cause', 'resolution']) {
      if (!present(field)) error(field, 'field-missing', `campo "${field}" ausente ou vazio (obrigatório na trilha bug)`);
      else if (typeof fm[field] !== 'string') error(field, 'field-invalid', `"${field}" deve ser texto`);
    }
    if (!present('occurrences')) error('occurrences', 'field-missing', 'campo "occurrences" ausente (obrigatório na trilha bug; começa em 1)');
    else if (!Number.isInteger(fm.occurrences) || (fm.occurrences as number) < 1) {
      error('occurrences', 'occurrences-invalid', `"occurrences" deve ser um inteiro a partir de 1, não "${String(fm.occurrences)}"`);
    }
  } else if (isTrack) {
    for (const field of BUG_FIELDS) {
      if (field in fm) warn(field, 'field-wrong-track', `"${field}" só vale na trilha bug; nesta trilha ele é ignorado`);
    }
  }

  const known = new Set([...COMMON_FIELDS, ...BUG_FIELDS]);
  for (const field of Object.keys(fm)) {
    if (!known.has(field)) warn(field, 'field-unknown', `campo "${field}" não faz parte do schema e é ignorado`);
  }

  return problems;

  function checkList(field: string, min: number, max: number, required: boolean) {
    const value = fm[field];
    if (value === undefined || value === null) {
      if (required) error(field, 'field-missing', `campo "${field}" ausente: lista com ${min} a ${max} itens`);
      return;
    }
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string' && v.trim() !== '')) {
      error(field, 'field-invalid', `"${field}" deve ser uma lista de textos não vazios`);
    } else if (value.length < min || value.length > max) {
      error(field, `${field.replace('_', '-')}-count`, `"${field}" tem ${value.length} ${value.length === 1 ? 'item' : 'itens'} (de ${min} a ${max})`);
    }
  }
}

function isDate(value: unknown): boolean {
  const m = typeof value === 'string' ? DATE.exec(value) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
