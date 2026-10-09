import { describe, expect, it } from 'vitest';
import { IDLE_MS, STALE_CHANGES_MS, alertsFor, formatAge } from '../../src/dashboard/alerts';
import type { GitInfo } from '../../src/dashboard/git-info';
import type { Project } from '../../src/dashboard/scan';

const NOW = new Date('2026-10-09T12:00:00.000Z');
const MINUTE = 60_000;
const before = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

function gitWith(over: Partial<GitInfo> = {}, changes: Partial<GitInfo['changes']> = {}): GitInfo {
  return {
    branch: 'main',
    detached: false,
    lastCommit: { hash: 'abc1234', subject: 'feat: x', date: before(MINUTE), author: 'Teste' },
    changes: { modified: 0, untracked: 0, oldestMtime: null, newestMtime: null, ...changes },
    behind: 0,
    ahead: 0,
    commitsLast7Days: 1,
    lastActivity: before(MINUTE),
    ...over,
  };
}

function project(git: GitInfo | null, lastActivity: string | null = before(MINUTE)): Pick<Project, 'kind' | 'git' | 'lastActivity'> {
  return { kind: git ? 'git' : 'sem-git', git, lastActivity };
}

const codes = (p: Pick<Project, 'kind' | 'git' | 'lastActivity'>) => alertsFor(p, NOW).map((a) => a.code);

describe('alertsFor', () => {
  it('projeto em dia não tem alerta', () => {
    expect(codes(project(gitWith()))).toEqual([]);
  });

  it('mudancas-paradas: 2 dias exatos não alerta, 2 dias e 1 min alerta', () => {
    const at = (age: number) => project(gitWith({}, { modified: 1, oldestMtime: before(age), newestMtime: before(MINUTE) }));
    expect(codes(at(STALE_CHANGES_MS))).toEqual([]);
    const alerts = alertsFor(at(STALE_CHANGES_MS + MINUTE), NOW);
    expect(alerts).toEqual([{ code: 'mudancas-paradas', severity: 'atencao', message: 'mudanças sem commit há 2 dias' }]);
  });

  it('atras-do-remoto: atrás 0 não alerta, atrás 1 alerta com atenção', () => {
    expect(codes(project(gitWith({ behind: 0 })))).toEqual([]);
    expect(alertsFor(project(gitWith({ behind: 1 })), NOW)).toEqual([
      { code: 'atras-do-remoto', severity: 'atencao', message: '1 commit atrás do remoto' },
    ]);
  });

  it('sem-push: à frente 0 não alerta, à frente 3 é informativo', () => {
    expect(codes(project(gitWith({ ahead: 0 })))).toEqual([]);
    expect(alertsFor(project(gitWith({ ahead: 3 })), NOW)).toEqual([{ code: 'sem-push', severity: 'info', message: '3 commits sem push' }]);
  });

  it('sem upstream (null) não gera alerta de remoto', () => {
    expect(codes(project(gitWith({ ahead: null, behind: null })))).toEqual([]);
  });

  it('parado: 30 dias exatos não alerta, 30 dias e 1 min alerta', () => {
    expect(codes(project(gitWith(), before(IDLE_MS)))).toEqual([]);
    expect(alertsFor(project(gitWith(), before(IDLE_MS + MINUTE)), NOW)).toEqual([
      { code: 'parado', severity: 'info', message: 'sem atividade há 30 dias' },
    ]);
  });

  it('sem-git: pasta comum, também sujeita a parado', () => {
    expect(codes(project(null))).toEqual(['sem-git']);
    expect(codes(project(null, before(IDLE_MS + MINUTE)))).toEqual(['sem-git', 'parado']);
    expect(codes(project(null, null))).toEqual(['sem-git']);
  });

  it('os de atenção vêm antes dos informativos', () => {
    const git = gitWith({ ahead: 2, behind: 1 }, { modified: 1, oldestMtime: before(STALE_CHANGES_MS * 2), newestMtime: before(MINUTE) });
    expect(codes(project(git, before(IDLE_MS * 2)))).toEqual(['mudancas-paradas', 'atras-do-remoto', 'sem-push', 'parado']);
  });
});

describe('formatAge', () => {
  it('escolhe a unidade pela grandeza', () => {
    expect(formatAge(10_000)).toBe('1 min');
    expect(formatAge(59 * MINUTE)).toBe('59 min');
    expect(formatAge(60 * MINUTE)).toBe('1 h');
    expect(formatAge(24 * 60 * MINUTE)).toBe('1 dia');
    expect(formatAge(45 * 24 * 60 * MINUTE)).toBe('45 dias');
    expect(formatAge(90 * 24 * 60 * MINUTE)).toBe('3 meses');
    expect(formatAge(800 * 24 * 60 * MINUTE)).toBe('2 anos');
  });
});
