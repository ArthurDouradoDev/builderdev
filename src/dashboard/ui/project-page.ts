import type { PlanSummary, ProjectPage } from './api';
import { ago, renderAlerts, renderBar, renderChanges } from './cards';
import { formatDate, h, plural } from './dom';
import { routeHash } from './router';

/** Página do projeto: cabeçalho com o resumo do git e a lista de planos, do mais recente ao mais antigo. */
export function renderProjectPage({ project: p, plans }: ProjectPage, now: number): HTMLElement {
  const g = p.git;
  const where = h('p', { class: 'page__sub' });
  if (g) {
    where.append(h('span', { class: 'mono' }, g.detached ? `destacado em ${g.branch}` : g.branch));
    if (g.lastCommit) {
      where.append(' · ', h('span', { class: 'page__commit', title: `${g.lastCommit.hash} · ${g.lastCommit.author}` }, `“${g.lastCommit.subject}”`));
      where.append(' · ', h('time', { datetime: g.lastCommit.date, title: new Date(g.lastCommit.date).toLocaleString('pt-BR') }, ago(g.lastCommit.date, now)));
    } else {
      where.append(' · nenhum commit ainda');
    }
  } else {
    where.append(p.error ? 'não foi possível ler o git' : 'pasta sem git');
  }

  const head = h('header', { class: 'page__head' }, h('h1', { class: 'page__title' }, p.name), where);
  if (g) {
    const changes = h('p', { class: 'page__sub' });
    renderChanges(changes, p);
    changes.append(` · ${g.commitsLast7Days > 0 ? `${plural(g.commitsLast7Days, 'commit', 'commits')} em 7 dias` : 'nenhum commit em 7 dias'}`);
    head.append(changes);
  }
  if (p.error) head.append(h('p', { class: 'card__error' }, p.error));
  const alerts = h('ul', { class: 'card__alerts page__alerts' });
  renderAlerts(alerts, p.alerts);
  head.append(alerts);

  const page = h('div', { class: 'page' }, crumbs([['Projetos', routeHash({ view: 'home' })]]), head);

  if (p.kind !== 'builderdev') {
    page.append(h('p', { class: 'empty' }, 'Este projeto não usa o BuilderDev. Para adotar: ', h('code', {}, '/builderdev:setup')));
    return page;
  }

  const activePlan = p.builderdev?.active?.plan ?? null;
  const list = h('ul', { class: 'plans' }, ...plans.map((plan) => planRow(p.name, plan, plan.id === activePlan ? p.builderdev!.active!.phase : null)));
  page.append(
    h(
      'section',
      { class: 'page__section', 'aria-labelledby': 'plans-title' },
      h('h2', { class: 'section-title', id: 'plans-title' }, 'Planos ', h('span', { class: 'section-title__count' }, String(plans.length))),
      plans.length ? list : h('p', { class: 'empty' }, 'Nenhum plano em .dev/plans.'),
    ),
  );
  return page;
}

function planRow(project: string, plan: PlanSummary, activePhase: string | null): HTMLElement {
  const href = routeHash({ view: 'plan', name: project, plan: plan.id, phase: null });
  const meta = h('p', { class: 'plan-row__meta' }, h('span', { class: 'mono' }, plan.id));
  if (plan.created) meta.append(` · criado em ${formatDate(plan.created)}`);

  const row = h(
    'li',
    { class: `plan-row${activePhase ? ' plan-row--active' : ''}${plan.error ? ' plan-row--erro' : ''}` },
    h('h3', { class: 'plan-row__title' }, plan.error ? h('span', {}, plan.title || plan.id) : h('a', { class: 'plan-row__link', href }, plan.title || plan.id)),
    meta,
  );

  if (plan.error) {
    row.append(h('p', { class: 'card__error' }, plan.error));
    return row;
  }

  const bar = h('span', { class: 'bar', role: 'img' });
  renderBar(bar, plan);
  row.append(
    h(
      'div',
      { class: 'plan-row__progress' },
      bar,
      h('span', { class: 'bd__count' }, plan.total ? `${plan.done}/${plural(plan.total, 'fase', 'fases')}` : 'nenhuma fase no YAML'),
    ),
  );

  const notes = h('p', { class: 'plan-row__notes' });
  if (activePhase) {
    const phase = plan.phases.find((x) => x.id === activePhase);
    notes.append(h('span', { class: 'status status--ativa' }, h('span', { class: 'status__icon', 'aria-hidden': 'true' }, '●'), `ativa: ${activePhase}${phase ? ` · ${phase.title}` : ''}`));
  } else if (plan.total && plan.done === plan.total) {
    notes.append(h('span', { class: 'status status--concluida' }, h('span', { class: 'status__icon', 'aria-hidden': 'true' }, '✓'), 'concluído'));
  } else {
    const next = plan.phases.find((x) => x.status === 'pendente');
    if (next) notes.append(`próxima: ${next.id} · ${next.title}`);
  }
  if (plan.lintErrors) notes.append(h('span', { class: 'plan-row__lint' }, `▲ ${plural(plan.lintErrors, 'erro', 'erros')} no lint`));
  if (notes.childNodes.length) row.append(notes);
  return row;
}

/** Trilha de volta: "← Projetos" ou "← Projetos / betterdev". */
export function crumbs(items: Array<[string, string]>): HTMLElement {
  const nav = h('nav', { class: 'crumbs', 'aria-label': 'Navegação' });
  items.forEach(([label, href], i) => {
    if (i) nav.append(h('span', { class: 'crumbs__sep', 'aria-hidden': 'true' }, '/'));
    nav.append(h('a', { href, class: 'crumbs__link' }, i === 0 ? `← ${label}` : label));
  });
  return nav;
}
