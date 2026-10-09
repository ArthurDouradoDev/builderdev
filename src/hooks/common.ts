import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findProjectRoot } from '../plan/find';

/** Campos que o Claude Code manda no stdin de todo hook, mais os de cada evento que usamos. */
export interface HookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  /** SessionStart: startup | resume | clear | compact | fork. */
  source?: string;
  /** Stop: verdadeiro quando o turno já continua por causa de um hook Stop. */
  stop_hook_active?: boolean;
  /** PostCompact: manual | auto. */
  trigger?: string;
  hookSpecificOutput?: { trigger?: string };
}

export const METRICS_FILE = '.dev/.local/metrics.jsonl';

/** JSON do stdin, com ou sem BOM. Entrada vazia ou inválida vira `{}`: o hook nunca falha por causa dela. */
export function parseHookInput(text: string): HookInput {
  const json = text.replace(/^﻿/, '');
  if (!json.trim()) return {};
  try {
    const data = JSON.parse(json) as unknown;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as HookInput) : {};
  } catch {
    return {};
  }
}

/**
 * Raiz do projeto BuilderDev da sessão, ou `null` fora de um.
 * Usa o `cwd` da entrada (que acompanha a sessão em worktrees e subpastas), subindo até achar `.dev/`;
 * só sem ele recorre a `CLAUDE_PROJECT_DIR` e à pasta atual.
 */
export function hookProjectRoot(input: HookInput, env: NodeJS.ProcessEnv = process.env): string | null {
  const start = input.cwd || env.CLAUDE_PROJECT_DIR || process.cwd();
  const root = findProjectRoot(start);
  const dev = join(root, '.dev');
  return existsSync(dev) && statSync(dev).isDirectory() ? root : null;
}

/** `files` ou `verify` do YAML como lista de textos; um texto solto vira lista de um item. */
export function textList(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()) : [];
}

/** Acrescenta uma linha a `.dev/.local/metrics.jsonl`, com `ts` no fim. */
export function appendMetric(root: string, record: Record<string, unknown>, now = new Date()): void {
  const file = join(root, METRICS_FILE);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ ...record, ts: now.toISOString() })}\n`);
}
