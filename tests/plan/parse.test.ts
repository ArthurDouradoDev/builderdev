import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PlanParseError, parsePlan, readPlan } from '../../src/plan/parse';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/plans/${name}`, import.meta.url));

describe('parsePlan', () => {
  it('lê um plano de uma fase', () => {
    const plan = readPlan(fixture('single-phase.md'));

    expect(plan.frontmatter.id).toBe('renomear-rotas');
    expect(plan.phases).toHaveLength(1);
    expect(plan.phases[0]!.data).toMatchObject({
      id: 'f1',
      title: 'Rotas com prefixo /v2',
      files: ['api/routes/'],
      verify: ['pytest tests/api -q'],
      commit_msg: 'refactor: rotas de análise sob /v2',
    });
    expect(plan.phases[0]!.line).toBe(7);
    expect(plan.phases[0]!.fieldLines.commit_msg).toBe(11);

    expect(plan.bodyPhases).toHaveLength(1);
    const f1 = plan.bodyPhases[0]!;
    expect(f1).toMatchObject({ id: 'f1', title: 'Rotas com prefixo /v2', line: 20, endLine: 34 });
    expect(f1.sections.map((s) => [s.title, s.line, s.endLine])).toEqual([
      ['Objetivo', 22, 24],
      ['Escopo', 26, 30],
      ['Validação visual', 32, 34],
    ]);
    expect(f1.sections[1]!.children.map((s) => s.title)).toEqual(['Código']);
  });

  it('lê um plano de três fases com needs', () => {
    const plan = readPlan(fixture('valid.md'));

    expect(plan.phases.map((p) => p.data.id)).toEqual(['f1', 'f2', 'f3']);
    expect(plan.phases.map((p) => p.data.needs)).toEqual([undefined, undefined, ['f1']]);
    expect(plan.bodyPhases.map((b) => [b.id, b.title])).toEqual([
      ['f1', 'Máscara de edificações no viewshed'],
      ['f2', 'Endpoint de diff A/B'],
      ['f3', 'Legenda de edificações no globo'],
    ]);
    // Cada fase termina antes da próxima começar.
    const [f1, f2, f3] = plan.bodyPhases;
    expect(f1!.endLine).toBeLessThan(f2!.line);
    expect(f2!.endLine).toBeLessThan(f3!.line);
    expect(f3!.endLine).toBe(plan.lines.length - 1); // a última linha do arquivo é vazia
  });

  it('ignora títulos dentro de blocos de código', () => {
    const plan = readPlan(fixture('valid.md'));

    expect(plan.headings.some((h) => h.text.includes('f9'))).toBe(false);
    expect(plan.bodyPhases.map((b) => b.id)).not.toContain('f9');
  });

  it('respeita cercas com ~~~ e cercas mais longas', () => {
    const source = [
      '---',
      'id: x',
      '---',
      '````md',
      '```',
      '## dentro',
      '```',
      '````',
      '~~~',
      '# dentro também',
      '~~~',
      '## fora',
    ].join('\n');

    expect(parsePlan(source).headings).toEqual([{ level: 2, text: 'fora', line: 12 }]);
  });

  it('acusa frontmatter ausente com erro claro', () => {
    const run = () => readPlan(fixture('no-frontmatter.md'));

    expect(run).toThrow(PlanParseError);
    expect(run).toThrow(/frontmatter ausente/);
  });

  it('acusa frontmatter sem fechamento', () => {
    expect(() => parsePlan('---\nid: x\n\n# Título\n')).toThrow(/sem fechamento/);
  });

  it('acusa YAML inválido apontando a linha no arquivo', () => {
    let error: unknown;
    try {
      readPlan(fixture('invalid-frontmatter.md'));
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(PlanParseError);
    expect((error as PlanParseError).message).toMatch(/^frontmatter inválido: /);
    expect((error as PlanParseError).message).not.toMatch(/at line/);
    const line = (error as PlanParseError).line;
    expect(line).toBeGreaterThanOrEqual(7);
    expect(line).toBeLessThanOrEqual(10);
  });

  it('acusa frontmatter que não é um mapeamento', () => {
    expect(() => parsePlan('---\n- a\n- b\n---\n')).toThrow(/mapeamento/);
  });

  it('aceita BOM e quebras de linha CRLF', () => {
    const source = readFileSync(fixture('single-phase.md'), 'utf8').replace(/\n/g, '\r\n');
    const plan = parsePlan(`﻿${source}`);

    expect(plan.frontmatter.id).toBe('renomear-rotas');
    expect(plan.bodyPhases[0]!.title).toBe('Rotas com prefixo /v2');
  });
});
