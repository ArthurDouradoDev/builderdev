import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { git, hasCommits } from '../git/log';
import { reindex } from '../memory/reindex';
import { INDEX_FILE, TRACKS, TRACK_DIRS, type Track } from '../memory/schema';
import { findPhase, findPlan } from '../plan/find';
import type { Plan } from '../plan/parse';
import { readState } from '../state';
import { appendMetric, textList, type HookInput } from './common';

/** Teto do contexto injetado, em caracteres. */
export const CONTEXT_MAX = 8000;
export const DIFF_MAX_LINES = 10;

const INDEX_LABELS: Record<Track, string> = { conhecimento: 'Memória', bug: 'Erros' };

export interface SessionStartResult {
  context: string;
  /** JSON que o hook imprime no stdout. */
  output: { hookSpecificOutput: { hookEventName: 'SessionStart'; additionalContext: string } };
}

/**
 * Hook `SessionStart` (início, retomada, `/clear` e compactação): regenera os índices e devolve
 * o estado do projeto para o Claude Code injetar na sessão. Cada injeção vai para `metrics.jsonl`.
 */
export function sessionStart(root: string, input: HookInput, now = new Date()): SessionStartResult {
  try {
    reindex(root);
  } catch {
    // Um índice que não pôde ser regenerado não impede a sessão; o que estiver em disco é injetado.
  }
  const context = buildContext(root);
  appendMetric(root, { evento: 'session-start', source: input.source ?? null, caracteres: context.length, session_id: input.session_id ?? null }, now);
  return { context, output: { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } } };
}

/** Bloco que pode perder linhas do fim para caber no teto; o marcador diz quantas e onde ver. */
interface CuttableBlock {
  title: string;
  lines: string[];
  shown: number;
  source: string;
}

/**
 * Branch, fase ativa, últimos commits, `git diff --stat` e os dois índices, em até `CONTEXT_MAX` caracteres.
 * Ao passar do teto, corta primeiro o diff e depois o índice mais longo, linha a linha a partir do fim.
 */
export function buildContext(root: string): string {
  const head = [...phaseLines(root)];

  const commits = gitLines(root, ['log', '--oneline', '-5']);
  if (commits.length) head.push('Últimos commits:', ...commits.map((l) => `  ${l}`));

  const diff = diffStat(root);
  const diffBlock: CuttableBlock | null = diff.length
    ? { title: 'Mudanças não commitadas (git diff --stat):', lines: diff, shown: diff.length, source: 'git diff --stat' }
    : null;
  const indexBlocks = TRACKS.flatMap((track) => {
    const block = indexBlock(root, track);
    return block ? [block] : [];
  });

  const blocks = [...(diffBlock ? [diffBlock] : []), ...indexBlocks];
  const render = () => [...head, ...blocks.flatMap(renderBlock)].join('\n');

  // Ordem de corte: o diff; depois os índices, do mais longo ao mais curto.
  const byLength = [...indexBlocks].sort((a, b) => renderBlock(b).join('\n').length - renderBlock(a).join('\n').length);
  for (const block of [...(diffBlock ? [diffBlock] : []), ...byLength]) {
    while (block.shown > 0 && render().length > CONTEXT_MAX) block.shown--;
  }

  const text = render();
  if (text.length <= CONTEXT_MAX) return text;
  // Só o cabeçalho já passa do teto (objetivo ou lista de arquivos enormes).
  const marker = '\n[cortado: betterdev brief]';
  return text.slice(0, CONTEXT_MAX - marker.length) + marker;
}

function renderBlock(block: CuttableBlock): string[] {
  const hidden = block.lines.length - block.shown;
  return [block.title, ...block.lines.slice(0, block.shown), ...(hidden > 0 ? [`  [+${hidden} linhas: ${block.source}]`] : [])];
}

/** Primeira linha (branch e fase ativa) e, com fase ativa, objetivo, arquivos e verificação. */
function phaseLines(root: string): string[] {
  const branch = currentBranch(root);
  const prefix = `[betterdev] ${branch ? `branch ${branch} · ` : ''}`;
  const state = readState(root);
  if (!state) return [`${prefix}nenhuma fase ativa (planos: betterdev status)`];

  const ref = `${state.plan}/${state.phase}`;
  try {
    const entry = findPlan(root, state.plan);
    const phase = findPhase(entry, state.phase);
    const lines = [`${prefix}fase ativa ${ref} - ${phase.title}`];
    const objective = phaseObjective(entry.plan, phase.id);
    if (objective) lines.push(`Objetivo: ${objective}`);
    const files = textList(phase.yaml.data.files);
    if (files.length) lines.push(`Arquivos: ${files.join(', ')}`);
    const verify = textList(phase.yaml.data.verify);
    if (verify.length) lines.push(`Verificação: ${verify.join(' · ')}`);
    lines.push('Detalhes da fase: betterdev brief');
    return lines;
  } catch (err) {
    return [`${prefix}fase ativa ${ref} não pôde ser lida: ${(err as Error).message} (betterdev stop limpa)`];
  }
}

/** Texto da seção `### Objetivo` da fase, em uma linha. */
export function phaseObjective(plan: Plan, phaseId: string): string {
  const body = plan.bodyPhases.find((b) => b.id === phaseId);
  const section = body?.sections.find((s) => s.level === 3 && s.title.trim().toLowerCase() === 'objetivo');
  if (!section) return '';
  return plan.lines
    .slice(section.line, section.endLine)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
}

function currentBranch(root: string): string | null {
  const branch = gitLines(root, ['branch', '--show-current'])[0];
  if (branch) return branch;
  const head = gitLines(root, ['rev-parse', '--short', 'HEAD'])[0];
  return head ? `(HEAD destacado em ${head})` : null;
}

/** `git diff --stat` contra HEAD (preparado e não preparado), resumido a `DIFF_MAX_LINES` linhas. */
function diffStat(root: string): string[] {
  if (!hasCommits(root)) return [];
  const lines = gitLines(root, ['diff', 'HEAD', '--stat=100', '--stat-graph-width=20']);
  if (lines.length <= DIFF_MAX_LINES) return lines;
  // Os primeiros arquivos e a linha de totais ("N files changed, ...").
  return [...lines.slice(0, DIFF_MAX_LINES - 1), lines[lines.length - 1]!];
}

/** Linhas de entrada do `index.md` da trilha, sob um título com a contagem. `null` sem índice. */
function indexBlock(root: string, track: Track): CuttableBlock | null {
  const path = `${TRACK_DIRS[track]}/${INDEX_FILE}`;
  const file = join(root, path);
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('- '));
  const count = `${lines.length} ${lines.length === 1 ? 'entrada' : 'entradas'}`;
  return { title: `${INDEX_LABELS[track]} (${count}, ${path}):`, lines, shown: lines.length, source: 'betterdev reindex' };
}

/** Linhas não vazias do stdout do git; vazio fora de um repositório ou se o comando falhar. */
function gitLines(root: string, args: string[]): string[] {
  try {
    return git(args, root)
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter(Boolean);
  } catch {
    return [];
  }
}
