import { describe, expect, it } from 'vitest';
import { IDLE_MS, STALE_CHANGES_MS, alertsFor, formatAge } from '../../src/dashboard/alerts';
import type { BuilderdevInfo } from '../../src/dashboard/builderdev';
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

function bdWith(over: Partial<BuilderdevInfo> = {}): BuilderdevInfo {
  return {
    plans: [
      {
        id: 'v2',
        title: 'Plano',
        created: '2026-10-01',
        phases: [
          { id: 'f1', title: 'Um', status: 'concluida', blockedBy: [] },
          { id: 'f2', title: 'Dois', status: 'ativa', blockedBy: [] },
        ],
        done: 1,
        total: 2,
        counts: { concluida: 1, ativa: 1, bloqueada: 0, pendente: 0 },
        lintErrors: 0,
        error: null,
      },
    ],
    currentPlan: 'v2',
    active: { plan: 'v2', phase: 'f2', title: 'Dois', startedAt: before(60 * MINUTE), status: 'ativa', blockedBy: [] },
    next: null,
    lastVerify: { result: 'aprovado', at: before(5 * MINUTE), command: null, durationMs: 1000, log: null },
    memory: { knowledge: 3, bugs: 1, repeated: 0 },
    ...over,
  };
}

const withBd = (bd: BuilderdevInfo) => ({ ...project(gitWith()), kind: 'builderdev' as const, builderdev: bd });

describe('alertsFor com BuilderDev', () => {
  it('projeto BuilderDev em dia não tem alerta', () => {
    expect(alertsFor(withBd(bdWith()), NOW)).toEqual([]);
  });

  it('verify-falhou: o último verify da fase ativa falhou', () => {
    const failed = bdWith({ lastVerify: { result: 'falhou', at: before(5 * MINUTE), command: 'npm test', durationMs: 900, log: 'x.log' } });
    expect(alertsFor(withBd(failed), NOW)).toEqual([
      { code: 'verify-falhou', severity: 'atencao', message: 'verificação da f2 falhou: npm test' },
    ]);
    // sem-mudanca mantém a aprovação anterior; sem fase ativa, não há verify a julgar.
    expect(codes(withBd(bdWith({ lastVerify: { ...failed.lastVerify!, result: 'sem-mudanca' } })))).toEqual([]);
    expect(codes(withBd(bdWith({ active: null, lastVerify: failed.lastVerify })))).toEqual([]);
  });

  it('fase-bloqueada: a fase ativa tem dependência pendente', () => {
    const bd = bdWith();
    bd.active = { ...bd.active!, phase: 'f3', blockedBy: ['f2'] };
    expect(alertsFor(withBd(bd), NOW)).toEqual([{ code: 'fase-bloqueada', severity: 'atencao', message: 'fase ativa f3 bloqueada: aguarda f2' }]);
  });

  it('fase-ativa-concluida: o estado local aponta para fase já concluída', () => {
    const bd = bdWith();
    bd.active = { ...bd.active!, phase: 'f1', status: 'concluida' };
    expect(alertsFor(withBd(bd), NOW)).toEqual([
      { code: 'fase-ativa-concluida', severity: 'info', message: 'a fase ativa f1 já está concluída' },
    ]);
  });

  it('plano-invalido: algum plano tem erro no lint', () => {
    const bd = bdWith();
    bd.plans.push({ ...bd.plans[0]!, id: 'quebrado', phases: [], total: 0, done: 0, lintErrors: 1, error: 'quebrado.md:2: frontmatter inválido' });
    expect(alertsFor(withBd(bd), NOW)).toEqual([{ code: 'plano-invalido', severity: 'atencao', message: 'plano quebrado com 1 erro no lint' }]);
    bd.plans[0]!.lintErrors = 2;
    expect(alertsFor(withBd(bd), NOW)[0]!.message).toBe('planos v2, quebrado com 3 erros no lint');
  });

  it('erro-repetido: há entrada de bug com occurrences > 1', () => {
    expect(alertsFor(withBd(bdWith({ memory: { knowledge: 0, bugs: 2, repeated: 1 } })), NOW)).toEqual([
      { code: 'erro-repetido', severity: 'info', message: '1 erro registrado voltou a acontecer' },
    ]);
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
