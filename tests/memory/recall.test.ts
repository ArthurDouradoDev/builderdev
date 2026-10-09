import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FULL_LIMIT, formatRecall, parseTerms, recall } from '../../src/memory/recall';

const root = fileURLToPath(new URL('../fixtures/memory/projeto', import.meta.url));
const slugs = (terms: string[]) => recall(root, terms).map((h) => h.entry.slug);

describe('recall', () => {
  it('a entrada com a tag exata vem primeiro', () => {
    expect(slugs(['viewshed'])).toEqual(['viewshed-crs-metrico', 'camadas-reprojetadas-na-carga']);
    expect(slugs(['pywebview'])).toEqual(['pywebview-thread-ui', 'ponte-js-python']);
  });

  it('mostra os campos que coincidiram, na ordem de peso', () => {
    const [first, second] = recall(root, ['viewshed', 'crs']);

    expect(first!.matches).toEqual([
      { field: 'tags', values: ['crs', 'viewshed'] },
      { field: 'applies_when', values: ['viewshed'] },
      { field: 'summary', values: ['viewshed', 'crs'] },
      { field: 'title', values: ['viewshed', 'crs'] },
    ]);
    expect(second!.entry.slug).toBe('camadas-reprojetadas-na-carga');
    expect(second!.score).toBeLessThan(first!.score);
  });

  it('formata no padrão da interface', () => {
    expect(formatRecall(root, recall(root, ['threads']))).toBe(
      [
        '1. .dev/errors/pywebview-thread-ui.md   bug/ui · ui-web',
        '   Chamar o pywebview fora da thread principal trava a janela no Windows',
        '   coincidiu: tags(threads), summary(threads), title(threads)',
      ].join('\n'),
    );
  });

  it('normaliza acento, caixa e plural, e casa parte de tag ou module com hífen', () => {
    expect(slugs(['Reprojeção'])[0]).toBe('camadas-reprojetadas-na-carga');
    expect(recall(root, ['web']).map((h) => h.matches[0])).toEqual([
      { field: 'module', values: ['ui-web'] },
      { field: 'module', values: ['ui-web'] },
    ]);
  });

  it('termo sem resultado devolve lista vazia sem erro', () => {
    expect(recall(root, ['kubernetes'])).toEqual([]);
    expect(recall(fileURLToPath(new URL('../fixtures/plans', import.meta.url)), ['viewshed'])).toEqual([]);
  });

  it('devolve no máximo 5 resultados, e --full imprime o conteúdo de só 3', () => {
    const hits = recall(root, ['crs', 'pywebview', 'pytest']);
    expect(hits).toHaveLength(5);

    const text = formatRecall(root, hits, { full: true });
    const headers = text.split('\n').filter((l) => l.startsWith('===== '));

    const rel = (path: string) => relative(root, path).split(sep).join('/');
    expect(headers).toEqual(hits.slice(0, FULL_LIMIT).map((h) => `===== ${rel(h.entry.path)} =====`));
    expect(text).toContain('root_cause: o cálculo de distância');
    expect(formatRecall(root, hits)).not.toContain('=====');
  });

  it('separa termos por espaço e vírgula, sem palavras vazias e sem repetição', () => {
    expect(parseTerms(['de', 'viewshed,crs', 'CRS', 'para a', 'x'])).toEqual(['viewshed', 'crs']);
  });
});

describe('skills/recall/SKILL.md', () => {
  const skill = readFileSync(fileURLToPath(new URL('../../skills/recall/SKILL.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

  it('tem até 8 KB, pode ser invocada pelo modelo e manda sinalizar contradição com o código', () => {
    expect(Buffer.byteLength(skill)).toBeLessThanOrEqual(8 * 1024);
    expect(skill).toMatch(/^---\nname: recall\ndescription: .+/);
    expect(skill).not.toContain('disable-model-invocation');
    const steps = ['builderdev recall', 'Leia por completo só o que é relevante', 'contradiz o código'].map((s) => skill.indexOf(s));
    expect(steps.every((i) => i > 0)).toBe(true);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });
});
