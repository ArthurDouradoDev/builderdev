import { type Project, type Scan, fetchProjects } from './api';
import { hasAttention, hasChanges, isIdle, renderCard, renderSkeletons } from './cards';

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

const state = {
  scan: null as Scan | null,
  /** Quando a última leitura chegou, no relógio do navegador. */
  receivedAt: 0,
  loading: false,
  filter: 'todos' as Filter,
  query: '',
};

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

function render(): void {
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

async function refresh(): Promise<void> {
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
  render();
}

function refreshIfStale(): void {
  if (document.visibilityState === 'visible' && Date.now() - state.receivedAt > STALE_ON_FOCUS_MS) void refresh();
}

function init(): void {
  readHash();
  el('grid').replaceChildren(renderSkeletons(6));
  render();

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter as Filter;
      writeHash();
      render();
    });
  }
  el<HTMLInputElement>('search').addEventListener('input', (e) => {
    state.query = (e.target as HTMLInputElement).value;
    writeHash();
    render();
  });
  window.addEventListener('hashchange', () => {
    readHash();
    render();
  });
  el('refresh').addEventListener('click', () => void refresh());

  // Atualiza ao voltar para a aba e a cada minuto enquanto ela está visível.
  document.addEventListener('visibilitychange', refreshIfStale);
  window.addEventListener('focus', refreshIfStale);
  setInterval(() => {
    if (document.visibilityState === 'visible') void refresh();
  }, AUTO_REFRESH_MS);
  setInterval(() => {
    if (document.visibilityState === 'visible') renderUpdated();
  }, 1000);

  void refresh();
}

init();
