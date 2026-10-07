import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { METRICS_FILE } from '../hooks/common';

/** Ferramentas que contam como a primeira edição da sessão. `MultiEdit` existiu em versões antigas do Claude Code. */
export const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
/** Queda de contexto entre turnos seguidos acima desta fração conta como compactação estimada. */
export const COMPACT_DROP = 0.5;

export interface SessionStats {
  /** Nome do arquivo sem `.jsonl`; é o `sessionId` do Claude Code. */
  id: string;
  file: string;
  /** Primeiro e último `timestamp` (ISO) dos registros da sessão principal. */
  start: string;
  end: string;
  durationMs: number;
  /** `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` da primeira resposta. */
  openingTokens: number;
  /** `tool_use` antes da primeira edição; `null` quando a sessão não editou nada. */
  toolCallsBeforeEdit: number | null;
  toolCalls: number;
  compactions: number;
  /** Verdadeiro quando a contagem veio da queda de contexto, não do hook `PostCompact`. */
  compactionsEstimated: boolean;
}

interface TranscriptRecord {
  type?: string;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  timestamp?: string;
  cwd?: string;
  uuid?: string;
  requestId?: string;
  message?: {
    id?: string;
    model?: string;
    content?: unknown;
    usage?: { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  };
}

/** Pasta onde o Claude Code grava os históricos: `~/.claude/projects`, ou `$CLAUDE_CONFIG_DIR/projects`. */
export function defaultProjectsDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects');
}

/**
 * Nome da pasta de históricos de um projeto: o caminho absoluto com `:`, `\` e `/` trocados por `-`
 * (`C:\Users\x\MDT` → `C--Users-x-MDT`). O Claude Code troca também os demais caracteres fora de `[A-Za-z0-9]`.
 */
export function projectSlug(projectPath: string): string {
  return projectPath.replace(/[^A-Za-z0-9]/g, '-');
}

/**
 * Pastas de históricos do projeto. Primeiro pelo slug, sem diferenciar caixa: a letra do drive aparece
 * como `C--` ou `c--` conforme a sessão foi aberta. Sem nenhuma, procura pastas cujos registros têm `cwd` igual ao projeto.
 */
export function findTranscriptDirs(projectPath: string, projectsDir = defaultProjectsDir()): string[] {
  if (!existsSync(projectsDir)) return [];
  const dirs = readdirSync(projectsDir)
    .filter((name) => statSync(join(projectsDir, name)).isDirectory())
    .sort();
  const slug = projectSlug(resolve(projectPath)).toLowerCase();
  const bySlug = dirs.filter((name) => name.toLowerCase() === slug);
  if (bySlug.length) return bySlug.map((name) => join(projectsDir, name));

  const target = samePath(resolve(projectPath));
  return dirs
    .map((name) => join(projectsDir, name))
    .filter((dir) => sessionFiles(dir).some((file) => {
      const cwd = firstCwd(file);
      return cwd !== null && samePath(cwd) === target;
    }));
}

/** Arquivos `.jsonl` de sessão da pasta, em ordem de nome. Subpastas (resultados de ferramentas, subagentes) ficam de fora. */
export function sessionFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => join(dir, f));
}

/** O que sai do `.jsonl` sozinho; as compactações medidas vêm do `metrics.jsonl` do projeto. */
export type SessionReading = Omit<SessionStats, 'compactions' | 'compactionsEstimated'> & { estimatedCompactions: number };

/**
 * Métricas de uma sessão a partir do seu `.jsonl`, ignorando registros de subagente (`isSidechain`)
 * e as respostas sintéticas de erro da API. `null` quando a sessão não tem nenhuma resposta do modelo.
 */
export function readSession(file: string): SessionReading | null {
  const records = parseJsonl(readFileSync(file, 'utf8')).filter((r) => !r.isSidechain);

  let start: string | null = null;
  let end: string | null = null;
  for (const r of records) {
    if (typeof r.timestamp !== 'string' || Number.isNaN(Date.parse(r.timestamp))) continue;
    if (start === null || r.timestamp < start) start = r.timestamp;
    if (end === null || r.timestamp > end) end = r.timestamp;
  }

  // Uma resposta da API vira vários registros (um por bloco de conteúdo), com o mesmo `message.id` e o `usage` repetido.
  const contexts: number[] = [];
  const seenMessages = new Set<string>();
  const seenTools = new Set<string>();
  let toolCalls = 0;
  let toolCallsBeforeEdit: number | null = null;
  for (const r of records) {
    if (r.type !== 'assistant' || r.isApiErrorMessage || !r.message || r.message.model === '<synthetic>') continue;
    const messageId = r.message.id ?? r.requestId ?? r.uuid ?? `#${contexts.length}`;
    if (!seenMessages.has(messageId)) {
      const context = contextTokens(r.message.usage);
      if (context > 0) {
        seenMessages.add(messageId);
        contexts.push(context);
      }
    }
    for (const block of Array.isArray(r.message.content) ? r.message.content : []) {
      const tool = block as { type?: string; id?: string; name?: string };
      if (tool?.type !== 'tool_use') continue;
      const key = tool.id ?? `${messageId}#${toolCalls}`;
      if (seenTools.has(key)) continue;
      seenTools.add(key);
      if (toolCallsBeforeEdit === null && EDIT_TOOLS.has(tool.name ?? '')) toolCallsBeforeEdit = toolCalls;
      toolCalls++;
    }
  }

  const openingTokens = contexts[0];
  if (openingTokens === undefined || start === null || end === null) return null;
  return {
    id: basename(file, '.jsonl'),
    file,
    start,
    end,
    durationMs: Date.parse(end) - Date.parse(start),
    openingTokens,
    toolCallsBeforeEdit,
    toolCalls,
    estimatedCompactions: estimateCompactions(contexts),
  };
}

/** Compactações estimadas: quantas vezes o contexto caiu mais de `COMPACT_DROP` entre dois turnos seguidos. */
export function estimateCompactions(contexts: number[]): number {
  let count = 0;
  for (let i = 1; i < contexts.length; i++) {
    if (contexts[i]! < contexts[i - 1]! * (1 - COMPACT_DROP)) count++;
  }
  return count;
}

/**
 * Por sessão, as compactações registradas pelo hook `PostCompact`. Só entram as sessões que o hook
 * acompanhou (com algum registro em `metrics.jsonl`): nelas, zero compactações é uma medida, não uma ausência.
 */
export function readCompactionMetrics(projectRoot: string): Map<string, number> {
  const file = join(projectRoot, METRICS_FILE);
  const counts = new Map<string, number>();
  if (!existsSync(file)) return counts;
  for (const r of parseJsonl(readFileSync(file, 'utf8')) as Array<{ evento?: unknown; session_id?: unknown }>) {
    if (typeof r.session_id !== 'string' || !r.session_id) continue;
    counts.set(r.session_id, (counts.get(r.session_id) ?? 0) + (r.evento === 'compact' ? 1 : 0));
  }
  return counts;
}

export interface ProjectSessions {
  /** Pastas de históricos lidas. */
  dirs: string[];
  /** Sessões com pelo menos uma resposta do modelo, por início e depois por id. */
  sessions: SessionStats[];
  /** Arquivos de sessão sem nenhuma resposta do modelo (abertas e fechadas sem uso). */
  empty: number;
}

/** Todas as sessões do projeto, com as compactações do `metrics.jsonl` quando o hook acompanhou a sessão. */
export function projectSessions(projectRoot: string, projectsDir = defaultProjectsDir()): ProjectSessions {
  const dirs = findTranscriptDirs(projectRoot, projectsDir);
  const metrics = readCompactionMetrics(projectRoot);
  const byId = new Map<string, SessionStats>();
  let empty = 0;
  for (const file of dirs.flatMap(sessionFiles)) {
    const session = readSession(file);
    if (!session) {
      empty++;
      continue;
    }
    if (byId.has(session.id)) continue;
    const { estimatedCompactions, ...rest } = session;
    const measured = metrics.get(session.id);
    byId.set(session.id, {
      ...rest,
      compactions: measured ?? estimatedCompactions,
      compactionsEstimated: measured === undefined,
    });
  }
  const sessions = [...byId.values()].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : 1));
  return { dirs, sessions, empty };
}

function contextTokens(usage: NonNullable<TranscriptRecord['message']>['usage']): number {
  if (!usage) return 0;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return n(usage.input_tokens) + n(usage.cache_read_input_tokens) + n(usage.cache_creation_input_tokens);
}

/** Registros de um JSONL; linhas vazias ou inválidas (arquivo cortado no meio de uma gravação) são puladas. */
function parseJsonl(text: string): TranscriptRecord[] {
  const out: TranscriptRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line) as unknown;
      if (data && typeof data === 'object' && !Array.isArray(data)) out.push(data as TranscriptRecord);
    } catch {
      // linha incompleta
    }
  }
  return out;
}

/** `cwd` do primeiro registro que o tem, lendo só o começo do arquivo. */
function firstCwd(file: string): string | null {
  const fd = openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const bytes = readSync(fd, buffer, 0, buffer.length, 0);
    const record = parseJsonl(buffer.toString('utf8', 0, bytes)).find((r) => typeof r.cwd === 'string' && r.cwd);
    return record?.cwd ?? null;
  } finally {
    closeSync(fd);
  }
}

/** Caminho comparável: separador `/`, sem barra final e, no Windows, sem diferença de caixa. */
function samePath(path: string): string {
  const normal = path.replace(/\\/g, '/').replace(/\/+$/, '');
  return process.platform === 'win32' ? normal.toLowerCase() : normal;
}
