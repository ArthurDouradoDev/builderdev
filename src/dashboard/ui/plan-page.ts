import type { PhaseView, PlanView } from './api';
import { STATUS_LABEL } from './cards';
import { formatDate, h, markdown, plural } from './dom';
import { type GraphView, renderGraph } from './graph';
import { plainInline } from './markdown';
import { commitItem, renderPhasePanel } from './phase-panel';
import { crumbs } from './project-page';
import { routeHash } from './router';

/** "Fora do escopo" aberto ou fechado; vale entre planos e atualizações. */
let scopeOpen = false;

/** Fase aberta quando a URL não diz qual: a ativa, a primeira não concluída ou, com tudo concluído, a última. */
export function defaultPhase(view: PlanView): string | null {
  const phases = view.phases;
  return (
    phases.find((p) => p.id === view.activePhase)?.id ??
    phases.find((p) => p.status === 'ativa')?.id ??
    phases.find((p) => p.status !== 'concluida')?.id ??
    phases[phases.length - 1]?.id ??
    null
  );
}

export interface PlanPage {
  el: HTMLElement;
  /** Fase selecionada, já validada contra o plano. */
  phase: string | null;
  /** Põe o foco no nó da fase (depois de redesenhar, se ele tinha o foco). */
  focusPhase(id: string): void;
}

/**
 * Página do plano: cabeçalho, Contexto, faixa do Fora do escopo, Restrições herdadas, o grafo de fases com o painel
 * da fase selecionada ao lado e, abaixo do grafo, os commits de fases que não existem mais no YAML.
 */
export function renderPlanPage(project: string, view: PlanView, requested: string | null, now: number, onSelect: (id: string) => void): PlanPage {
  const selected = view.phases.some((p) => p.id === requested) ? requested : defaultPhase(view);

  const meta = [view.branch, view.created ? `criado em ${formatDate(view.created)}` : null, `${view.done}/${plural(view.total, 'fase', 'fases')}`]
    .filter(Boolean)
    .join(' · ');
  const page = h(
    'div',
    { class: 'page page--plan' },
    crumbs([
      ['Projetos', routeHash({ view: 'home' })],
      [project, routeHash({ view: 'project', name: project })],
    ]),
    h(
      'header',
      { class: 'page__head plan-head' },
      h('h1', { class: 'page__title' }, view.title || view.id),
      h('p', { class: 'page__sub' }, h('span', { class: 'mono' }, view.id), ` · ${meta}`),
    ),
  );

  if (view.context !== null) {
    page.append(h('section', { class: 'context', 'aria-label': 'Contexto' }, h('h2', { class: 'context__label' }, 'Contexto'), markdown(view.context, '', 3)));
  }
  if (view.outOfScope !== null) page.append(scopeStrip(view.outOfScope));
  if (view.constraints !== null && view.constraints.trim()) {
    page.append(
      h(
        'details',
        { class: 'constraints' },
        h('summary', { class: 'constraints__summary' }, 'Restrições herdadas'),
        markdown(view.constraints, 'constraints__body', 3),
      ),
    );
  }

  if (!view.phases.length) {
    page.append(h('p', { class: 'empty' }, 'Este plano não tem fases no YAML.'));
    return { el: page, phase: null, focusPhase: () => {} };
  }

  const panelSlot = h('div', { class: 'flow__panel' });
  const byId = new Map(view.phases.map((p) => [p.id, p]));
  const showPanel = (phase: PhaseView) => panelSlot.replaceChildren(renderPhasePanel(view.id, phase, now));

  const graph: GraphView = renderGraph(view.phases, selected!, (id) => {
    graph.select(id);
    showPanel(byId.get(id)!);
    onSelect(id);
  });
  showPanel(byId.get(selected!)!);

  const legend = h(
    'p',
    { class: 'legend', 'aria-hidden': 'true' },
    ...(['concluida', 'ativa', 'bloqueada', 'pendente'] as const).map((s) =>
      h('span', { class: `legend__item legend__item--${s}` }, h('span', { class: 'legend__swatch' }), STATUS_LABEL[s]),
    ),
    h('span', { class: 'legend__item legend__item--pending-edge' }, h('span', { class: 'legend__dash' }), 'dependência pendente'),
  );

  const graphArea = h(
    'div',
    { class: 'flow__graph' },
    h('h2', { class: 'section-title' }, 'Fases'),
    h('div', { class: 'graph-scroll' }, graph.el),
    legend,
  );
  if (view.orphans.length) graphArea.append(orphanList(view, now));

  page.append(h('div', { class: 'flow' }, graphArea, panelSlot));

  return {
    el: page,
    phase: selected,
    focusPhase: (id) => graph.el.querySelector<HTMLButtonElement>(`[data-phase="${CSS.escape(id)}"]`)?.focus(),
  };
}

/** Faixa de uma linha com o essencial de cada item; "ver tudo" abre a lista completa. */
function scopeStrip(md: string): HTMLElement {
  const items = md
    .split('\n')
    .map((l) => /^[-*+][ \t]+(.*)$/.exec(l)?.[1])
    .filter((x): x is string => !!x)
    .map(shortItem);
  const full = markdown(md, 'scope__body', 3);
  full.id = 'scope-body';
  full.hidden = !scopeOpen;

  const toggle = h('button', { type: 'button', class: 'link-button', 'aria-expanded': String(scopeOpen), 'aria-controls': 'scope-body' }, scopeOpen ? 'recolher' : 'ver tudo');
  const strip = h(
    'section',
    { class: 'scope', 'aria-label': 'Fora do escopo' },
    h(
      'div',
      { class: 'scope__line' },
      h('h2', { class: 'scope__label' }, 'Fora do escopo:'),
      h('p', { class: 'scope__summary', hidden: scopeOpen }, items.length ? items.join(' · ') : plainInline(md.split('\n')[0] ?? '')),
      toggle,
    ),
    full,
  );
  toggle.addEventListener('click', () => {
    scopeOpen = !scopeOpen;
    full.hidden = !scopeOpen;
    strip.querySelector<HTMLElement>('.scope__summary')!.hidden = scopeOpen;
    toggle.setAttribute('aria-expanded', String(scopeOpen));
    toggle.textContent = scopeOpen ? 'recolher' : 'ver tudo';
  });
  return strip;
}

/** "Qualquer escrita: o painel só lê" vira "Qualquer escrita": o trecho antes do primeiro ":" ou ".". */
function shortItem(item: string): string {
  const text = plainInline(item);
  const cut = text.search(/[:.](\s|$)/);
  const short = cut > 0 ? text.slice(0, cut) : text;
  return short.length > 60 ? `${short.slice(0, 57).trimEnd()}…` : short;
}

function orphanList(view: PlanView, now: number): HTMLElement {
  return h(
    'section',
    { class: 'orphans', 'aria-labelledby': 'orphans-title' },
    h('h3', { class: 'orphans__title', id: 'orphans-title' }, 'Commits de fases que não existem mais no plano'),
    h(
      'ul',
      { class: 'orphans__list' },
      ...view.orphans.map((o) =>
        h(
          'li',
          { class: 'orphans__phase' },
          h('code', { class: 'orphans__ref' }, `${view.id}/${o.phase}`),
          h('ul', { class: 'commits' }, ...o.commits.map((c) => commitItem(c, now))),
        ),
      ),
    ),
  );
}
