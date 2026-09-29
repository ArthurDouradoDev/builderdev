import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { git } from './log';

export const HOOK_NAME = 'prepare-commit-msg';
const BEGIN = '# betterdev:inicio';
const END = '# betterdev:fim';
const SHEBANG = '#!/bin/sh';

/**
 * Bloco instalado no hook. Só age se `betterdev` estiver no PATH e nunca bloqueia o commit:
 * ignora a falha do betterdev e devolve o código de saída do que veio antes no arquivo.
 */
export const HOOK_BLOCK = [
  `${BEGIN} · gerado por "betterdev hooks install"; remova com "betterdev hooks uninstall"`,
  'betterdev_status=$?',
  'if command -v betterdev >/dev/null 2>&1; then',
  '  betterdev commit-msg "$1" "$2" || true',
  'fi',
  '(exit "$betterdev_status")',
  END,
].join('\n');

/** Pasta de hooks efetiva do repositório (respeita `core.hooksPath`). O git devolve o caminho relativo a `cwd`. */
export function hooksDir(cwd: string): string {
  return resolve(cwd, git(['rev-parse', '--git-path', 'hooks'], cwd).trim());
}

export interface HookResult {
  action: 'criado' | 'atualizado' | 'inalterado' | 'acrescentado' | 'removido' | 'restaurado' | 'bloco removido' | 'ausente';
  /** Caminho do hook relativo a `cwd`, com `/`. */
  path: string;
  /** Cópia do hook alheio feita antes de acrescentar o bloco. */
  backup?: string;
}

/**
 * Hook ausente: cria. Hook com o bloco do betterdev: atualiza o bloco. Hook de outra ferramenta:
 * salva `<hook>.bak` e acrescenta o bloco no final.
 */
export function installHook(cwd: string): HookResult {
  const dir = hooksDir(cwd);
  const file = join(dir, HOOK_NAME);
  const path = display(cwd, file);

  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, `${SHEBANG}\n${HOOK_BLOCK}\n`);
    chmodSync(file, 0o755);
    return { action: 'criado', path };
  }

  const current = readFileSync(file, 'utf8');
  const block = findBlock(current);
  if (block) {
    const updated = `${current.slice(0, block.start)}${HOOK_BLOCK}${current.slice(block.end)}`;
    if (updated === current) return { action: 'inalterado', path };
    writeFileSync(file, updated);
    return { action: 'atualizado', path };
  }

  const backup = `${file}.bak`;
  copyFileSync(file, backup);
  const separator = current.endsWith('\n') ? '\n' : '\n\n';
  writeFileSync(file, `${current}${separator}${HOOK_BLOCK}\n`);
  return { action: 'acrescentado', path, backup: display(cwd, backup) };
}

/**
 * Remove só o bloco do betterdev. Se o hook era só o bloco, apaga o arquivo; se sobra exatamente
 * o hook alheio guardado no `.bak`, restaura-o byte a byte e apaga a cópia.
 */
export function uninstallHook(cwd: string): HookResult {
  const file = join(hooksDir(cwd), HOOK_NAME);
  const path = display(cwd, file);
  if (!existsSync(file)) return { action: 'ausente', path };

  const current = readFileSync(file, 'utf8');
  const block = findBlock(current);
  if (!block) return { action: 'ausente', path };

  let before = current.slice(0, block.start);
  // Linha em branco que o install põe entre o hook alheio e o bloco.
  if (before.endsWith('\n\n')) before = before.slice(0, -1);
  const after = current.slice(block.end).replace(/^\r?\n/, '');
  const rest = before + after;

  const backup = `${file}.bak`;
  if (existsSync(backup)) {
    const original = readFileSync(backup, 'utf8');
    if (rest === original || rest === `${original}\n`) {
      writeFileSync(file, original);
      rmSync(backup);
      return { action: 'restaurado', path };
    }
  }
  if (rest.trim() === '' || rest.trim() === SHEBANG) {
    rmSync(file);
    return { action: 'removido', path };
  }
  writeFileSync(file, rest);
  return { action: 'bloco removido', path };
}

/** Intervalo do bloco no texto: do início da linha `# betterdev:inicio` até o fim da linha `# betterdev:fim`. */
function findBlock(text: string): { start: number; end: number } | null {
  const begin = new RegExp(`^${BEGIN}.*$`, 'm').exec(text);
  if (!begin) return null;
  const endMatch = new RegExp(`^${END}[ \\t]*\\r?$`, 'm').exec(text.slice(begin.index));
  // Sem a linha de fim, o bloco vai até o final do arquivo.
  const end = endMatch ? begin.index + endMatch.index + endMatch[0].replace(/\r$/, '').length : text.replace(/\s+$/, '').length;
  return { start: begin.index, end };
}

function display(cwd: string, file: string): string {
  return relative(cwd, file).split(sep).join('/');
}
