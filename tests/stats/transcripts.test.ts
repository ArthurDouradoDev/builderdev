import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  estimateCompactions,
  findTranscriptDirs,
  projectSessions,
  projectSlug,
  readSession,
} from '../../src/stats/transcripts';

const FIXTURES = fileURLToPath(new URL('../fixtures/transcripts/', import.meta.url));
const fixture = (name: string) => join(FIXTURES, `${name}.jsonl`);

let tmp: string;
let project: string;
let projectsDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'betterdev-stats-'));
  project = join(tmp, 'Meu Projeto');
  projectsDir = join(tmp, 'claude', 'projects');
  mkdirSync(project);
  mkdirSync(projectsDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

/** Copia os históricos sintéticos para a pasta de `project`, com a primeira letra em minúscula, como o `c--` dos reais. */
function installFixtures(): string {
  const slug = projectSlug(project);
  const dir = join(projectsDir, slug[0]!.toLowerCase() + slug.slice(1));
  cpSync(FIXTURES, dir, { recursive: true });
  return dir;
}

const sessionRecord = (cwd: string) =>
  `${JSON.stringify({ type: 'user', isSidechain: false, cwd, sessionId: 'x', timestamp: '2026-09-10T15:00:00.000Z', message: { role: 'user', content: 'oi' } })}\n`;

describe('projectSlug', () => {
  it('troca :, \\ e / por hífen num caminho Windows', () => {
    expect(projectSlug('C:\\Users\\awx1530897\\Desktop\\Projetos\\MDT')).toBe('C--Users-awx1530897-Desktop-Projetos-MDT');
    expect(projectSlug('c:/Users/awx1530897/Desktop/Projetos/MDT')).toBe('c--Users-awx1530897-Desktop-Projetos-MDT');
  });

  it('troca também espaço, ponto e sublinhado, como o Claude Code', () => {
    expect(projectSlug('/home/ana/meu projeto/app_v1.2')).toBe('-home-ana-meu-projeto-app-v1-2');
  });
});

describe('findTranscriptDirs', () => {
  it('acha a pasta pelo slug sem diferenciar caixa (a letra do drive aparece como C-- ou c--)', () => {
    const slug = projectSlug(project);
    const lower = join(projectsDir, slug.toLowerCase());
    mkdirSync(lower);
    mkdirSync(join(projectsDir, `${slug}-outro`));
    writeFileSync(join(projectsDir, 'arquivo-solto.json'), '{}');

    expect(findTranscriptDirs(project, projectsDir)).toEqual([lower]);
  });

  it('sem pasta pelo slug, acha as pastas cujos registros têm o cwd do projeto', () => {
    const renamed = join(projectsDir, 'nome-diferente');
    const other = join(projectsDir, 'outro-projeto');
    mkdirSync(renamed);
    mkdirSync(other);
    writeFileSync(join(renamed, 'a.jsonl'), sessionRecord(`${project}/`));
    writeFileSync(join(other, 'b.jsonl'), sessionRecord(join(tmp, 'outro')));

    expect(findTranscriptDirs(project, projectsDir)).toEqual([renamed]);
  });

  it('devolve lista vazia sem históricos', () => {
    expect(findTranscriptDirs(project, projectsDir)).toEqual([]);
    expect(findTranscriptDirs(project, join(tmp, 'nao-existe'))).toEqual([]);
  });
});

describe('readSession', () => {
  it('soma input, cache lido e cache criado da primeira resposta e conta as tool calls até a primeira edição', () => {
    const s = readSession(fixture('sessao-basica'));
    expect(s).toMatchObject({
      id: 'sessao-basica',
      start: '2026-09-10T15:00:00.000Z',
      end: '2026-09-10T15:42:00.000Z',
      durationMs: 42 * 60_000,
      // A resposta sintética de erro da API vem antes e não conta como primeira resposta.
      openingTokens: 38_412,
      toolCallsBeforeEdit: 3,
      toolCalls: 5,
      estimatedCompactions: 0,
    });
  });

  it('ignora os registros de subagente na abertura, nas tool calls e na duração', () => {
    expect(readSession(fixture('sessao-subagente'))).toMatchObject({
      openingTokens: 30_000,
      toolCallsBeforeEdit: 1,
      toolCalls: 2,
      durationMs: 20 * 60_000,
    });
  });

  it('sessão sem edição tem toolCallsBeforeEdit nulo', () => {
    expect(readSession(fixture('sessao-sem-edicao'))).toMatchObject({ openingTokens: 3180, toolCallsBeforeEdit: null, toolCalls: 2 });
  });

  it('estima compactação por queda de mais de 50% no contexto entre turnos seguidos', () => {
    expect(readSession(fixture('sessao-compactada'))).toMatchObject({ estimatedCompactions: 2, toolCallsBeforeEdit: 0, toolCalls: 7 });
    expect(estimateCompactions([100, 51, 25, 25, 100, 49])).toBe(2);
    expect(estimateCompactions([100])).toBe(0);
  });

  it('sessão sem resposta do modelo é nula', () => {
    expect(readSession(fixture('sessao-vazia'))).toBeNull();
  });
});

describe('projectSessions', () => {
  it('lê as sessões em ordem de início e conta as vazias à parte', () => {
    const dir = installFixtures();
    const result = projectSessions(project, projectsDir);

    expect(result.dirs).toEqual([dir]);
    expect(result.empty).toBe(1);
    expect(result.sessions.map((s) => s.id)).toEqual(['sessao-basica', 'sessao-subagente', 'sessao-sem-edicao', 'sessao-compactada']);
    expect(result.sessions.every((s) => s.compactionsEstimated)).toBe(true);
    expect(result.sessions.find((s) => s.id === 'sessao-compactada')).toMatchObject({ compactions: 2, compactionsEstimated: true });
  });

  it('usa as compactações do metrics.jsonl nas sessões que o hook acompanhou', () => {
    installFixtures();
    mkdirSync(join(project, '.dev/.local'), { recursive: true });
    const metrics = [
      { evento: 'session-start', source: 'startup', caracteres: 900, session_id: 'sessao-compactada' },
      { evento: 'compact', trigger: 'auto', session_id: 'sessao-compactada' },
      { evento: 'session-start', source: 'compact', caracteres: 900, session_id: 'sessao-compactada' },
      { evento: 'session-start', source: 'startup', caracteres: 900, session_id: 'sessao-sem-edicao' },
      { evento: 'verify', fase: 'p/f1', resultado: 'aprovado' },
    ];
    writeFileSync(join(project, '.dev/.local/metrics.jsonl'), `${metrics.map((m) => JSON.stringify(m)).join('\n')}\n{cortado\n`);

    const byId = Object.fromEntries(projectSessions(project, projectsDir).sessions.map((s) => [s.id, s]));
    expect(byId['sessao-compactada']).toMatchObject({ compactions: 1, compactionsEstimated: false });
    expect(byId['sessao-sem-edicao']).toMatchObject({ compactions: 0, compactionsEstimated: false });
    expect(byId['sessao-basica']).toMatchObject({ compactions: 0, compactionsEstimated: true });
  });
});
