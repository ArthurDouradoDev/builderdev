// Layout em camadas do grafo de fases: puro e determinístico, usado pela UI para desenhar o SVG.

/** O que o layout precisa de cada fase: `dependsOn` efetivo (o do `planStatus`) e as dependências pendentes. */
export interface LayoutInput {
  id: string;
  dependsOn: string[];
  blockedBy?: string[];
}

export interface LayoutNode {
  id: string;
  /** Coluna: o maior caminho até a fase a partir das fases sem dependência. */
  layer: number;
  /** Posição dentro da camada, na ordem do YAML. */
  row: number;
  /** Canto superior esquerdo do card, em px. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  /** A dependência ainda não foi concluída: a aresta sai tracejada. */
  pending: boolean;
  /** Curva de Bézier do lado direito de `from` ao lado esquerdo de `to`, pronta para o `d` de um `<path>`. */
  path: string;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  /** Quantas camadas (colunas) o grafo tem. */
  layers: number;
}

export const NODE_WIDTH = 196;
export const NODE_HEIGHT = 84;
/** Espaço horizontal entre camadas: cabe a curva e a ponta da seta. */
export const LAYER_GAP = 52;
export const ROW_GAP = 20;
/** Margem em volta do desenho, para o anel de foco e a sombra não serem cortados. */
export const PADDING = 8;

/**
 * Posições dos nós e arestas do grafo de `phases`. Dependências para ids desconhecidos são ignoradas;
 * num ciclo (que o `lint` acusa), a aresta que fecha o ciclo não conta para a camada.
 * Cada camada é centrada na vertical em relação à mais alta, então um plano linear vira uma linha só.
 */
export function layoutGraph(phases: LayoutInput[]): GraphLayout {
  const byId = new Map(phases.map((p) => [p.id, p]));
  const layerOf = new Map<string, number>();
  const visiting = new Set<string>();

  const layer = (id: string): number => {
    const known = layerOf.get(id);
    if (known !== undefined) return known;
    visiting.add(id);
    let result = 0;
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(dep) || visiting.has(dep)) continue;
      result = Math.max(result, layer(dep) + 1);
    }
    visiting.delete(id);
    layerOf.set(id, result);
    return result;
  };
  for (const p of phases) layer(p.id);

  const columns: string[][] = [];
  for (const p of phases) {
    if (columns[layerOf.get(p.id)!]?.includes(p.id)) continue; // id repetido no YAML: um nó só
    (columns[layerOf.get(p.id)!] ??= []).push(p.id);
  }
  // Camadas vazias não acontecem (cada camada > 0 tem quem a alimente), mas o desenho não depende disso.
  const tallest = Math.max(0, ...columns.map((c) => c?.length ?? 0));
  const columnHeight = (rows: number) => rows * NODE_HEIGHT + Math.max(0, rows - 1) * ROW_GAP;

  const nodes: LayoutNode[] = [];
  const nodeById = new Map<string, LayoutNode>();
  columns.forEach((column, layerIndex) => {
    if (!column) return;
    const offset = (columnHeight(tallest) - columnHeight(column.length)) / 2;
    column.forEach((id, row) => {
      const node: LayoutNode = {
        id,
        layer: layerIndex,
        row,
        x: PADDING + layerIndex * (NODE_WIDTH + LAYER_GAP),
        y: PADDING + offset + row * (NODE_HEIGHT + ROW_GAP),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
      nodes.push(node);
      nodeById.set(id, node);
    });
  });

  const edges: LayoutEdge[] = [];
  const seen = new Set<string>();
  for (const p of phases) {
    const target = nodeById.get(p.id)!;
    for (const dep of p.dependsOn) {
      const source = nodeById.get(dep);
      const key = `${dep}\0${p.id}`;
      // Só arestas que andam para a direita: a que fecha um ciclo fica de fora do desenho.
      if (!source || source.layer >= target.layer || seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: dep, to: p.id, pending: (p.blockedBy ?? []).includes(dep), path: curve(source, target) });
    }
  }

  return {
    nodes,
    edges,
    width: nodes.length ? PADDING * 2 + columns.length * NODE_WIDTH + (columns.length - 1) * LAYER_GAP : 0,
    height: nodes.length ? PADDING * 2 + columnHeight(tallest) : 0,
    layers: columns.length,
  };
}

/** Curva horizontal suave; os pontos de controle ficam no meio do vão entre as duas colunas. */
function curve(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const bend = Math.min(LAYER_GAP, (x2 - x1) / 2);
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M ${r(x1)} ${r(y1)} C ${r(x1 + bend)} ${r(y1)}, ${r(x2 - bend)} ${r(y2)}, ${r(x2)} ${r(y2)}`;
}
