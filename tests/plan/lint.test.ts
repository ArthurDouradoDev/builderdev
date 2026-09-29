import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findCycles, formatReport, lintPlanFile, lintPlanSource } from '../../src/plan/lint';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/plans/${name}`, import.meta.url));
const lint = (name: string) => lintPlanFile(fixture(name));
const summary = (name: string) => lint(name).map((p) => [p.line, p.severity, p.code]);

describe('lintPlan', () => {
  it('aceita um plano válido de três fases', () => {
    expect(lint('valid.md')).toEqual([]);
    expect(lint('single-phase.md')).toEqual([]);
  });

  it('aceita o template preenchido com exemplo', () => {
    const template = readFileSync(fileURLToPath(new URL('../../templates/plan.md', import.meta.url)), 'utf8');
    const filled = template.replace('<tipo>', 'feat').replace(/<([^<>!\n]+)>/g, '$1');

    expect(filled).not.toMatch(/<[^!]/);
    expect(lintPlanSource(filled)).toEqual([]);
  });

  it('acusa título de fase divergente, apontando a linha do corpo e os dois títulos', () => {
    expect(lint('title-mismatch.md')).toEqual([
      {
        line: 39,
        severity: 'erro',
        code: 'phase-title-mismatch',
        message: '"## f2 · Endpoint A/B" difere do YAML "Endpoint de diff A/B"',
      },
    ]);
  });

  it('acusa fase do YAML sem corpo', () => {
    const problems = lint('phase-without-body.md');

    expect(summary('phase-without-body.md')).toEqual([[10, 'erro', 'phase-missing-body']]);
    expect(problems[0]!.message).toBe('f2 está no YAML mas não tem "## f2 · Segunda fase" no corpo');
  });

  it('acusa corpo sem fase no YAML', () => {
    expect(summary('body-without-phase.md')).toEqual([[34, 'erro', 'phase-missing-yaml']]);
  });

  it('acusa needs desconhecido e aceita ids não sequenciais', () => {
    const problems = lint('needs-unknown.md');

    expect(summary('needs-unknown.md')).toEqual([[12, 'erro', 'needs-unknown']]);
    expect(problems[0]!.message).toBe('f3 depende de "f9", que não existe');
  });

  it('acusa ciclo, contando a dependência implícita da fase anterior', () => {
    const problems = lint('needs-cycle.md');

    expect(summary('needs-cycle.md')).toEqual([[7, 'erro', 'needs-cycle']]);
    expect(problems[0]!.message).toBe('ciclo de dependências: f1 → f3 → f2 → f1');
  });

  it('acusa commit_msg fora do padrão', () => {
    const problems = lint('commit-msg.md');

    expect(summary('commit-msg.md')).toEqual([[9, 'erro', 'commit-msg-format']]);
    expect(problems[0]!.message).toContain('"Adiciona a primeira fase"');
  });

  it('acusa seções obrigatórias ausentes', () => {
    const problems = lint('section-missing.md');

    expect(summary('section-missing.md')).toEqual([
      [12, 'erro', 'section-missing'],
      [18, 'erro', 'section-missing'],
      [24, 'erro', 'section-missing'],
    ]);
    expect(problems.map((p) => p.message)).toEqual([
      'falta a seção "## Contexto"',
      'f1 sem "### Validação visual"',
      'f1 sem "#### Código" dentro de "### Escopo"',
    ]);
  });

  it('avisa, sem erro, quando o Objetivo passa de 3 linhas', () => {
    expect(lint('objective-too-long.md')).toEqual([
      {
        line: 20,
        severity: 'aviso',
        code: 'objective-too-long',
        message: 'Objetivo da f1 tem 5 linhas (máximo 3)',
      },
    ]);
  });

  it('acusa frontmatter ausente ou inválido como problema, sem lançar exceção', () => {
    expect(summary('no-frontmatter.md')).toEqual([[1, 'erro', 'frontmatter-invalid']]);
    expect(lint('invalid-frontmatter.md')[0]!.code).toBe('frontmatter-invalid');
  });

  it('acusa ids fora do formato ou repetidos e campos vazios', () => {
    const source = `---
id: campos
title: Campos
phases:
  - id: fase1
    title: A
    files: []
    verify: "npm test"
    commit_msg: "feat: a"
  - id: f2
    title: B
    files: [src/b.ts]
    verify: ["npm test"]
    commit_msg: "feat: b"
  - id: f2
    needs: f1
    files: [src/c.ts]
    verify: ["npm test"]
    commit_msg: "feat: c"
  - apenas-texto
---

## Contexto

Vários campos errados.
`;
    expect(lintPlanSource(source).map((p) => [p.line, p.code])).toEqual([
      [5, 'phase-id-format'],
      [7, 'files-empty'],
      [8, 'verify-empty'],
      [10, 'phase-missing-body'],
      [15, 'phase-id-duplicate'],
      [15, 'phase-title-missing'],
      [16, 'needs-invalid'],
      [20, 'phase-invalid'],
    ]);
  });
});

describe('findCycles', () => {
  it('não acusa cadeia linear nem needs paralelo', () => {
    expect(findCycles([{ id: 'f1', needs: undefined }, { id: 'f2', needs: undefined }, { id: 'f3', needs: ['f1'] }])).toEqual([]);
  });

  it('acusa fase que depende de si mesma', () => {
    expect(findCycles([{ id: 'f1', needs: ['f1'] }])).toEqual([['f1', 'f1']]);
  });
});

describe('formatReport', () => {
  it('produz uma linha por problema e o resumo, no formato da interface', () => {
    const text = formatReport([
      {
        file: '.dev/plans/e4.md',
        problems: [
          { line: 34, severity: 'erro', code: 'phase-title-mismatch', message: '"## f2 · Endpoint A/B" difere do YAML "Endpoint de diff A/B"' },
          { line: 12, severity: 'erro', code: 'needs-unknown', message: 'f3 depende de "f9", que não existe' },
          { line: 41, severity: 'aviso', code: 'objective-too-long', message: 'Objetivo da f2 tem 5 linhas (máximo 3)' },
        ],
      },
    ]);

    expect(text).toBe(
      [
        '.dev/plans/e4.md:34  erro   phase-title-mismatch  "## f2 · Endpoint A/B" difere do YAML "Endpoint de diff A/B"',
        '.dev/plans/e4.md:12  erro   needs-unknown         f3 depende de "f9", que não existe',
        '.dev/plans/e4.md:41  aviso  objective-too-long    Objetivo da f2 tem 5 linhas (máximo 3)',
        '2 erros, 1 aviso',
      ].join('\n'),
    );
  });

  it('resume sem problemas', () => {
    expect(formatReport([{ file: 'a.md', problems: [] }])).toBe('0 erros, 0 avisos');
  });
});
