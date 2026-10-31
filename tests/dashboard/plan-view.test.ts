import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { planView, resolveLinks } from '../../src/dashboard/plan-view';
import { ProjectError } from '../../src/plan/find';
import { commit, git, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

const FIXTURE = fileURLToPath(new URL('../fixtures/dashboard/projeto', import.meta.url));

// Plano com todas as seções fixas na f1, uma seção a mais ("Dados") e só as obrigatórias na f2.
const COMPLETO = `---
id: completo
title: Plano completo
branch: feat/completo
created: 2026-10-01
phases:
  - id: f1
    title: Base
    files: [src/a.ts, tests/a/]
    verify: ["npm test -- a"]
    commit_msg: "feat: base"
  - id: f2
    title: Tela
    needs: [f1]
    files: src/b.ts
    verify: ["npm test -- b", "npm run build"]
    commit_msg: "feat: tela"
---

# Plano completo

## Contexto

Veja [a concepção](../../CONCEPCAO.md#62-arquitetura) e [o site](https://exemplo.com/a(b)).

## Fora do escopo

- Escrita: só leitura.

## Restrições herdadas

- Status derivado ([CONCEPCAO §3.3](../../CONCEPCAO.md#33-status-derivado)).
- Fora do projeto: [x](../../../fora.md), em código: \`[y](../../y.md)\`.

## f1 · Base

### Objetivo

Objetivo da f1.

### Escopo

#### Código

- \`src/a.ts\`

#### Interface

\`\`\`
┌ tela ┐
\`\`\`

#### Testes

- teste da f1

#### Dados

- tabela nova

### Validação visual

- Abrir a tela.
<!-- nota que não aparece -->

## f2 · Tela

### Objetivo

Objetivo da f2.

### Escopo

#### Código

- \`src/b.ts\`

### Validação visual

- Conferir a tela.
`;

// Cópia da fixture da f2 com commits reais: relatorios/f1 concluída (f2 ativa no state.json),
// completo/f1 concluída e commits de fases que não existem no YAML (completo/f9 e relatorios/f7).
let dir: string;
const hashes: Record<string, string> = {};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'builderdev plan view '));
  cpSync(FIXTURE, dir, { recursive: true });
  writePlan(dir, 'completo', COMPLETO);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '.dev/plans');
  git(dir, 'commit', '-q', '-m', 'docs: planos');
  hashes.relatorios = commit(dir, 'feat: coleta dos dados do relatório', 'relatorios/f1');
  hashes.completo = commit(dir, 'feat: base', 'completo/f1');
  hashes.orfa = commit(dir, 'feat: fase que saiu do plano', 'completo/f9');
  hashes.orfaRelatorios = commit(dir, 'fix: outra fase removida', 'relatorios/f7');
}, 60_000);

afterAll(() => {
  removeRepo(dir);
});

describe('planView', { timeout: 30_000 }, () => {
  it('cabeçalho: id, título, branch, created e as seções do plano em markdown cru', () => {
    const view = planView(dir, 'completo');
    expect(view).toMatchObject({
      id: 'completo',
      title: 'Plano completo',
      path: '.dev/plans/completo.md',
      branch: 'feat/completo',
      created: '2026-10-01',
      done: 1,
      total: 2,
      activePhase: null,
    });
    expect(view.outOfScope).toBe('- Escrita: só leitura.');
  });

  it('links relativos são resolvidos para a raiz do projeto; externos, de fora e em código ficam como estão', () => {
    const view = planView(dir, 'completo');
    expect(view.context).toBe('Veja [a concepção](CONCEPCAO.md#62-arquitetura) e [o site](https://exemplo.com/a(b)).');
    expect(view.constraints).toContain('[CONCEPCAO §3.3](CONCEPCAO.md#33-status-derivado)');
    expect(view.constraints).toContain('[x](../../../fora.md)');
    expect(view.constraints).toContain('`[y](../../y.md)`');
    expect(resolveLinks('[a](./b/c.md) [d](#ancora) [e](mailto:x@y.z)', 'docs')).toBe('[a](docs/b/c.md) [d](#ancora) [e](mailto:x@y.z)');
  });

  it('seções extraídas por fase; seção ausente vira null', () => {
    const [f1, f2] = planView(dir, 'completo').phases;
    expect(f1!.sections).toEqual({
      objective: 'Objetivo da f1.',
      code: '- `src/a.ts`',
      interface: '```\n┌ tela ┐\n```',
      tests: '- teste da f1',
      visualValidation: '- Abrir a tela.',
    });
    expect(f1!.extraSections).toEqual([{ title: 'Dados', markdown: '- tabela nova' }]);
    expect(f1!.missingBody).toBe(false);

    expect(f2!.sections).toEqual({
      objective: 'Objetivo da f2.',
      code: '- `src/b.ts`',
      interface: null,
      tests: null,
      visualValidation: '- Conferir a tela.',
    });
    expect(f2!.extraSections).toEqual([]);
  });

  it('campos do YAML de cada fase', () => {
    const [f1, f2] = planView(dir, 'completo').phases;
    expect(f1).toMatchObject({ files: ['src/a.ts', 'tests/a/'], verify: ['npm test -- a'], commitMsg: 'feat: base', dependsOn: [] });
    // `files` como texto solto vira lista de um item.
    expect(f2).toMatchObject({ files: ['src/b.ts'], verify: ['npm test -- b', 'npm run build'], commitMsg: 'feat: tela', dependsOn: ['f1'] });
  });

  it('status e commits com hash curto, assunto e data', () => {
    const view = planView(dir, 'completo');
    const [f1, f2] = view.phases;
    expect(f1!.status).toBe('concluida');
    expect(f1!.commits).toEqual([
      { hash: hashes.completo, short: expect.stringMatching(/^[0-9a-f]{7,}$/), subject: 'feat: base', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) },
    ]);
    expect(hashes.completo!.startsWith(f1!.commits[0]!.short)).toBe(true);
    expect(f2).toMatchObject({ status: 'pendente', blockedBy: [], commits: [] });
  });

  it('fase ativa, bloqueio e último verify vêm do estado e do metrics.jsonl', () => {
    const view = planView(dir, 'relatorios');
    expect(view.activePhase).toBe('f2');
    expect(view.phases.map((p) => [p.id, p.status])).toEqual([
      ['f1', 'concluida'],
      ['f2', 'ativa'],
      ['f3', 'bloqueada'],
      ['f4', 'pendente'],
    ]);
    expect(view.phases[2]).toMatchObject({ dependsOn: ['f2'], blockedBy: ['f2'] });
    expect(view.phases[3]).toMatchObject({ dependsOn: ['f1'], blockedBy: [] });
    expect(view.phases[1]!.lastVerify).toMatchObject({ result: 'aprovado', at: '2026-10-08T11:00:00.000Z' });
    expect(view.phases[0]!.lastVerify).toMatchObject({ result: 'aprovado', at: '2026-10-01T10:00:00.000Z' });
    expect(view.phases[3]!.lastVerify).toBeNull();
    // A fixture não tem Interface nem Testes.
    expect(view.phases[0]!.sections.interface).toBeNull();
    expect(view.phases[0]!.sections.tests).toBeNull();
  });

  it('fase órfã: commit com trailer de uma fase que não está no YAML aparece à parte', () => {
    const view = planView(dir, 'completo');
    expect(view.orphans).toEqual([
      { phase: 'f9', commits: [expect.objectContaining({ hash: hashes.orfa, subject: 'feat: fase que saiu do plano' })] },
    ]);
    expect(view.phases.map((p) => p.id)).toEqual(['f1', 'f2']);
    // Cada plano só vê as próprias órfãs.
    expect(planView(dir, 'relatorios').orphans.map((o) => o.phase)).toEqual(['f7']);
    expect(planView(dir, 'importacao').orphans).toEqual([]);
  });

  it('plano inexistente lança ProjectError com os ids existentes', () => {
    expect(() => planView(dir, 'nao-existe')).toThrow(ProjectError);
    expect(() => planView(dir, 'nao-existe')).toThrow(/completo, importacao, relatorios/);
  });

  it('plano ilegível lança ProjectError', () => {
    const copy = mkdtempSync(join(tmpdir(), 'builderdev plan view quebrado '));
    try {
      cpSync(dir, copy, { recursive: true });
      writePlan(copy, 'quebrado', '---\nid: [quebrado\n---\n');
      expect(() => planView(copy, 'quebrado')).toThrow(ProjectError);
    } finally {
      removeRepo(copy);
    }
  });
});
