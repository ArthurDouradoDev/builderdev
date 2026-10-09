import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_DIRS = ['.dev', '.dev/plans', '.dev/memory', '.dev/errors', '.dev/templates', '.dev/.local'];
/** Estado local e índices gerados pelo `builderdev reindex`: nunca vão para o git. */
const IGNORED = ['.dev/.local/', '.dev/memory/index.md', '.dev/errors/index.md'];

/** Pasta `templates/` do plugin. Vale tanto para `src/init.ts` quanto para o `dist/cli.js` gerado. */
export function pluginTemplatesDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
}

/**
 * Cria a estrutura `.dev/` em `root`. Idempotente: não sobrescreve nada que já exista
 * e não toca no CLAUDE.md. Garante no `.gitignore` as regras de `IGNORED`. Devolve uma linha por mudança feita.
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
  const existing = new Set((current ?? '').split(/\r?\n/).map((l) => l.trim().replace(/^\//, '').replace(/\/$/, '')));
  const missing = IGNORED.filter((rule) => !existing.has(rule.replace(/\/$/, '')));
  if (missing.length) {
    const eol = current?.includes('\r\n') ? '\r\n' : '\n';
    const prefix = current && !current.endsWith('\n') ? eol : '';
    writeFileSync(gitignore, `${current ?? ''}${prefix}${missing.map((rule) => `${rule}${eol}`).join('')}`);
    actions.push(`${current === null ? 'criado    ' : 'atualizado'}  .gitignore (${missing.join(', ')})`);
  }

  return actions;
}
