import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_DIRS = ['.dev', '.dev/plans', '.dev/memory', '.dev/errors', '.dev/templates', '.dev/.local'];
const LOCAL_IGNORE = '.dev/.local/';

/** Pasta `templates/` do plugin. Vale tanto para `src/init.ts` quanto para o `dist/cli.js` gerado. */
export function pluginTemplatesDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
}

/**
 * Cria a estrutura `.dev/` em `root`. Idempotente: não sobrescreve nada que já exista
 * e não toca no CLAUDE.md. Devolve uma linha por mudança feita.
 */
export function init(root: string, templatesDir = pluginTemplatesDir()): string[] {
  const actions: string[] = [];

  for (const dir of DEV_DIRS) {
    const path = join(root, dir);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
      actions.push(`criado      ${dir}/`);
    }
  }

  const template = join(root, '.dev/templates/plan.md');
  if (!existsSync(template)) {
    copyFileSync(join(templatesDir, 'plan.md'), template, constants.COPYFILE_EXCL);
    actions.push('criado      .dev/templates/plan.md');
  }

  const gitignore = join(root, '.gitignore');
  const current = existsSync(gitignore) ? readFileSync(gitignore, 'utf8') : null;
  const ignored = (current ?? '')
    .split(/\r?\n/)
    .some((l) => ['.dev/.local/', '.dev/.local', '/.dev/.local/', '/.dev/.local'].includes(l.trim()));
  if (!ignored) {
    const prefix = current && !current.endsWith('\n') ? '\n' : '';
    writeFileSync(gitignore, `${current ?? ''}${prefix}${LOCAL_IGNORE}\n`);
    actions.push(`${current === null ? 'criado    ' : 'atualizado'}  .gitignore (${LOCAL_IGNORE})`);
  }

  return actions;
}
