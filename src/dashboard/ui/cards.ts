import { formatAge } from '../alerts';
import type { BuilderdevInfo, PhaseStatus, Project } from './api';

// Tudo que vem do projeto entra por textContent ou atributos; nunca por innerHTML.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Mesmos rótulos do `builderdev status` (STATUS_LABEL em src/plan/status.ts, que não entra no bundle do navegador). */
const STATUS_LABEL: Record<PhaseStatus, string> = {
  concluida: 'concluída',
  ativa: 'ativa',
  bloqueada: 'bloqueada',
  pendente: 'pendente',
};

/** "agora" ou "há 3 h", relativo a `now`. */
export function ago(iso: string, now: number): string {
  const ms = now - Date.parse(iso);
  return ms < 60_000 ? 'agora' : `há ${formatAge(ms)}`;
}

export function hasAttention(p: Project): boolean {
  return p.alerts.some((a) => a.severity === 'atencao');
}

export function hasChanges(p: Project): boolean {
  return !!p.git && p.git.changes.modified + p.git.changes.untracked > 0;
}

export function isIdle(p: Project): boolean {
  return p.alerts.some((a) => a.code === 'parado');
}

export function renderCard(p: Project, now: number): HTMLElement {
  const card = clone<HTMLElement>('card-template');
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => card.querySelector<T>(sel)!;
  card.dataset.name = p.name;
  $('.card__name').textContent = p.name;

  const badge = $('.badge');
  const showBadge = (kind: string, text: string) => {
    badge.hidden = false;
    badge.classList.add(`badge--${kind}`);
    badge.textContent = `● ${text}`;
  };

  const when = $<HTMLTimeElement>('.card__ago');
  if (p.lastActivity) {
    when.dateTime = p.lastActivity;
    when.textContent = ago(p.lastActivity, now);
    when.title = `última atividade: ${new Date(p.lastActivity).toLocaleString('pt-BR')}`;
  } else {
    $('.card__sep').remove();
    when.remove();
  }

  if (p.error) {
    card.classList.add('card--erro');
    showBadge('erro', 'erro');
    $('.card__branch').textContent = p.kind === 'sem-git' ? 'sem git' : 'git';
    const error = $('.card__error');
    error.hidden = false;
    error.textContent = p.error;
    for (const sel of ['.card__commit', '.card__changes', '.card__pace']) $(sel).remove();
  } else if (!p.git) {
    card.classList.add('card--sem-git');
    showBadge('sem-git', 'sem git');
    $('.card__branch').textContent = 'pasta sem git';
    for (const sel of ['.card__commit', '.card__changes', '.card__pace']) $(sel).remove();
  } else {
    const g = p.git;
    $('.card__branch').textContent = g.detached ? `destacado em ${g.branch}` : g.branch;

    const commit = $('.card__commit');
    if (g.lastCommit) {
      commit.textContent = `“${g.lastCommit.subject}”`;
      const when = new Date(g.lastCommit.date).toLocaleString('pt-BR');
      commit.title = `${g.lastCommit.hash} · ${g.lastCommit.author} · ${when}\n${g.lastCommit.subject}`;
    } else {
      commit.textContent = 'nenhum commit ainda';
      commit.classList.add('card__commit--none');
    }

    renderChanges($('.card__changes'), p);
    $('.card__pace').textContent =
      g.commitsLast7Days > 0 ? `${plural(g.commitsLast7Days, 'commit', 'commits')} em 7 dias` : 'nenhum commit em 7 dias';
  }

  if (p.builderdev) renderBuilderdev($('.bd'), p.builderdev, now);
  else $('.bd').remove();
  if (p.kind === 'git' && !p.error) $('.card__adopt').hidden = false;
  else $('.card__adopt').remove();

  if (hasAttention(p)) {
    card.classList.add('card--atencao');
    if (!p.error) showBadge('atencao', 'atenção');
  }

  const list = $('.card__alerts');
  for (const alert of p.alerts) {
    if (alert.code === 'sem-git') continue; // o card já diz
    const item = document.createElement('li');
    item.className = `alert alert--${alert.severity}`;
    const icon = document.createElement('span');
    icon.className = 'alert__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = alert.severity === 'atencao' ? '▲' : '●';
    const text = document.createElement('span');
    text.textContent = alert.severity === 'atencao' ? `Atenção: ${alert.message}` : alert.message;
    item.append(icon, text);
    list.append(item);
  }
  return card;
}

/** Plano atual com a barra de fases, fase ativa (ou a próxima), último verify e memória. */
function renderBuilderdev(el: HTMLElement, bd: BuilderdevInfo, now: number): void {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  el.hidden = false;
  const current = bd.plans.find((p) => p.id === bd.currentPlan);

  const planLine = $('.bd__plan');
  if (current) {
    const name = document.createElement('strong');
    name.className = 'bd__plan-id';
    name.textContent = current.id;
    planLine.append(name, current.title ? ` · ${current.title}` : '');
    planLine.title = [current.title || current.id, current.created ? `criado em ${formatDate(current.created)}` : '']
      .filter(Boolean)
      .join('\n');

    const bar = $('.bar');
    for (const phase of current.phases) {
      const seg = document.createElement('span');
      seg.className = `bar__seg bar__seg--${phase.status}`;
      seg.title = `${phase.id} · ${phase.title} — ${STATUS_LABEL[phase.status]}`;
      bar.append(seg);
    }
    bar.setAttribute(
      'aria-label',
      `${current.done} de ${current.total} fases concluídas: ${current.phases.map((ph) => `${ph.id} ${STATUS_LABEL[ph.status]}`).join(', ')}`,
    );
    $('.bd__count').textContent = `${current.done}/${plural(current.total, 'fase', 'fases')}`;
  } else {
    planLine.textContent = bd.plans.length ? 'nenhum plano legível em .dev/plans' : 'nenhum plano em .dev/plans';
    planLine.classList.add('bd__none');
    $('.bd__progress').remove();
  }

  $('.bd__active').append(...activeLine(bd, current?.done === current?.total && !!current));

  const verify = $('.bd__verify');
  if (!bd.active) {
    verify.remove();
  } else if (!bd.lastVerify) {
    verify.textContent = 'verify: ainda não rodou nesta fase';
  } else {
    const v = bd.lastVerify;
    const failed = v.result === 'falhou';
    verify.classList.add(failed ? 'bd__verify--falhou' : 'bd__verify--ok');
    const icon = document.createElement('span');
    icon.className = 'bd__verify-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = failed ? '✕' : '✓';
    const what = failed ? 'falhou' : v.result === 'sem-mudanca' ? 'aprovado, sem mudança desde então' : 'aprovado';
    verify.append('verify: ', icon, ` ${what}${v.at ? ` ${ago(v.at, now)}` : ''}`);
    verify.title = [
      v.command ? `comando: ${v.command}` : '',
      v.durationMs !== null ? `duração: ${(v.durationMs / 1000).toFixed(1)} s` : '',
      v.log ? `log: ${v.log}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const { knowledge, bugs, repeated } = bd.memory;
  $('.bd__memory').textContent = `memória ${knowledge} · erros ${bugs}${repeated ? ` (${plural(repeated, 'repetido', 'repetidos')})` : ''}`;
}

function activeLine(bd: BuilderdevInfo, planDone: boolean): Array<string | Node> {
  const a = bd.active;
  if (!a) {
    const next = bd.next ? ` · próxima: ${bd.next.phase} · ${bd.next.title}` : planDone ? ' · plano concluído' : '';
    return [`nenhuma fase ativa${next}`];
  }
  const label = document.createElement('span');
  label.className = 'bd__active-label';
  label.textContent = 'ativa:';
  if (a.status === null) return [label, ` ${a.plan}/${a.phase} (não existe mais no plano)`];
  const note = a.status === 'concluida' ? ' (já concluída)' : a.blockedBy.length ? ` (bloqueada: aguarda ${a.blockedBy.join(', ')})` : '';
  return [label, ` ${a.phase}${a.title ? ` · ${a.title}` : ''}${note}`];
}

/** AAAA-MM-DD em DD/MM/AAAA, sem passar por fuso. */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function renderChanges(el: HTMLElement, p: Project): void {
  const { changes, ahead, behind } = p.git!;
  const parts: string[] = [];
  if (changes.modified) parts.push(plural(changes.modified, 'modificado', 'modificados'));
  if (changes.untracked) parts.push(plural(changes.untracked, 'novo', 'novos'));
  el.append(parts.length ? parts.join(' · ') : 'sem mudanças', ' · ');

  if (ahead === null || behind === null) {
    el.append('sem upstream');
    return;
  }
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.textContent = `↑${ahead} ↓${behind}`;
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = `${ahead} à frente e ${behind} atrás do remoto`;
  el.title = `${plural(ahead, 'commit', 'commits')} sem push · ${plural(behind, 'commit', 'commits')} do remoto por trazer (desde o último fetch)`;
  el.append(visual, spoken);
}

export function renderSkeletons(count: number): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) fragment.append(clone('skeleton-template'));
  return fragment;
}

function clone<T extends Element = Element>(id: string): T {
  const template = document.getElementById(id) as HTMLTemplateElement;
  return template.content.firstElementChild!.cloneNode(true) as T;
}
