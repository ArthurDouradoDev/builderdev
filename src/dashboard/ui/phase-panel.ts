import type { CommitRef, PhaseView, VerifyRecord } from './api';
import { STATUS_LABEL, ago } from './cards';
import { h, markdown } from './dom';
import { STATUS_ICON } from './graph';

type TabKey = 'code' | 'interface' | 'tests';
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'code', label: 'Código' },
  { key: 'interface', label: 'Interface' },
  { key: 'tests', label: 'Testes' },
];

/** Aba escolhida por último; vale para a próxima fase aberta, se ela tiver a aba. */
let lastTab: TabKey = 'code';

/**
 * Painel lateral da fase, em ordem fixa: Objetivo, abas Código/Interface/Testes (só as que existem), arquivos,
 * verificação, Validação visual (instruções, sem caixas de marcar), outras seções do corpo e commit.
 */
export function renderPhasePanel(plan: string, phase: PhaseView, now: number): HTMLElement {
  const titleId = `phase-title-${phase.id}`;
  const deps = phase.dependsOn.length ? `depende de ${phase.dependsOn.join(', ')}` : 'sem dependências';
  const waiting = phase.status !== 'concluida' && phase.blockedBy.length ? ` · aguarda ${phase.blockedBy.join(', ')}` : '';

  const panel = h(
    'aside',
    { class: 'phase', 'aria-labelledby': titleId, 'data-phase': phase.id },
    h(
      'header',
      { class: 'phase__head' },
      h(
        'p',
        { class: 'phase__meta' },
        h('span', { class: `status status--${phase.status}` }, h('span', { class: 'status__icon', 'aria-hidden': 'true' }, STATUS_ICON[phase.status]), STATUS_LABEL[phase.status]),
        h('span', { class: 'phase__deps' }, `${deps}${waiting}`),
      ),
      h('h2', { class: 'phase__title', id: titleId }, h('span', { class: 'phase__id' }, phase.id), ` · ${phase.title || 'sem título'}`),
    ),
  );

  if (phase.missingBody) {
    panel.append(h('p', { class: 'phase__note' }, `O plano não tem o bloco "## ${phase.id} · …" no corpo; só os campos do YAML aparecem aqui.`));
  }

  panel.append(block('Objetivo', phase.sections.objective === null ? missing('Objetivo') : markdown(phase.sections.objective, 'phase__objective')));

  const tabs = TABS.filter((t) => phase.sections[t.key] !== null);
  if (tabs.length) panel.append(tabBlock(phase, tabs));

  panel.append(
    block(
      'Arquivos',
      phase.files.length
        ? h('ul', { class: 'files' }, ...phase.files.map((f) => h('li', {}, h('code', {}, f))))
        : h('p', { class: 'phase__empty' }, 'nenhum arquivo em files'),
    ),
  );

  panel.append(block('Verificação', verifyResult(phase, now), phase.verify.length
    ? h('ol', { class: 'commands' }, ...phase.verify.map((c) => h('li', {}, h('code', {}, c))))
    : h('p', { class: 'phase__empty' }, 'nenhum comando em verify')));

  panel.append(
    block(
      'Validação visual',
      phase.sections.visualValidation === null ? missing('Validação visual') : markdown(phase.sections.visualValidation, 'md--steps'),
    ),
  );

  for (const extra of phase.extraSections) {
    if (extra.markdown.trim()) panel.append(block(extra.title, markdown(extra.markdown)));
  }

  panel.append(block('Commit', commitBlock(plan, phase, now)));
  return panel;
}

function block(title: string, ...content: Node[]): HTMLElement {
  return h('section', { class: 'phase__block' }, h('h3', { class: 'phase__label' }, title), ...content);
}

function missing(section: string): HTMLElement {
  return h('p', { class: 'phase__empty' }, `sem "${section}" no plano`);
}

/** Abas no padrão WAI-ARIA: setas trocam de aba, Tab vai para o conteúdo. */
function tabBlock(phase: PhaseView, tabs: typeof TABS): HTMLElement {
  const initial = tabs.find((t) => t.key === lastTab) ?? tabs[0]!;
  const list = h('div', { class: 'tabs__list', role: 'tablist', 'aria-label': 'Escopo da fase' });
  const panels: HTMLElement[] = [];
  const buttons: HTMLButtonElement[] = [];

  const activate = (index: number, focus: boolean) => {
    buttons.forEach((b, i) => {
      const on = i === index;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      panels[i]!.hidden = !on;
    });
    lastTab = tabs[index]!.key;
    if (focus) buttons[index]!.focus();
  };

  tabs.forEach((tab, i) => {
    const tabId = `tab-${phase.id}-${tab.key}`;
    const panelId = `tabpanel-${phase.id}-${tab.key}`;
    const button = h('button', { type: 'button', class: 'tabs__tab', role: 'tab', id: tabId, 'aria-controls': panelId }, tab.label);
    button.addEventListener('click', () => activate(i, false));
    button.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        activate(e.key === 'Home' ? 0 : tabs.length - 1, true);
      } else if (step) {
        e.preventDefault();
        activate((i + step + tabs.length) % tabs.length, true);
      }
    });
    buttons.push(button);
    list.append(button);
    const content = markdown(phase.sections[tab.key]!);
    panels.push(h('div', { class: 'tabs__panel', role: 'tabpanel', id: panelId, 'aria-labelledby': tabId, tabindex: 0 }, content));
  });

  const el = h('section', { class: 'phase__block tabs' }, list, ...panels);
  activate(tabs.indexOf(initial), false);
  return el;
}

function verifyResult(phase: PhaseView, now: number): HTMLElement {
  const v: VerifyRecord | null = phase.lastVerify;
  if (!v) {
    return h('p', { class: 'verify verify--none' }, phase.status === 'concluida' ? 'nenhum resultado registrado' : 'ainda não rodou nesta fase');
  }
  const failed = v.result === 'falhou';
  const what = failed ? 'falhou' : v.result === 'sem-mudanca' ? 'aprovado, sem mudança desde então' : 'aprovado';
  const when = v.at ? new Date(v.at) : null;
  const el = h(
    'p',
    { class: `verify ${failed ? 'verify--falhou' : 'verify--ok'}` },
    h('span', { class: 'verify__icon', 'aria-hidden': 'true' }, failed ? '✕' : '✓'),
    h('span', {}, `último verify: ${what}`),
    when ? h('time', { class: 'verify__when', datetime: v.at, title: when.toLocaleString('pt-BR') }, ` · ${ago(v.at, now)} (${when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})`) : null,
  );
  const details = [
    failed && v.command ? `comando que falhou: ${v.command}` : '',
    v.durationMs !== null ? `duração: ${(v.durationMs / 1000).toFixed(1)} s` : '',
    v.log ? `log: ${v.log}` : '',
  ].filter(Boolean);
  if (!details.length) return el;
  return h('div', {}, el, h('p', { class: 'verify__details' }, details.join(' · ')));
}

function commitBlock(plan: string, phase: PhaseView, now: number): HTMLElement {
  if (phase.commits.length) {
    return h('ul', { class: 'commits' }, ...phase.commits.map((c) => commitItem(c, now)));
  }
  const message = `${phase.commitMsg ?? '(sem commit_msg no YAML)'}\n\nPlan-Step: ${plan}/${phase.id}`;
  return h('div', {}, h('p', { class: 'phase__hint' }, 'Mensagem sugerida'), h('pre', { class: 'commit-msg' }, h('code', {}, message)));
}

export function commitItem(c: CommitRef, now: number): HTMLElement {
  const date = c.date ? new Date(c.date) : null;
  return h(
    'li',
    { class: 'commit' },
    h('code', { class: 'commit__hash', title: c.hash }, c.short),
    h('span', { class: 'commit__subject' }, c.subject || '(commit não encontrado no repositório)'),
    date ? h('time', { class: 'commit__date', datetime: c.date, title: date.toLocaleString('pt-BR') }, ago(c.date, now)) : null,
  );
}
