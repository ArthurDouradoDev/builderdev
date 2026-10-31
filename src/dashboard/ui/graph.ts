import { type LayoutNode, layoutGraph } from '../layout';
import type { PhaseStatus, PhaseView } from './api';
import { STATUS_LABEL } from './cards';
import { h, svg } from './dom';

/** Ícone ao lado do rótulo do status: a cor nunca é o único sinal. */
export const STATUS_ICON: Record<PhaseStatus, string> = {
  concluida: '✓',
  ativa: '●',
  bloqueada: '⊘',
  pendente: '○',
};

export interface GraphView {
  el: HTMLElement;
  /** Marca a fase selecionada sem redesenhar (a seleção vem do clique, do Enter ou da URL). */
  select(id: string): void;
}

/**
 * Grafo de fases em SVG, a partir do `layoutGraph`. Cada nó é um botão (dentro de um `foreignObject`, para o texto
 * quebrar linha) com id, título e status. Tab entra no grafo pela fase selecionada; as setas andam entre os nós
 * (direita/esquerda trocam de camada, cima/baixo andam na camada); Enter ou clique selecionam.
 */
export function renderGraph(phases: PhaseView[], selected: string, onSelect: (id: string) => void): GraphView {
  const layout = layoutGraph(phases);
  const byId = new Map(phases.map((p) => [p.id, p]));
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  const root = svg('svg', {
    class: 'graph__svg',
    width: layout.width,
    height: layout.height,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    role: 'presentation',
  });
  root.append(
    svg(
      'defs',
      {},
      arrowMarker('graph-arrow', 'graph__arrow'),
      arrowMarker('graph-arrow-pending', 'graph__arrow graph__arrow--pending'),
    ),
  );

  const edges = svg('g', { class: 'graph__edges', 'aria-hidden': 'true' });
  for (const edge of layout.edges) {
    const done = byId.get(edge.from)?.status === 'concluida';
    edges.append(
      svg('path', {
        class: `graph__edge${edge.pending ? ' graph__edge--pending' : ''}${done ? ' graph__edge--done' : ''}`,
        d: edge.path,
        'marker-end': `url(#${edge.pending ? 'graph-arrow-pending' : 'graph-arrow'})`,
        'data-from': edge.from,
        'data-to': edge.to,
      }),
    );
  }
  root.append(edges);

  const buttons = new Map<string, HTMLButtonElement>();
  const nodes = svg('g', { class: 'graph__nodes' });
  for (const node of layout.nodes) {
    const phase = byId.get(node.id)!;
    const button = nodeButton(phase);
    button.addEventListener('click', () => onSelect(phase.id));
    button.addEventListener('focus', () => setTabStop(phase.id));
    buttons.set(phase.id, button);
    nodes.append(svg('foreignObject', { x: node.x, y: node.y, width: node.width, height: node.height }, button));
  }
  root.append(nodes);

  const setTabStop = (id: string) => {
    for (const [key, b] of buttons) b.tabIndex = key === id ? 0 : -1;
  };
  const select = (id: string) => {
    for (const [key, b] of buttons) {
      b.setAttribute('aria-pressed', String(key === id));
      b.classList.toggle('node--selected', key === id);
    }
    for (const path of edges.querySelectorAll<SVGPathElement>('.graph__edge')) {
      path.classList.toggle('graph__edge--related', path.dataset.from === id || path.dataset.to === id);
    }
    setTabStop(id);
  };

  const el = h(
    'div',
    { class: 'graph', role: 'group', 'aria-label': `Fases do plano: ${phases.length}. Use as setas para navegar e Enter para abrir.` },
    root,
  );
  el.addEventListener('keydown', (e) => {
    const current = (document.activeElement as HTMLElement | null)?.dataset.phase;
    const from = current ? nodeById.get(current) : undefined;
    if (!from) return;
    const target = neighbor(layout.nodes, from, e.key);
    if (!target) return;
    e.preventDefault();
    const button = buttons.get(target.id)!;
    setTabStop(target.id);
    button.focus();
    // Mantém o nó visível quando o grafo rola na horizontal.
    button.closest('foreignObject')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  select(selected);
  return { el, select };
}

function nodeButton(phase: PhaseView): HTMLButtonElement {
  const label = STATUS_LABEL[phase.status];
  const waiting = phase.status !== 'concluida' && phase.blockedBy.length ? `aguarda ${phase.blockedBy.join(', ')}` : '';
  return h(
    'button',
    {
      type: 'button',
      class: `node node--${phase.status}`,
      'data-phase': phase.id,
      'aria-label': `${phase.id} · ${phase.title || 'sem título'} — ${label}${waiting ? `, ${waiting}` : ''}`,
      title: `${phase.id} · ${phase.title}${waiting ? `\n${waiting}` : ''}`,
    },
    h(
      'span',
      { class: 'node__head', 'aria-hidden': 'true' },
      h('span', { class: 'node__id' }, phase.id),
      h('span', { class: 'node__status' }, h('span', { class: 'node__icon' }, STATUS_ICON[phase.status]), label),
    ),
    h('span', { class: 'node__title', 'aria-hidden': 'true' }, phase.title || 'sem título'),
  );
}

function arrowMarker(id: string, className: string): SVGMarkerElement {
  return svg(
    'marker',
    { id, class: className, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    svg('path', { d: 'M 0 0 L 10 5 L 0 10 z' }),
  );
}

/** Nó para onde a tecla leva a partir de `from`; `null` quando a tecla não navega ou não há para onde ir. */
export function neighbor(nodes: LayoutNode[], from: LayoutNode, key: string): LayoutNode | null {
  const center = (n: LayoutNode) => n.y + n.height / 2;
  const inLayer = (layer: number) => nodes.filter((n) => n.layer === layer).sort((a, b) => a.row - b.row);
  const closest = (list: LayoutNode[]) =>
    list.reduce<LayoutNode | null>((best, n) => (!best || Math.abs(center(n) - center(from)) < Math.abs(center(best) - center(from)) ? n : best), null);

  switch (key) {
    case 'ArrowRight':
      return closest(inLayer(from.layer + 1));
    case 'ArrowLeft':
      return closest(inLayer(from.layer - 1));
    case 'ArrowDown':
      return inLayer(from.layer).find((n) => n.row === from.row + 1) ?? null;
    case 'ArrowUp':
      return inLayer(from.layer).find((n) => n.row === from.row - 1) ?? null;
    case 'Home':
      return nodes[0] ?? null;
    case 'End':
      return nodes[nodes.length - 1] ?? null;
    default:
      return null;
  }
}
