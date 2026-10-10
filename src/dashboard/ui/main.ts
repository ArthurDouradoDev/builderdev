import { ApiError, type PlanView, type Project, type ProjectPage, type Scan, fetchPlan, fetchProject, fetchProjects } from './api';
import { hasAttention, hasChanges, isIdle, renderCard, renderSkeletons } from './cards';
import { h } from './dom';
import { renderPlanPage } from './plan-page';
import { crumbs, renderProjectPage } from './project-page';
import { type Route, parseRoute, replaceRoute, routeHash } from './router';

type Filter = 'todos' | 'atencao' | 'builderdev' | 'parados';

const FILTERS: Record<Filter, (p: Project) => boolean> = {
  todos: () => true,
  atencao: hasAttention,
  builderdev: (p) => p.kind === 'builderdev',
  parados: isIdle,
};

const AUTO_REFRESH_MS = 60_000;
/** Ao voltar para a aba, só atualiza se a última leitura tiver mais que isto. */
const STALE_ON_FOCUS_MS = 5_000;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let route: Route = parseRoute(location.hash);

const state = {
  scan: null as Scan | null,
  /** Quando a última leitura chegou, no relógio do navegador. */
  receivedAt: 0,
  loading: false,
  filter: 'todos' as Filter,
  query: '',
};

/** Dados da página do projeto ou do plano em tela. `key` identifica a página, sem a fase. */
const page = {
  key: '',
  data: null as ProjectPage | PlanView | null,
  /** JSON da última resposta: atualização igual não redesenha (e não tira o foco do lugar). */
  json: '',
  receivedAt: 0,
  /** Página com pedido em andamento; outra página pode pedir ao mesmo tempo (a resposta velha é descartada). */
  inflight: '',
  error: null as ApiError | null,
};

const pageKey = (r: Route) => (r.view === 'project' ? `p:${r.name}` : r.view === 'plan' ? `g:${r.name}\0${r.plan}` : '');

// Filtro e busca vivem na URL: #/?filtro=atencao&busca=mdt
function readHash(): void {
  const query = location.hash.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const filter = params.get('filtro');
  state.filter = filter && filter in FILTERS ? (filter as Filter) : 'todos';
  state.query = params.get('busca') ?? '';
}

function writeHash(): void {
  const params = new URLSearchParams();
  if (state.filter !== 'todos') params.set('filtro', state.filter);
  if (state.query) params.set('busca', state.query);
  const query = params.toString();
  history.replaceState(null, '', `#/${query ? `?${query}` : ''}`);
}

/** Minúsculas e sem acento, para a busca. */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function renderHome(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
    const filter = button.dataset.filter as Filter;
    button.setAttribute('aria-pressed', String(filter === state.filter));
    button.querySelector('.filter__count')!.textContent = state.scan ? `(${state.scan.projects.filter(FILTERS[filter]).length})` : '';
  }
  const search = el<HTMLInputElement>('search');
  if (search.value !== state.query) search.value = state.query;

  const scan = state.scan;
  if (!scan) return;
  el('root').textContent = scan.root;
  const { projects } = scan;
  el('stat-total').textContent = String(projects.length);
  el('stat-atencao').textContent = String(projects.filter(hasAttention).length);
  el('stat-mudancas').textContent = String(projects.filter(hasChanges).length);
  el('stat-parados').textContent = String(projects.filter(isIdle).length);

  const term = fold(state.query.trim());
  const visible = projects.filter((p) => FILTERS[state.filter](p) && (!term || fold(p.name).includes(term)));
  const now = Date.now();
  const grid = el('grid');
  grid.replaceChildren(...visible.map((p) => renderCard(p, now)));
  grid.setAttribute('aria-busy', 'false');

  const empty = el('empty');
  empty.hidden = visible.length > 0;
  empty.textContent = !projects.length
    ? `Nenhuma pasta em ${scan.root}.`
    : term
      ? `Nenhum projeto com “${state.query.trim()}” neste filtro.`
      : 'Nenhum projeto neste filtro.';
  renderUpdated();
}

function renderUpdated(): void {
  if (!state.receivedAt) return;
  const s = Math.round((Date.now() - state.receivedAt) / 1000);
  el('updated').textContent = state.loading ? 'atualizando…' : s < 5 ? 'atualizado agora' : `atualizado há ${formatSeconds(s)}`;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}

async function refreshHome(): Promise<void> {
  if (state.loading) return;
  state.loading = true;
  const button = el<HTMLButtonElement>('refresh');
  button.disabled = true;
  renderUpdated();
  try {
    state.scan = await fetchProjects();
    state.receivedAt = Date.now();
    el('offline').hidden = true;
  } catch {
    el('offline').hidden = false;
    if (!state.scan) {
      el('grid').replaceChildren();
      el('grid').setAttribute('aria-busy', 'false');
    }
  } finally {
    state.loading = false;
    button.disabled = false;
  }
  if (route.view === 'home') renderHome();
}

/** Busca os dados da página em tela; redesenha só se mudaram ou se a página é outra. */
async function refreshPage(): Promise<void> {
  const r = route;
  const key = pageKey(r);
  if (r.view === 'home' || page.inflight === key) return;
  page.inflight = key;
  try {
    const data = r.view === 'project' ? await fetchProject(r.name) : await fetchPlan(r.name, r.plan);
    if (pageKey(route) !== key) return; // a pessoa já foi para outra página
    const json = JSON.stringify(data);
    const changed = page.key !== key || json !== page.json || page.error !== null;
    Object.assign(page, { key, data, json, receivedAt: Date.now(), error: null });
    el('offline').hidden = true;
    if (changed) renderPage();
  } catch (err) {
    if (pageKey(route) !== key) return;
    const error = err instanceof ApiError ? err : new ApiError((err as Error).message);
    if (error.status === 0) {
      el('offline').hidden = false;
      // Sem servidor, mantém o que já está na tela; sem nada na tela, mostra o erro.
      if (page.key === key && page.data) return;
    }
    Object.assign(page, { key, data: null, json: '', receivedAt: Date.now(), error });
    renderPage();
  } finally {
    if (page.inflight === key) page.inflight = '';
  }
}

function renderPage(): void {
  const r = route;
  const view = el('view-page');
  if (r.view === 'home') return;
  const now = Date.now();
  const projectCrumbs: Array<[string, string]> = [['Projetos', routeHash({ view: 'home' })]];
  if (r.view === 'plan') projectCrumbs.push([r.name, routeHash({ view: 'project', name: r.name })]);

  if (page.key !== pageKey(r)) {
    document.title = `${r.view === 'plan' ? r.plan : r.name} · builderdev`;
    view.replaceChildren(h('div', { class: 'page' }, crumbs(projectCrumbs), h('p', { class: 'page__loading', role: 'status' }, 'carregando…')));
    view.setAttribute('aria-busy', 'true');
    return;
  }
  view.setAttribute('aria-busy', 'false');

  if (page.error || !page.data) {
    const notFound = page.error?.status === 404;
    document.title = `${notFound ? 'não encontrado' : 'erro'} · builderdev`;
    view.replaceChildren(
      h(
        'div',
        { class: 'page' },
        crumbs(projectCrumbs),
        h('h1', { class: 'page__title' }, notFound ? (r.view === 'plan' ? 'Plano não encontrado' : 'Projeto não encontrado') : 'Não foi possível carregar'),
        h('p', { class: 'card__error page__error' }, page.error?.message ?? 'resposta vazia do servidor'),
      ),
    );
    return;
  }

  if (r.view === 'project') {
    const data = page.data as ProjectPage;
    document.title = `${data.project.name} · builderdev`;
    view.replaceChildren(renderProjectPage(data, now));
    return;
  }

  const data = page.data as PlanView;
  document.title = `${data.id} · ${r.name} · builderdev`;
  // Redesenhar depois de uma atualização não pode tirar o foco do nó em que a pessoa estava.
  const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.graph [data-phase]')?.dataset.phase;
  const rendered = renderPlanPage(r.name, data, r.phase, now, (id) => {
    if (route.view !== 'plan') return;
    route = { ...route, phase: id };
    replaceRoute(route);
  });
  view.replaceChildren(rendered.el);
  if (rendered.phase && rendered.phase !== r.phase) {
    route = { ...r, phase: rendered.phase };
    replaceRoute(route);
  }
  if (focused) rendered.focusPhase(focused);
}

/** Mostra a tela da rota atual; dados já carregados aparecem na hora e são atualizados por trás. */
function showRoute(): void {
  const previous = route;
  route = parseRoute(location.hash);
  const home = route.view === 'home';
  el('view-home').hidden = !home;
  el('view-page').hidden = home;
  if (pageKey(previous) !== pageKey(route)) window.scrollTo(0, 0);

  if (home) {
    document.title = 'Projetos · builderdev';
    readHash();
    renderHome();
    if (Date.now() - state.receivedAt > STALE_ON_FOCUS_MS) void refreshHome();
    return;
  }
  renderPage();
  if (page.key !== pageKey(route) || Date.now() - page.receivedAt > STALE_ON_FOCUS_MS) void refreshPage();
}

function refresh(): void {
  void (route.view === 'home' ? refreshHome() : refreshPage());
}

function refreshIfStale(): void {
  const at = route.view === 'home' ? state.receivedAt : page.receivedAt;
  if (document.visibilityState === 'visible' && Date.now() - at > STALE_ON_FOCUS_MS) refresh();
}

function init(): void {
  readHash();
  el('grid').replaceChildren(renderSkeletons(6));
  renderHome();

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter as Filter;
      writeHash();
      renderHome();
    });
  }
  el<HTMLInputElement>('search').addEventListener('input', (e) => {
    state.query = (e.target as HTMLInputElement).value;
    writeHash();
    renderHome();
  });
  window.addEventListener('hashchange', showRoute);
  el('refresh').addEventListener('click', () => void refreshHome());

  // Atualiza ao voltar para a aba e a cada minuto enquanto ela está visível.
  document.addEventListener('visibilitychange', refreshIfStale);
  window.addEventListener('focus', refreshIfStale);
  setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, AUTO_REFRESH_MS);
  setInterval(() => {
    if (document.visibilityState === 'visible' && route.view === 'home') renderUpdated();
  }, 1000);

  showRoute();
}

init();
