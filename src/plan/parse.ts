import { readFileSync } from 'node:fs';
import { LineCounter, isMap, isScalar, isSeq, parseDocument, type Node } from 'yaml';

/** Erro de leitura do plano (frontmatter ausente ou inválido). `line` é 1-based no arquivo. */
export class PlanParseError extends Error {
  constructor(message: string, readonly line: number) {
    super(message);
    this.name = 'PlanParseError';
  }
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

/** Trecho do corpo sob um título, da linha do título até a última linha não vazia antes do próximo título de nível igual ou maior. */
export interface Section {
  level: number;
  title: string;
  line: number;
  endLine: number;
  children: Section[];
}

/** Uma entrada de `phases` no YAML, sem validação: o lint decide o que está errado. */
export interface YamlPhase {
  /** Linha do item no arquivo. */
  line: number;
  /** Conteúdo do item; vazio se o item não for um mapeamento. */
  data: Record<string, unknown>;
  isMapping: boolean;
  /** Linha de cada chave presente no item. */
  fieldLines: Record<string, number>;
}

/** Um bloco `## fN · título` do corpo. */
export interface BodyPhase {
  id: string;
  title: string;
  line: number;
  endLine: number;
  sections: Section[];
}

export interface Plan {
  lines: string[];
  frontmatter: Record<string, unknown>;
  /** Linha de cada chave de primeiro nível do frontmatter. */
  frontmatterLines: Record<string, number>;
  /** Primeira linha depois do `---` que fecha o frontmatter. */
  bodyStartLine: number;
  phases: YamlPhase[];
  headings: Heading[];
  /** Árvore de seções do corpo (títulos `#` a `####`). */
  sections: Section[];
  bodyPhases: BodyPhase[];
}

const HEADING = /^ {0,3}(#{1,4})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const PHASE_TITLE = /^(f\d+)\s+·\s+(.+)$/;

export function readPlan(path: string): Plan {
  return parsePlan(readFileSync(path, 'utf8'));
}

export function parsePlan(source: string): Plan {
  const lines = source.replace(/^﻿/, '').split(/\r?\n/);
  const { frontmatter, frontmatterLines, phases, closeIndex } = parseFrontmatter(lines);
  const bodyStartLine = closeIndex + 2;
  const headings = findHeadings(lines, closeIndex + 1);
  const sections = buildSections(headings, lines);
  return {
    lines,
    frontmatter,
    frontmatterLines,
    bodyStartLine,
    phases,
    headings,
    sections,
    bodyPhases: findBodyPhases(sections),
  };
}

/** Percorre a árvore de seções em profundidade. */
export function flattenSections(sections: Section[]): Section[] {
  return sections.flatMap((s) => [s, ...flattenSections(s.children)]);
}

function parseFrontmatter(lines: string[]) {
  if (lines[0]?.trim() !== '---') {
    throw new PlanParseError("frontmatter ausente: o plano deve começar com uma linha '---' seguida do YAML", 1);
  }
  const closeIndex = lines.findIndex((l, i) => i > 0 && (l.trim() === '---' || l.trim() === '...'));
  if (closeIndex < 0) {
    throw new PlanParseError("frontmatter sem fechamento: falta a linha '---' que encerra o YAML", 1);
  }

  const lineCounter = new LineCounter();
  const doc = parseDocument(lines.slice(1, closeIndex).join('\n'), { lineCounter });
  // O YAML começa na linha 2 do arquivo.
  const fileLine = (offset: number) => lineCounter.linePos(offset).line + 1;

  const firstError = doc.errors[0];
  if (firstError) {
    // A mensagem do yaml cita linha e coluna relativas ao bloco YAML; a linha do arquivo vai em `line`.
    const reason = (firstError.message.split('\n')[0] ?? '').replace(/ at line \d+, column \d+:?$/, '');
    throw new PlanParseError(`frontmatter inválido: ${reason}`, fileLine(firstError.pos[0]));
  }
  if (!isMap(doc.contents)) {
    throw new PlanParseError('frontmatter inválido: o YAML deve ser um mapeamento (chave: valor)', 2);
  }

  const frontmatter = doc.toJS() as Record<string, unknown>;
  const frontmatterLines = keyLines(doc.contents.items, fileLine);
  const phasesNode = doc.get('phases', true);
  const phases: YamlPhase[] = isSeq(phasesNode)
    ? phasesNode.items.map((item) => toYamlPhase(item as Node, fileLine))
    : [];
  return { frontmatter, frontmatterLines, phases, closeIndex };
}

function toYamlPhase(node: Node, fileLine: (offset: number) => number): YamlPhase {
  const line = node.range ? fileLine(node.range[0]) : 0;
  if (!isMap(node)) return { line, data: {}, isMapping: false, fieldLines: {} };
  return {
    line,
    data: node.toJSON() as Record<string, unknown>,
    isMapping: true,
    fieldLines: keyLines(node.items, fileLine),
  };
}

function keyLines(
  pairs: Array<{ key: unknown }>,
  fileLine: (offset: number) => number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { key } of pairs) {
    if (isScalar(key) && key.range) out[String(key.value)] = fileLine(key.range[0]);
  }
  return out;
}

/** Títulos `#` a `####` a partir de `startIndex`, ignorando o que está dentro de blocos de código. */
function findHeadings(lines: string[], startIndex: number): Heading[] {
  const headings: Heading[] = [];
  let fence: string | null = null;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      // O bloco fecha com o mesmo caractere, pelo menos o mesmo comprimento e nada depois.
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      continue;
    }
    const m = HEADING.exec(line);
    if (m?.[1]) headings.push({ level: m[1].length, text: (m[2] ?? '').trim(), line: i + 1 });
  }
  return headings;
}

function buildSections(headings: Heading[], lines: string[]): Section[] {
  const roots: Section[] = [];
  const stack: Section[] = [];
  headings.forEach((h, i) => {
    const next = headings.slice(i + 1).find((o) => o.level <= h.level);
    let endLine = next ? next.line - 1 : lines.length;
    while (endLine > h.line && (lines[endLine - 1] ?? '').trim() === '') endLine--;

    const section: Section = { level: h.level, title: h.text, line: h.line, endLine, children: [] };
    while (stack.length && (stack[stack.length - 1]?.level ?? 0) >= h.level) stack.pop();
    const parent = stack[stack.length - 1];
    (parent ? parent.children : roots).push(section);
    stack.push(section);
  });
  return roots;
}

function findBodyPhases(sections: Section[]): BodyPhase[] {
  const phases: BodyPhase[] = [];
  for (const s of flattenSections(sections)) {
    if (s.level !== 2) continue;
    const m = PHASE_TITLE.exec(s.title);
    if (m?.[1] && m[2]) {
      phases.push({ id: m[1], title: m[2].trim(), line: s.line, endLine: s.endLine, sections: s.children });
    }
  }
  return phases;
}
