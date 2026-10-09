import { formatAge } from '../alerts';
import type { Project } from './api';

// Tudo que vem do projeto entra por textContent ou atributos; nunca por innerHTML.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
