import { describe, expect, it } from 'vitest';
import { type LayoutInput, LAYER_GAP, NODE_HEIGHT, NODE_WIDTH, PADDING, ROW_GAP, layoutGraph } from '../../src/dashboard/layout';

const at = (layout: ReturnType<typeof layoutGraph>) => Object.fromEntries(layout.nodes.map((n) => [n.id, [n.layer, n.row]]));
const ys = (layout: ReturnType<typeof layoutGraph>) => Object.fromEntries(layout.nodes.map((n) => [n.id, n.y]));

describe('layoutGraph', () => {
  it('plano linear vira uma linha só', () => {
    const layout = layoutGraph([
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
      { id: 'f3', dependsOn: ['f2'] },
    ]);
    expect(at(layout)).toEqual({ f1: [0, 0], f2: [1, 0], f3: [2, 0] });
    expect(new Set(Object.values(ys(layout)))).toEqual(new Set([PADDING]));
    expect(layout.layers).toBe(3);
    expect(layout.width).toBe(PADDING * 2 + 3 * NODE_WIDTH + 2 * LAYER_GAP);
    expect(layout.height).toBe(PADDING * 2 + NODE_HEIGHT);
    expect(layout.edges.map((e) => [e.from, e.to])).toEqual([
      ['f1', 'f2'],
      ['f2', 'f3'],
    ]);
  });

  it('needs paralelo: f2 e f3 dependem só de f1 e ficam na mesma camada, na ordem do YAML', () => {
    const layout = layoutGraph([
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
      { id: 'f3', dependsOn: ['f1'] },
    ]);
    expect(at(layout)).toEqual({ f1: [0, 0], f2: [1, 0], f3: [1, 1] });
    expect(layout.layers).toBe(2);
    // f1 fica centrada na altura das duas.
    const y = ys(layout);
    expect(y.f1).toBe(PADDING + (NODE_HEIGHT + ROW_GAP) / 2);
    expect(y.f3! - y.f2!).toBe(NODE_HEIGHT + ROW_GAP);
  });

  it('diamante: f4 depende de f2 e f3 e vai para a camada seguinte', () => {
    const layout = layoutGraph([
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
      { id: 'f3', dependsOn: ['f1'] },
      { id: 'f4', dependsOn: ['f2', 'f3'], blockedBy: ['f3'] },
      { id: 'f5', dependsOn: ['f4'] },
    ]);
    expect(at(layout)).toEqual({ f1: [0, 0], f2: [1, 0], f3: [1, 1], f4: [2, 0], f5: [3, 0] });
    expect(layout.edges.map((e) => `${e.from}>${e.to}${e.pending ? ' pendente' : ''}`)).toEqual([
      'f1>f2',
      'f1>f3',
      'f2>f4',
      'f3>f4 pendente',
      'f4>f5',
    ]);
  });

  it('a camada é o maior caminho, não o menor', () => {
    // f3 depende de f1 direto e de f2 (que depende de f1): fica depois de f2.
    const layout = layoutGraph([
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
      { id: 'f3', dependsOn: ['f1', 'f2'] },
    ]);
    expect(at(layout).f3).toEqual([2, 0]);
  });

  it('aresta sai do lado direito da origem e chega no lado esquerdo do destino', () => {
    const layout = layoutGraph([
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
    ]);
    const [edge] = layout.edges;
    const [f1, f2] = layout.nodes;
    expect(edge!.path.startsWith(`M ${f1!.x + NODE_WIDTH} ${f1!.y + NODE_HEIGHT / 2} C`)).toBe(true);
    expect(edge!.path.endsWith(`${f2!.x} ${f2!.y + NODE_HEIGHT / 2}`)).toBe(true);
  });

  it('saída idêntica em duas execuções', () => {
    const phases: LayoutInput[] = [
      { id: 'f1', dependsOn: [] },
      { id: 'f2', dependsOn: ['f1'] },
      { id: 'f3', dependsOn: ['f1'] },
      { id: 'f4', dependsOn: ['f2', 'f3'], blockedBy: ['f2', 'f3'] },
    ];
    expect(JSON.stringify(layoutGraph(phases))).toBe(JSON.stringify(layoutGraph(structuredClone(phases))));
  });

  it('dependência desconhecida é ignorada e ciclo não trava', () => {
    const layout = layoutGraph([
      { id: 'f1', dependsOn: ['f3'] },
      { id: 'f2', dependsOn: ['f1', 'nao-existe'] },
      { id: 'f3', dependsOn: ['f2'] },
    ]);
    expect(layout.nodes).toHaveLength(3);
    // As arestas desenhadas sempre andam para a direita; a que fecha o ciclo fica de fora.
    for (const e of layout.edges) {
      const from = layout.nodes.find((n) => n.id === e.from)!;
      const to = layout.nodes.find((n) => n.id === e.to)!;
      expect(from.layer).toBeLessThan(to.layer);
    }
    expect(layout.edges.some((e) => e.from === 'nao-existe')).toBe(false);
  });

  it('plano sem fases não desenha nada', () => {
    expect(layoutGraph([])).toEqual({ nodes: [], edges: [], width: 0, height: 0, layers: 0 });
  });
});
