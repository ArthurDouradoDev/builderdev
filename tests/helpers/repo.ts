import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll } from 'vitest';

const GIT_ENV_KEYS = [
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
  'GIT_EDITOR',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
];

/**
 * Isola o git dos testes da configuração da máquina (hooks globais, assinatura, autocrlf, editor).
 * O código testado chama o git herdando `process.env`, por isso o isolamento é no ambiente do processo.
 */
export function useIsolatedGit(): void {
  const saved: Record<string, string | undefined> = {};
  let dir = '';
  beforeAll(() => {
    for (const key of GIT_ENV_KEYS) saved[key] = process.env[key];
    dir = mkdtempSync(join(tmpdir(), 'betterdev-gitconfig-'));
    const config = join(dir, 'gitconfig');
    writeFileSync(config, '');
    delete process.env.GIT_DIR;
    delete process.env.GIT_WORK_TREE;
    delete process.env.GIT_INDEX_FILE;
    Object.assign(process.env, {
      GIT_CONFIG_GLOBAL: config,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Teste',
      GIT_AUTHOR_EMAIL: 'teste@example.com',
      GIT_COMMITTER_NAME: 'Teste',
      GIT_COMMITTER_EMAIL: 'teste@example.com',
      GIT_EDITOR: 'true',
    });
  });
  afterAll(() => {
    for (const key of GIT_ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    rmSync(dir, { recursive: true, force: true });
  });
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Repositório novo, na branch `main`, sem commits. */
export function makeRepo(prefix = 'betterdev-repo-'): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  git(root, 'init', '-q', '-b', 'main');
  return root;
}

export function removeRepo(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

/** Commit vazio com um trailer `Plan-Step` por referência. Devolve o hash. */
export function commit(root: string, subject: string, ...refs: string[]): string {
  git(root, 'commit', '-q', '--allow-empty', '-m', subject, ...refs.flatMap((r) => ['--trailer', `Plan-Step: ${r}`]));
  return git(root, 'rev-parse', 'HEAD').trim();
}

export interface PhaseSpec {
  id: string;
  title?: string;
  needs?: string[];
  commitMsg?: string;
}

/** Plano válido para o `betterdev lint`. Cada fase tem a frase "Texto exclusivo da <id>" no corpo. */
export function planSource(id: string, phases: PhaseSpec[]): string {
  const title = (p: PhaseSpec) => p.title ?? `Fase ${p.id}`;
  const yaml = phases.flatMap((p) => [
    `  - id: ${p.id}`,
    `    title: ${title(p)}`,
    ...(p.needs ? [`    needs: [${p.needs.join(', ')}]`] : []),
    `    files: [src/${p.id}.ts]`,
    `    verify: ["npm test -- ${p.id}"]`,
    `    commit_msg: "${p.commitMsg ?? `feat: entrega da ${p.id}`}"`,
  ]);
  const body = phases.flatMap((p) => [
    `## ${p.id} · ${title(p)}`,
    '',
    '### Objetivo',
    '',
    `Texto exclusivo da ${p.id}.`,
    '',
    '### Escopo',
    '',
    '#### Código',
    '',
    `- \`src/${p.id}.ts\``,
    '',
    '### Validação visual',
    '',
    `- Conferir a ${p.id}.`,
    '',
  ]);
  return [
    '---',
    `id: ${id}`,
    `title: Plano ${id}`,
    'phases:',
    ...yaml,
    '---',
    '',
    `# Plano ${id}`,
    '',
    '## Contexto',
    '',
    `Contexto do plano ${id}.`,
    '',
    '## Fora do escopo',
    '',
    '- O que fica para depois.',
    '',
    ...body,
  ].join('\n');
}

export function writePlan(root: string, id: string, source: string): string {
  const dir = join(root, '.dev/plans');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${id}.md`);
  writeFileSync(file, source);
  return file;
}
