import { readFileSync } from 'node:fs';
import { PlanParseError, flattenSections, parsePlan, type BodyPhase, type Plan, type Section } from './parse';

export type Severity = 'erro' | 'aviso';

export interface Problem {
  line: number;
  severity: Severity;
  code: string;
  message: string;
}

export const COMMIT_TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'style', 'build', 'ci'];
const COMMIT_MSG = new RegExp(`^(${COMMIT_TYPES.join('|')}): \\S`);
const PHASE_ID = /^f\d+$/;
const OBJECTIVE_MAX_LINES = 3;

export function lintPlanFile(path: string): Problem[] {
  return lintPlanSource(readFileSync(path, 'utf8'));
}

export function lintPlanSource(source: string): Problem[] {
  try {
    return lintPlan(parsePlan(source));
  } catch (err) {
    if (err instanceof PlanParseError) {
      return [{ line: err.line, severity: 'erro', code: 'frontmatter-invalid', message: err.message }];
    }
    throw err;
  }
}

export function lintPlan(plan: Plan): Problem[] {
  const problems: Problem[] = [];
  const error = (line: number, code: string, message: string) =>
    problems.push({ line, severity: 'erro', code, message });
  const warn = (line: number, code: string, message: string) =>
    problems.push({ line, severity: 'aviso', code, message });

  const fm = plan.frontmatter;
  for (const field of ['id', 'title']) {
    if (!nonEmptyString(fm[field])) error(plan.frontmatterLines[field] ?? 1, 'plan-field-missing', `campo "${field}" ausente ou vazio no frontmatter`);
  }

  const topSections = flattenSections(plan.sections).filter((s) => s.level === 2);
  if (!topSections.some((s) => sameTitle(s.title, 'Contexto'))) {
    const h1 = plan.headings.find((h) => h.level === 1);
    error(h1?.line ?? plan.bodyStartLine, 'section-missing', 'falta a seção "## Contexto"');
  }

  if (!Array.isArray(fm.phases) || fm.phases.length === 0) {
    error(plan.frontmatterLines.phases ?? 1, 'phases-missing', '"phases" deve ser uma lista com pelo menos uma fase (f1)');
  }

  // Fases do YAML: ids, campos e dependências.
  const yamlIds = new Map<string, number>(); // id -> índice da primeira ocorrência
  plan.phases.forEach((p, index) => {
    if (!p.isMapping) {
      error(p.line, 'phase-invalid', `a fase na posição ${index + 1} não é um mapeamento (id, title, files...)`);
      return;
    }
    const at = (field: string) => p.fieldLines[field] ?? p.line;
    const id = p.data.id;
    if (typeof id !== 'string' || !PHASE_ID.test(id)) {
      const shown = id === undefined ? 'sem id' : `id "${String(id)}"`;
      error(at('id'), 'phase-id-format', `fase na posição ${index + 1} com ${shown}: use o formato f<número> (f1, f2...)`);
    } else if (yamlIds.has(id)) {
      error(at('id'), 'phase-id-duplicate', `id "${id}" repetido no YAML`);
    } else {
      yamlIds.set(id, index);
    }
    const label = typeof id === 'string' ? id : `fase ${index + 1}`;

    if (!nonEmptyString(p.data.title)) error(at('title'), 'phase-title-missing', `${label} sem "title"`);
    for (const field of ['files', 'verify'] as const) {
      const value = p.data[field];
      if (!Array.isArray(value) || value.length === 0) {
        error(at(field), `${field}-empty`, `${label}: "${field}" deve ser uma lista não vazia`);
      } else if (!value.every(nonEmptyString)) {
        error(at(field), `${field}-empty`, `${label}: "${field}" tem item vazio ou que não é texto`);
      }
    }
    const msg = p.data.commit_msg;
    if (typeof msg !== 'string' || !COMMIT_MSG.test(msg)) {
      const shown = msg === undefined ? 'ausente' : `"${String(msg)}"`;
      error(at('commit_msg'), 'commit-msg-format', `${label}: commit_msg ${shown} fora do formato "tipo: texto" (tipo: ${COMMIT_TYPES.join('|')})`);
    }
    if (p.data.needs !== undefined && !(Array.isArray(p.data.needs) && p.data.needs.every((n) => typeof n === 'string'))) {
      error(at('needs'), 'needs-invalid', `${label}: "needs" deve ser uma lista de ids, ex.: [f1]`);
    }
  });

  const validPhases = [...yamlIds].map(([id, index]) => ({ id, phase: plan.phases[index]! }));
  for (const { id, phase } of validPhases) {
    const needs = phase.data.needs;
    if (!Array.isArray(needs)) continue;
    for (const dep of needs) {
      if (typeof dep === 'string' && !yamlIds.has(dep)) {
        error(phase.fieldLines.needs ?? phase.line, 'needs-unknown', `${id} depende de "${dep}", que não existe`);
      }
    }
  }
  for (const cycle of findCycles(validPhases.map(({ id, phase }) => ({ id, needs: phase.data.needs })))) {
    const first = validPhases.find((v) => v.id === cycle[0])!;
    error(first.phase.fieldLines.needs ?? first.phase.line, 'needs-cycle', `ciclo de dependências: ${cycle.join(' → ')}`);
  }

  // Correspondência YAML ↔ corpo.
  const bodyById = new Map<string, BodyPhase>();
  for (const b of plan.bodyPhases) {
    if (bodyById.has(b.id)) {
      error(b.line, 'phase-body-duplicate', `"## ${b.id} · ..." aparece mais de uma vez no corpo`);
      continue;
    }
    bodyById.set(b.id, b);
    if (!yamlIds.has(b.id)) {
      error(b.line, 'phase-missing-yaml', `"## ${b.id} · ${b.title}" não tem fase correspondente no YAML`);
    }
  }
  for (const { id, phase } of validPhases) {
    const body = bodyById.get(id);
    const title = phase.data.title;
    if (!body) {
      error(phase.line, 'phase-missing-body', `${id} está no YAML mas não tem "## ${id} · ${nonEmptyString(title) ? title : '<título>'}" no corpo`);
    } else if (nonEmptyString(title) && body.title !== title.trim()) {
      error(body.line, 'phase-title-mismatch', `"## ${id} · ${body.title}" difere do YAML "${title.trim()}"`);
    }
  }

  // Seções obrigatórias de cada fase do corpo.
  for (const b of bodyById.values()) {
    const find = (sections: Section[], level: number, title: string) =>
      sections.find((s) => s.level === level && sameTitle(s.title, title));
    const objetivo = find(b.sections, 3, 'Objetivo');
    const escopo = find(b.sections, 3, 'Escopo');
    if (!objetivo) error(b.line, 'section-missing', `${b.id} sem "### Objetivo"`);
    if (!escopo) error(b.line, 'section-missing', `${b.id} sem "### Escopo"`);
    else if (!find(escopo.children, 4, 'Código')) error(escopo.line, 'section-missing', `${b.id} sem "#### Código" dentro de "### Escopo"`);
    if (!find(b.sections, 3, 'Validação visual')) error(b.line, 'section-missing', `${b.id} sem "### Validação visual"`);

    if (objetivo) {
      const count = textLines(plan.lines, objetivo);
      if (count > OBJECTIVE_MAX_LINES) {
        warn(objetivo.line, 'objective-too-long', `Objetivo da ${b.id} tem ${count} linhas (máximo ${OBJECTIVE_MAX_LINES})`);
      }
    }
  }

  return problems.sort((a, b) => a.line - b.line);
}

/** Linhas de texto de uma seção até o primeiro subtítulo, sem linhas vazias nem comentários HTML. */
function textLines(lines: string[], section: Section): number {
  const end = section.children[0] ? section.children[0].line - 1 : section.endLine;
  const text = lines.slice(section.line, end).join('\n').replace(/<!--[\s\S]*?-->/g, '');
  return text.split('\n').filter((l) => l.trim() !== '').length;
}

/**
 * Ciclos no grafo de dependências efetivo: `needs` quando declarado, senão a fase anterior.
 * Cada ciclo sai uma vez, começando pelo id que aparece primeiro no YAML e repetindo-o no fim.
 */
export function findCycles(phases: Array<{ id: string; needs: unknown }>): string[][] {
  const ids = phases.map((p) => p.id);
  const deps = new Map<string, string[]>();
  phases.forEach((p, i) => {
    const explicit = Array.isArray(p.needs) ? p.needs.filter((n): n is string => typeof n === 'string' && ids.includes(n)) : null;
    deps.set(p.id, explicit ?? (i > 0 ? [ids[i - 1]!] : []));
  });

  const cycles: string[][] = [];
  const seen = new Set<string>();
  const state = new Map<string, 'visiting' | 'done'>();
  const path: string[] = [];
  const visit = (id: string) => {
    state.set(id, 'visiting');
    path.push(id);
    for (const dep of deps.get(id) ?? []) {
      if (state.get(dep) === 'visiting') {
        const cycle = path.slice(path.indexOf(dep));
        const start = cycle.reduce((best, c) => (ids.indexOf(c) < ids.indexOf(best) ? c : best));
        const rotated = [...cycle.slice(cycle.indexOf(start)), ...cycle.slice(0, cycle.indexOf(start))];
        const key = rotated.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push([...rotated, start]);
        }
      } else if (!state.has(dep)) {
        visit(dep);
      }
    }
    path.pop();
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  return cycles;
}

export interface FileReport {
  file: string;
  problems: Problem[];
}

/** Uma linha por problema, colunas alinhadas, e a linha de resumo no fim. */
export function formatReport(reports: FileReport[]): string {
  const rows = reports.flatMap((r) => r.problems.map((p) => ({ loc: `${r.file}:${p.line}`, ...p })));
  const locWidth = Math.max(0, ...rows.map((r) => r.loc.length));
  const codeWidth = Math.max(20, ...rows.map((r) => r.code.length));
  const out = rows.map(
    (r) => `${r.loc.padEnd(locWidth)}  ${r.severity.padEnd(5)}  ${r.code.padEnd(codeWidth)}  ${r.message}`,
  );
  const errors = rows.filter((r) => r.severity === 'erro').length;
  const warnings = rows.length - errors;
  out.push(`${errors} ${errors === 1 ? 'erro' : 'erros'}, ${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}`);
  return out.join('\n');
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.toLowerCase();
}
