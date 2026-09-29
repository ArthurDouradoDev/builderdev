import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TRAILER_KEY, git } from './git/log';
import { findPhase, findPlan, findProjectRoot } from './plan/find';
import { readState } from './state';

export interface CommitMsgResult {
  action: 'ignorado' | 'preenchido' | 'trailer' | 'inalterado';
  reason?: string;
}

/** Estados em que o git reaproveita commits existentes; o trailer da fase ativa não pertence a eles. */
const REPLAY_STATE = ['rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'];

/**
 * `betterdev commit-msg <arquivo> [origem]`, chamado pelo `prepare-commit-msg`.
 * Sem fase ativa, em merge ou squash, não faz nada. Mensagem vazia recebe o `commit_msg` da fase;
 * em todos os casos tratados, o trailer `Plan-Step: <plano>/<fase>` entra uma vez só.
 */
export function prepareCommitMsg(file: string, source?: string, cwd = process.cwd()): CommitMsgResult {
  if (source === 'merge' || source === 'squash') return { action: 'ignorado', reason: source };

  const root = findProjectRoot(cwd);
  const state = readState(root);
  if (!state) return { action: 'ignorado', reason: 'nenhuma fase ativa' };

  const gitDir = git(['rev-parse', '--absolute-git-dir'], cwd).trim();
  const replay = REPLAY_STATE.find((name) => existsSync(join(gitDir, name)));
  if (replay) return { action: 'ignorado', reason: replay };

  const entry = findPlan(root, state.plan);
  const phase = findPhase(entry, state.phase);
  const path = resolve(cwd, file);
  const original = readFileSync(path, 'utf8');

  let filled = false;
  const commitMsg = phase.yaml.data.commit_msg;
  if (typeof commitMsg === 'string' && commitMsg.trim() && isEmptyMessage(original, commentPrefix(cwd))) {
    const rest = original.startsWith('\n') || original === '' ? original : `\n${original}`;
    writeFileSync(path, `${commitMsg.trim()}\n${rest}`);
    filled = true;
  }

  git(['interpret-trailers', '--in-place', '--if-exists', 'doNothing', '--trailer', `${TRAILER_KEY}: ${entry.id}/${phase.id}`, path], cwd);

  if (filled) return { action: 'preenchido' };
  return readFileSync(path, 'utf8') === original ? { action: 'inalterado' } : { action: 'trailer' };
}

/** Sem nenhuma linha além de brancas e comentários do git, até a linha de tesoura do `commit -v`. */
function isEmptyMessage(text: string, comment: string): boolean {
  const lines = text.split(/\r?\n/);
  const scissors = lines.findIndex((line) => line === `${comment} ------------------------ >8 ------------------------`);
  return lines.slice(0, scissors < 0 ? undefined : scissors).every((line) => line.trim() === '' || line.startsWith(comment));
}

/** Prefixo de comentário das mensagens (`core.commentString`, `core.commentChar`; padrão `#`). */
function commentPrefix(cwd: string): string {
  for (const key of ['core.commentString', 'core.commentChar']) {
    try {
      const value = git(['config', '--get', key], cwd).replace(/\r?\n$/, '');
      if (value && value !== 'auto') return value;
    } catch {
      // chave ausente: git config sai com 1
    }
  }
  return '#';
}
