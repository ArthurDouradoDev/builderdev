import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classify, scanRoot } from '../../src/dashboard/scan';
import { git, makeRepo, removeRepo, useIsolatedGit } from '../helpers/repo';

useIsolatedGit();

// A própria raiz é um repositório: um projeto com .git quebrado não pode herdar os dados dela.
let root: string;

beforeEach(() => {
  root = makeRepo('builderdev-scan-');
});

afterEach(() => {
  removeRepo(root);
});

function repoAt(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'a.txt'), '1');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-q', '-m', `feat: início de ${name}`);
  return dir;
}

describe('scanRoot', { timeout: 30_000 }, () => {
  it('classifica as pastas de primeiro nível e ignora ocultas e node_modules', async () => {
    mkdirSync(join(root, 'comum'));
    writeFileSync(join(root, 'comum', 'notas.txt'), 'x');
    repoAt('repo');
    const bd = repoAt('com builderdev');
    mkdirSync(join(bd, '.dev', 'plans'), { recursive: true });
    mkdirSync(join(root, '.oculta'));
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'arquivo-solto.txt'), 'x');

    const scan = await scanRoot(root);
    expect(scan.root).toBe(root);
    expect(scan.durationMs).toBeGreaterThanOrEqual(0);
    expect(Date.parse(scan.scannedAt)).not.toBeNaN();
    const kinds = Object.fromEntries(scan.projects.map((p) => [p.name, p.kind]));
    expect(kinds).toEqual({ comum: 'sem-git', repo: 'git', 'com builderdev': 'builderdev' });

    const repo = scan.projects.find((p) => p.name === 'repo')!;
    expect(repo.error).toBeNull();
    expect(repo.path).toBe(join(root, 'repo'));
    expect(repo.git?.lastCommit?.subject).toBe('feat: início de repo');
    expect(repo.lastActivity).toBe(repo.git?.lastActivity);

    const comum = scan.projects.find((p) => p.name === 'comum')!;
    expect(comum.git).toBeNull();
    expect(comum.lastActivity).not.toBeNull();
    expect(comum.alerts.map((a) => a.code)).toEqual(['sem-git']);
  });

  it('pasta sem git: última atividade é o mtime mais recente das entradas', async () => {
    const dir = join(root, 'comum');
    mkdirSync(dir);
    const recent = new Date('2026-05-02T00:00:00.000Z');
    const older = new Date('2026-01-01T00:00:00.000Z');
    writeFileSync(join(dir, 'a.txt'), 'x');
    writeFileSync(join(dir, 'b.txt'), 'x');
    utimesSync(join(dir, 'a.txt'), older, older);
    utimesSync(join(dir, 'b.txt'), recent, recent);
    utimesSync(dir, older, older);

    const scan = await scanRoot(root, () => new Date('2026-10-09T00:00:00.000Z'));
    const comum = scan.projects[0]!;
    expect(comum.lastActivity).toBe(recent.toISOString());
    expect(comum.alerts.map((a) => a.code)).toEqual(['sem-git', 'parado']);
  });

  it('repositório corrompido vira card com erro sem derrubar a varredura', async () => {
    repoAt('bom');
    mkdirSync(join(root, 'quebrado', '.git'), { recursive: true });
    mkdirSync(join(root, 'gitfile'));
    writeFileSync(join(root, 'gitfile', '.git'), 'gitdir: ./nao-existe\n');

    const scan = await scanRoot(root);
    const byName = Object.fromEntries(scan.projects.map((p) => [p.name, p]));
    expect(byName.bom!.error).toBeNull();
    for (const name of ['quebrado', 'gitfile']) {
      expect(byName[name]!.kind).toBe('git');
      expect(byName[name]!.git).toBeNull();
      expect(byName[name]!.error).toMatch(/^git rev-parse: /);
    }
  });

  it('ordena: atenção primeiro, depois pela atividade mais recente', async () => {
    const a = repoAt('antigo');
    const b = repoAt('recente');
    repoAt('pendente');
    process.env.GIT_COMMITTER_DATE = '2026-01-01T00:00:00Z';
    try {
      git(a, 'commit', '-q', '--amend', '--no-edit');
    } finally {
      delete process.env.GIT_COMMITTER_DATE;
    }
    // Mudança sem commit esquecida há dias: alerta de atenção.
    const stale = new Date(Date.now() - 5 * 24 * 3600_000);
    writeFileSync(join(root, 'pendente', 'a.txt'), 'mudou');
    utimesSync(join(root, 'pendente', 'a.txt'), stale, stale);
    writeFileSync(join(b, 'novo.txt'), 'x');

    const scan = await scanRoot(root);
    expect(scan.projects.map((p) => p.name)).toEqual(['pendente', 'recente', 'antigo']);
  });

  it('raiz vazia devolve lista vazia', async () => {
    const scan = await scanRoot(join(root, '.git', 'refs', 'tags'));
    expect(scan.projects).toEqual([]);
  });
});

describe('classify', () => {
  it('builderdev exige .git e .dev/plans', () => {
    const dir = join(root, 'p');
    mkdirSync(join(dir, '.dev', 'plans'), { recursive: true });
    expect(classify(dir)).toBe('sem-git');
    mkdirSync(join(dir, '.git'));
    expect(classify(dir)).toBe('builderdev');
  });
});
