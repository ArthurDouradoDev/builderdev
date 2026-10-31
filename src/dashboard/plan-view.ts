import { posix } from 'node:path';
import { git, readPlanSteps } from '../git/log';
import { textList } from '../hooks/common';
import { findPlan, planPhases } from '../plan/find';
import { flattenSections, type Plan, type Section } from '../plan/parse';
import { planStatus, type PhaseStatus } from '../plan/status';
import { readState } from '../state';
import { type VerifyRecord, lastVerify } from './builderdev';

/** Hashes por chamada do `git log --no-walk`, para não estourar o limite da linha de comando do Windows. */
const HASHES_PER_CALL = 200;

export interface CommitRef {
  hash: string;
  short: string;
  subject: string;
  /** Data do commit (ISO), ou vazio quando o hash não está mais no repositório. */
  date: string;
}

export interface PhaseSections {
  objective: string | null;
  code: string | null;
  interface: string | null;
  tests: string | null;
  visualValidation: string | null;
}

export interface PhaseView {
  id: string;
  title: string;
  status: PhaseStatus;
  dependsOn: string[];
  blockedBy: string[];
  files: string[];
  verify: string[];
  commitMsg: string | null;
  /** Markdown cru de cada seção fixa; `null` quando a seção não existe no corpo. */
  sections: PhaseSections;
  /** Seções do corpo da fase fora das fixas (ex.: um `#### Dados` em Escopo), para nada sumir da view. */
  extraSections: Array<{ title: string; markdown: string }>;
  /** Falta o bloco `## fN · ...` no corpo do plano. */
  missingBody: boolean;
  lastVerify: VerifyRecord | null;
  /** Do mais recente ao mais antigo. */
  commits: CommitRef[];
}

export interface OrphanPhase {
  /** `id` da fase que está no trailer mas não no YAML. */
  phase: string;
  commits: CommitRef[];
}

export interface PlanView {
  id: string;
  title: string;
  /** Caminho do plano relativo à raiz do projeto. */
  path: string;
  branch: string | null;
  created: string | null;
  /** Markdown cru das seções do plano, com links relativos já resolvidos para a raiz do projeto. */
  context: string | null;
  outOfScope: string | null;
  constraints: string | null;
  /** Fase ativa deste clone, quando é deste plano. */
  activePhase: string | null;
  done: number;
  total: number;
  phases: PhaseView[];
  orphans: OrphanPhase[];
}

/**
 * Dados da view de fluxo do plano `planId` em `dir`, lidos do arquivo, do git e do `metrics.jsonl` no momento.
 * Plano inexistente ou ilegível lança `ProjectError`.
 */
export function planView(dir: string, planId: string): PlanView {
  const entry = findPlan(dir, planId);
  const { plan } = entry;
  const steps = readPlanSteps(dir);
  const state = readState(dir);
  const status = planStatus(entry, steps, state);
  const yaml = new Map(planPhases(plan).map((p) => [p.id, p.yaml.data]));
  const resolve = (md: string | null) => (md === null ? null : resolveLinks(md, posix.dirname(entry.path)));

  const known = new Set(status.phases.map((p) => p.id));
  const orphanRefs = [...steps.keys()]
    .filter((ref) => ref.startsWith(`${entry.id}/`) && !known.has(ref.slice(entry.id.length + 1)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const hashes = [...status.phases.flatMap((p) => p.commits), ...orphanRefs.flatMap((ref) => steps.get(ref)!)];
  const commits = describeCommits(dir, hashes);
  const refs = (list: string[]) => list.map((h) => commits.get(h) ?? { hash: h, short: h.slice(0, 7), subject: '', date: '' });

  const level2 = flattenSections(plan.sections).filter((s) => s.level === 2);
  const planSection = (name: string) => resolve(sectionText(plan, level2.find((s) => sameTitle(s.title, name))));

  const phases = status.phases.map((p): PhaseView => {
    const data = yaml.get(p.id) ?? {};
    const body = plan.bodyPhases.find((b) => b.id === p.id);
    const { sections, extras } = phaseSections(plan, body?.sections ?? []);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      dependsOn: p.dependsOn,
      blockedBy: p.blockedBy,
      files: textList(data.files),
      verify: textList(data.verify),
      commitMsg: typeof data.commit_msg === 'string' && data.commit_msg.trim() ? data.commit_msg.trim() : null,
      sections: {
        objective: resolve(sections.objective),
        code: resolve(sections.code),
        interface: resolve(sections.interface),
        tests: resolve(sections.tests),
        visualValidation: resolve(sections.visualValidation),
      },
      extraSections: extras.map((x) => ({ title: x.title, markdown: resolve(x.markdown)! })),
      missingBody: !body,
      lastVerify: lastVerify(dir, `${entry.id}/${p.id}`),
      commits: refs(p.commits),
    };
  });

  return {
    id: entry.id,
    title: status.title,
    path: entry.path,
    branch: stringField(plan.frontmatter.branch),
    created: dateField(plan.frontmatter.created),
    context: planSection('Contexto'),
    outOfScope: planSection('Fora do escopo'),
    constraints: planSection('Restrições herdadas'),
    activePhase: state?.plan === entry.id && known.has(state.phase) ? state.phase : null,
    done: phases.filter((p) => p.status === 'concluida').length,
    total: phases.length,
    phases,
    orphans: orphanRefs.map((ref) => ({ phase: ref.slice(entry.id.length + 1), commits: refs(steps.get(ref)!) })),
  };
}

// Títulos das seções fixas de uma fase (CONCEPCAO §6.3). `Código`, `Interface` e `Testes` ficam em `### Escopo`.
const PHASE_SECTIONS = { objective: 'Objetivo', visualValidation: 'Validação visual' } as const;
const SCOPE_SECTIONS = { code: 'Código', interface: 'Interface', tests: 'Testes' } as const;
const SCOPE = 'Escopo';

function phaseSections(plan: Plan, children: Section[]) {
  const sections: PhaseSections = { objective: null, code: null, interface: null, tests: null, visualValidation: null };
  const extras: Array<{ title: string; markdown: string }> = [];
  const take = (table: Record<string, string>, s: Section): boolean => {
    const key = Object.keys(table).find((k) => sameTitle(s.title, table[k]!)) as keyof PhaseSections | undefined;
    if (!key || sections[key] !== null) return false;
    sections[key] = sectionText(plan, s);
    return true;
  };

  for (const s of children) {
    if (sameTitle(s.title, SCOPE)) {
      // Texto solto logo abaixo de "### Escopo", antes do primeiro "####".
      const intro = textBetween(plan, s.line, s.children[0] ? s.children[0].line - 1 : s.endLine);
      if (intro) extras.push({ title: SCOPE, markdown: intro });
      for (const c of s.children) {
        if (!take(SCOPE_SECTIONS, c)) extras.push({ title: c.title, markdown: sectionText(plan, c) ?? '' });
      }
      continue;
    }
    // Aceita `### Testes` (e afins) fora de Escopo também: o plano às vezes sobe o nível.
    if (take(PHASE_SECTIONS, s) || take(SCOPE_SECTIONS, s)) continue;
    extras.push({ title: s.title, markdown: sectionText(plan, s) ?? '' });
  }
  return { sections, extras };
}

/** Corpo da seção, sem o título; `null` para seção ausente. Seção presente e vazia vira texto vazio. */
function sectionText(plan: Plan, section: Section | undefined): string | null {
  if (!section) return null;
  return textBetween(plan, section.line, section.endLine);
}

/** Linhas depois de `afterLine` até `endLine` (1-based, inclusivas), sem comentários HTML nem linhas vazias nas pontas. */
function textBetween(plan: Plan, afterLine: number, endLine: number): string {
  return plan.lines
    .slice(afterLine, endLine)
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\n/, '')
    .trimEnd();
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.toLowerCase();

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LINK = /(!?)\[([^\]\n]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(\s+"[^"]*")?\s*\)/g;

/**
 * Reescreve os links relativos de `md`, escritos a partir de `base` (a pasta do plano), como caminhos a partir da raiz
 * do projeto: `../../CONCEPCAO.md#62` em `.dev/plans` vira `CONCEPCAO.md#62`. Links externos, âncoras, links que
 * saem do projeto e o que está em código ficam como estão.
 */
export function resolveLinks(md: string, base: string): string {
  let fence: string | null = null;
  return md
    .split('\n')
    .map((line) => {
      const m = FENCE.exec(line);
      if (fence) {
        if (m?.[1] && m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1]) fence = null;
        return line;
      }
      if (m?.[1]) {
        fence = m[1];
        return line;
      }
      // Partes pares ficam fora de código inline.
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, i) => (i % 2 ? part : part.replace(LINK, (all, bang: string, text: string, target: string, title = '') => {
          const resolved = resolveTarget(target, base);
          return resolved === null ? all : `${bang}[${text}](${resolved}${title})`;
        })))
        .join('');
    })
    .join('\n');
}

function resolveTarget(target: string, base: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) return null;
  const hashAt = target.indexOf('#');
  const path = hashAt < 0 ? target : target.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : target.slice(hashAt);
  if (!path) return null;
  const joined = posix.normalize(posix.join(base, path));
  if (joined === '..' || joined.startsWith('../')) return null;
  return `${joined}${hash}`;
}

/** Hash curto, assunto e data de cada commit, com um `git log --no-walk` por lote. Hash sumido fica de fora. */
function describeCommits(dir: string, hashes: string[]): Map<string, CommitRef> {
  const unique = [...new Set(hashes)];
  const out = new Map<string, CommitRef>();
  for (let i = 0; i < unique.length; i += HASHES_PER_CALL) {
    const batch = unique.slice(i, i + HASHES_PER_CALL);
    let text: string;
    try {
      text = git(['log', '--no-walk=unsorted', '--format=%H%x1f%h%x1f%s%x1f%cI%x1e', ...batch, '--'], dir);
    } catch {
      // Algum hash sumiu (rebase, gc): um por vez, para salvar os que existem.
      text = batch
        .map((h) => {
          try {
            return git(['log', '-1', '--format=%H%x1f%h%x1f%s%x1f%cI%x1e', h, '--'], dir);
          } catch {
            return '';
          }
        })
        .join('');
    }
    for (const record of text.split('\x1e')) {
      const [hash, short, subject, date] = record.trim().split('\x1f');
      if (hash && short) out.set(hash, { hash, short, subject: subject ?? '', date: date ?? '' });
    }
  }
  return out;
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** O `yaml` deixa datas como texto, mas aceita também `Date` e corta para AAAA-MM-DD. */
function dateField(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return stringField(value);
}
