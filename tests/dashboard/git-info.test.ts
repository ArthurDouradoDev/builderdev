import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GitError } from '../../src/git/log';
import { gitInfo } from '../../src/dashboard/git-info';
import { git, removeRepo, useIsolatedGit } from '../helpers/repo';

useIsolatedGit();

// Pasta com espaço no nome: o git é chamado sem shell e os caminhos não podem ser divididos.
let base: string;
let repo: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'builderdev git info '));
  repo = join(base, 'meu projeto');
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
});

afterEach(() => {
  removeRepo(base);
});

function commitFile(dir: string, file: string, content: string, subject = `feat: ${file}`): void {
  writeFileSync(join(dir, file), content);
  git(dir, 'add', '--', file);
  git(dir, 'commit', '-q', '-m', subject);
}

describe('gitInfo', { timeout: 30_000 }, () => {
  it('repositório sem commits: sem último commit e sem erro', async () => {
    const info = await gitInfo(repo);
    expect(info).toMatchObject({
      branch: 'main',
      detached: false,
      lastCommit: null,
      behind: null,
      ahead: null,
      commitsLast7Days: 0,
      lastActivity: null,
    });
    expect(info.changes).toEqual({ modified: 0, untracked: 0, oldestMtime: null, newestMtime: null });
  });

  it('último commit, branch e ritmo', async () => {
    commitFile(repo, 'a.txt', '1', 'feat: primeiro');
    commitFile(repo, 'a.txt', '2', 'fix: segundo, com acentuação');
    const info = await gitInfo(repo);
    expect(info.branch).toBe('main');
    expect(info.lastCommit).toMatchObject({ subject: 'fix: segundo, com acentuação', author: 'Teste' });
    expect(info.lastCommit!.hash).toBe(git(repo, 'rev-parse', '--short', 'HEAD').trim());
    expect(Date.parse(info.lastCommit!.date)).not.toBeNaN();
    expect(info.commitsLast7Days).toBe(2);
    expect(info.lastActivity).toBe(info.lastCommit!.date);
  });

  it('HEAD destacado mostra o hash curto', async () => {
    commitFile(repo, 'a.txt', '1');
    commitFile(repo, 'a.txt', '2');
    git(repo, 'checkout', '-q', '--detach', 'HEAD~1');
    const info = await gitInfo(repo);
    expect(info.detached).toBe(true);
    expect(info.branch).toBe(git(repo, 'rev-parse', 'HEAD').trim().slice(0, 7));
  });

  it('conta modificados e não rastreados à parte, inclusive renomeado e caminho com espaço', async () => {
    commitFile(repo, 'a.txt', '1');
    commitFile(repo, 'b.txt', '1');
    commitFile(repo, 'com espaço.txt', '1');
    writeFileSync(join(repo, 'a.txt'), 'mudou');
    writeFileSync(join(repo, 'com espaço.txt'), 'mudou');
    git(repo, 'mv', 'b.txt', 'b renomeado.txt');
    writeFileSync(join(repo, 'novo arquivo.txt'), 'x');
    mkdirSync(join(repo, 'pasta nova'));
    writeFileSync(join(repo, 'pasta nova', 'c.txt'), 'x');

    const old = new Date('2026-01-01T00:00:00.000Z');
    utimesSync(join(repo, 'com espaço.txt'), old, old);

    const { changes, lastActivity, lastCommit } = await gitInfo(repo);
    expect(changes.modified).toBe(3); // a.txt, com espaço.txt, b → b renomeado.txt
    expect(changes.untracked).toBe(2); // novo arquivo.txt, pasta nova/
    expect(changes.oldestMtime).toBe(old.toISOString());
    expect(Date.parse(changes.newestMtime!)).toBeGreaterThan(old.getTime());
    expect(lastActivity).toBe([changes.newestMtime!, lastCommit!.date].sort().at(-1));
  });

  it('arquivo removido entra na contagem sem quebrar a leitura do mtime', async () => {
    commitFile(repo, 'a.txt', '1');
    git(repo, 'rm', '-q', 'a.txt');
    const { changes } = await gitInfo(repo);
    expect(changes).toEqual({ modified: 1, untracked: 0, oldestMtime: null, newestMtime: null });
  });

  // ~16 processos git (clone, fetch, push, commits): no Windows sob carga passa dos 30 s do describe.
  it('upstream local: à frente e atrás pelo último fetch', { timeout: 120_000 }, async () => {
    commitFile(repo, 'a.txt', '1');
    const remote = join(base, 'remoto.git');
    git(base, 'clone', '-q', '--bare', repo, remote);
    git(repo, 'remote', 'add', 'origin', remote);
    git(repo, 'fetch', '-q', 'origin');
    git(repo, 'branch', '-q', '--set-upstream-to=origin/main');
    expect(await gitInfo(repo)).toMatchObject({ ahead: 0, behind: 0 });

    // Outro clone empurra um commit; aqui só aparece depois do fetch.
    const other = join(base, 'outro clone');
    git(base, 'clone', '-q', remote, other);
    commitFile(other, 'b.txt', '1');
    git(other, 'push', '-q', 'origin', 'main');
    expect(await gitInfo(repo)).toMatchObject({ ahead: 0, behind: 0 });
    git(repo, 'fetch', '-q', 'origin');

    commitFile(repo, 'c.txt', '1');
    commitFile(repo, 'd.txt', '1');
    expect(await gitInfo(repo)).toMatchObject({ ahead: 2, behind: 1 });
  });

  it('sem upstream, à frente e atrás ficam null', async () => {
    commitFile(repo, 'a.txt', '1');
    expect(await gitInfo(repo)).toMatchObject({ ahead: null, behind: null });
  });

  it('pasta que não é repositório lança GitError, mesmo dentro de um repositório', async () => {
    const inner = join(repo, 'sub');
    mkdirSync(join(inner, '.git'), { recursive: true }); // .git vazio: o git o ignora e subiria para `repo`
    await expect(gitInfo(inner)).rejects.toBeInstanceOf(GitError);
  });
});
