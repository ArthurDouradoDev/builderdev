import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readConfig } from '../config';
import { findPhase, findPlan } from '../plan/find';
import { readState } from '../state';
import { appendMetric, textList, type HookInput } from './common';

export const VERIFY_DIR = '.dev/.local/verify';
/** Impressão digital da última verificação aprovada, por `plano/fase`. */
export const VERIFY_STATE_FILE = '.dev/.local/verify-state.json';
export const FAILURE_LINES_MAX = 30;
/** Tempo total dos comandos; abaixo dos 300 s do hook, para sobrar tempo de responder em vez de ser cortado. */
export const VERIFY_BUDGET_MS = 280_000;

const FAILURE_LINE = /erro|fail|falh|✗|×|assert|exception|traceback|panic|\bTS\d{4}\b|ERR!|expected|received|esperad|\.(?:test|spec)\.[cm]?[jt]sx?:\d+/i;
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const LINE_MAX = 300;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

export type StopAction = 'ignorado' | 'sem-mudanca' | 'aprovado' | 'falhou';

export interface StopResult {
  action: StopAction;
  reason?: string;
  /** Log da verificação, relativo à raiz. */
  log?: string;
  /** JSON que o hook imprime no stdout; só existe quando a verificação falha. */
  output?: { hookSpecificOutput: { hookEventName: 'Stop'; additionalContext: string } };
}

export interface StopOptions {
  now?: Date;
  budgetMs?: number;
}

/**
 * Hook `Stop`: roda o `verify` da fase ativa quando os arquivos dela mudaram desde a última verificação aprovada.
 * Falha vira `additionalContext` com o comando, as linhas de falha e o log; sucesso é silencioso.
 */
export function stopHook(root: string, input: HookInput, { now = new Date(), budgetMs = VERIFY_BUDGET_MS }: StopOptions = {}): StopResult {
  const state = readState(root);
  if (!state) return { action: 'ignorado', reason: 'nenhuma fase ativa' };
  if (input.stop_hook_active === true) return { action: 'ignorado', reason: 'stop_hook_active' };
  if (!readConfig(root).verifyOnStop) return { action: 'ignorado', reason: 'verifyOnStop desligado' };

  let ref: string;
  let phaseId: string;
  let files: string[];
  let verify: string[];
  try {
    const entry = findPlan(root, state.plan);
    const phase = findPhase(entry, state.phase);
    ref = `${entry.id}/${phase.id}`;
    phaseId = phase.id;
    files = textList(phase.yaml.data.files);
    verify = textList(phase.yaml.data.verify);
  } catch (err) {
    return { action: 'ignorado', reason: (err as Error).message };
  }
  if (!verify.length) return { action: 'ignorado', reason: 'a fase não tem verify' };

  const approved = readApproved(root);
  if (approved[ref]?.fingerprint === phaseFingerprint(root, files, verify)) {
    appendMetric(root, { evento: 'verify', fase: ref, resultado: 'sem-mudanca' }, now);
    return { action: 'sem-mudanca' };
  }

  const log = logPath(root, now);
  const run = runVerify(root, log, verify, budgetMs);
  if (!run.failed) {
    // Calculada depois: comandos que reescrevem arquivos (build, formatador) não forçam outra rodada.
    approved[ref] = { fingerprint: phaseFingerprint(root, files, verify), at: now.toISOString() };
    writeApproved(root, approved);
    appendMetric(root, { evento: 'verify', fase: ref, resultado: 'aprovado', duracao_ms: run.durationMs, log }, now);
    return { action: 'aprovado', log };
  }

  const { command, output, timedOut } = run.failed;
  appendMetric(root, { evento: 'verify', fase: ref, resultado: 'falhou', comando: command, duracao_ms: run.durationMs, log }, now);
  const { lines, hidden } = failureLines(output);
  const context = [
    `[betterdev] verificação da fase ${phaseId} falhou${timedOut ? ` (tempo esgotado após ${Math.round(budgetMs / 1000)} s)` : ''}: ${command}`,
    ...lines.map((l) => `  ${l}`),
    ...(hidden ? [`(+${hidden} linhas de falha no log)`] : []),
    `Log completo: ${log}`,
  ].join('\n');
  return { action: 'falhou', log, output: { hookSpecificOutput: { hookEventName: 'Stop', additionalContext: context } } };
}

interface VerifyRun {
  durationMs: number;
  failed?: { command: string; output: string; timedOut: boolean };
}

/** Roda os comandos em sequência, na raiz, até o primeiro que falha. stdout e stderr vão juntos para o log. */
function runVerify(root: string, log: string, commands: string[], budgetMs: number): VerifyRun {
  const file = join(root, log);
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'a');
  const started = Date.now();
  try {
    writeSync(fd, `# betterdev verify · ${new Date(started).toISOString()}\n`);
    for (const command of commands) {
      writeSync(fd, `\n$ ${command}\n`);
      const offset = statSync(file).size;
      const remaining = budgetMs - (Date.now() - started);
      const r =
        remaining > 0
          ? spawnSync(command, {
              cwd: root,
              shell: true,
              stdio: ['ignore', fd, fd],
              timeout: remaining,
              windowsHide: true,
              env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
            })
          : null;
      const timedOut = !r || (r.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
      const ok = !!r && !r.error && r.status === 0;
      writeSync(fd, `[${timedOut ? 'tempo esgotado' : `saiu com ${r?.status ?? r?.signal ?? r?.error?.message}`}]\n`);
      if (!ok) {
        const output = readFileSync(file).subarray(offset).toString('utf8');
        return { durationMs: Date.now() - started, failed: { command, output, timedOut } };
      }
    }
    return { durationMs: Date.now() - started };
  } finally {
    closeSync(fd);
  }
}

/** Até `FAILURE_LINES_MAX` linhas que parecem erro ou falha, sem repetição; sem nenhuma, as últimas 10 linhas. */
export function failureLines(output: string): { lines: string[]; hidden: number } {
  const all = output
    .replace(ANSI, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() && !/^\[(?:saiu com|tempo esgotado)/.test(l));
  const matched = [...new Set(all.filter((l) => FAILURE_LINE.test(l)))];
  const picked = matched.length ? matched : all.slice(-10);
  const clip = (l: string) => (l.length > LINE_MAX ? `${l.slice(0, LINE_MAX - 1)}…` : l);
  return { lines: picked.slice(0, FAILURE_LINES_MAX).map(clip), hidden: Math.max(0, picked.length - FAILURE_LINES_MAX) };
}

/**
 * Hash do conteúdo dos arquivos de `files` (arquivos, pastas e globs com `*`, `**` e `?`) e dos comandos de `verify`.
 * Arquivo ausente também entra, para que criá-lo mude a impressão digital.
 */
export function phaseFingerprint(root: string, files: string[], verify: string[]): string {
  const hash = createHash('sha256');
  hash.update(`${JSON.stringify(verify)}\n`);
  for (const [rel, abs] of expandFiles(root, files)) {
    hash.update(`${rel}\0${abs ? createHash('sha256').update(readFileSync(abs)).digest('hex') : 'ausente'}\n`);
  }
  return hash.digest('hex');
}

/** Caminho relativo (com `/`) → absoluto, ou `null` quando o padrão não existe. Ordenado. */
function expandFiles(root: string, patterns: string[]): Array<[string, string | null]> {
  const found = new Map<string, string | null>();
  for (const raw of patterns) {
    const pattern = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    const globAt = pattern.search(/[*?[]/);
    if (globAt >= 0) {
      const base = pattern.slice(0, pattern.lastIndexOf('/', globAt) + 1);
      const re = globRegex(pattern);
      for (const rel of walk(root, base)) if (re.test(rel)) found.set(rel, join(root, rel));
      continue;
    }
    const abs = join(root, pattern);
    if (!existsSync(abs)) found.set(pattern.replace(/\/$/, ''), null);
    else if (statSync(abs).isDirectory()) for (const rel of walk(root, pattern)) found.set(rel, join(root, rel));
    else found.set(pattern, abs);
  }
  return [...found].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Arquivos sob `dir` (relativo à raiz), recursivamente, sem `.git` e `node_modules`. */
function walk(root: string, dir: string): string[] {
  const prefix = dir && !dir.endsWith('/') ? `${dir}/` : dir;
  const abs = join(root, prefix);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(root, rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function globRegex(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '*' && pattern[i + 1] === '*') {
      const slash = pattern[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

interface Approved {
  fingerprint: string;
  at: string;
}

function readApproved(root: string): Record<string, Approved> {
  try {
    const data = JSON.parse(readFileSync(join(root, VERIFY_STATE_FILE), 'utf8')) as unknown;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, Approved>) : {};
  } catch {
    return {};
  }
}

function writeApproved(root: string, approved: Record<string, Approved>): void {
  const file = join(root, VERIFY_STATE_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(approved, null, 2)}\n`);
}

/** `.dev/.local/verify/<data-hora local>.log`, com sufixo se já existir um no mesmo segundo. */
function logPath(root: string, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  for (let n = 1; ; n++) {
    const rel = `${VERIFY_DIR}/${stamp}${n > 1 ? `-${n}` : ''}.log`;
    if (!existsSync(join(root, rel))) return rel;
  }
}
