import { stringify } from 'yaml';
import { findPhase, planPhases, type PlanEntry } from './find';
import { flattenSections, type Plan } from './parse';

const PLAN_SECTIONS = ['Contexto', 'Fora do escopo'];

/**
 * Só o que a IA precisa para trabalhar numa fase: `Contexto` e `Fora do escopo` do plano,
 * a entrada da fase no YAML e o bloco `## fN` do corpo. O texto das outras fases fica de fora.
 */
export function brief(entry: PlanEntry & { plan: Plan }, phaseId: string): string {
  const { plan } = entry;
  const phase = findPhase(entry, phaseId);
  const slice = (from: number, to: number) => plan.lines.slice(from - 1, to).join('\n');

  const planTitle = typeof plan.frontmatter.title === 'string' ? plan.frontmatter.title.trim() : entry.id;
  const out = [`# ${planTitle} · ${entry.id}/${phase.id}`, `Plano: ${entry.path}`];

  const level2 = flattenSections(plan.sections).filter((s) => s.level === 2);
  for (const name of PLAN_SECTIONS) {
    const section = level2.find((s) => s.title.trim().toLowerCase() === name.toLowerCase());
    if (section) out.push('', slice(section.line, section.endLine));
  }

  out.push('', '## Entrada no YAML', '', '```yaml', yamlEntry(plan, phase.id), '```');

  const body = plan.bodyPhases.find((b) => b.id === phase.id);
  out.push('', body ? slice(body.line, body.endLine) : `(sem "## ${phase.id} · ..." no corpo do plano)`);
  return `${out.join('\n')}\n`;
}

/**
 * Texto original do item da fase em `phases:`, com comentários, sem a indentação da lista.
 * O item vai da linha do `-` até a próxima linha com indentação igual ou menor.
 */
function yamlEntry(plan: Plan, phaseId: string): string {
  const phase = planPhases(plan).find((p) => p.id === phaseId)!;
  const start = phase.yaml.line - 1;
  const first = plan.lines[start] ?? '';
  const dash = /^(\s*)-\s/.exec(first);
  // Lista em estilo de fluxo (`phases: [{...}]`): não há linhas próprias para copiar.
  if (!dash) return stringify([phase.yaml.data]).trimEnd();

  const indent = dash[1]!.length;
  const closeIndex = plan.bodyStartLine - 2; // linha do '---' que fecha o frontmatter
  const lines = [first];
  for (let i = start + 1; i < closeIndex; i++) {
    const line = plan.lines[i] ?? '';
    if (line.trim() && line.length - line.trimStart().length <= indent) break;
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1]!.trim()) lines.pop();
  return lines.map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length))).join('\n');
}
