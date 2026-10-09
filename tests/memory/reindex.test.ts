import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INDEX_HEADER, buildIndex, loadTrack, reindex } from '../../src/memory/reindex';

const FIXTURE = fileURLToPath(new URL('../fixtures/memory/projeto', import.meta.url));

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'builderdev-reindex-'));
  cpSync(FIXTURE, root, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function knowledge(slug: string, module: string) {
  writeFileSync(
    join(root, `.dev/memory/${slug}.md`),
    `---\ntrack: conhecimento\ntype: pratica\nmodule: ${module}\nsummary: Resumo de ${slug}\ntags: [extra]\ncreated: 2026-10-01\n---\n\n# ${slug}\n`,
  );
}

const MEMORY_INDEX = [
  INDEX_HEADER,
  '# Memória · 3 entradas',
  '',
  '- [camadas-reprojetadas-na-carga](camadas-reprojetadas-na-carga.md) · conhecimento/convencao · geom · crs, reprojecao - Camadas são reprojetadas para o CRS do projeto na carga; viewshed e buffer dependem disso',
  '- [fixtures-de-camadas](fixtures-de-camadas.md) · conhecimento/ferramenta · testes · pytest, fixtures - Testes de geometria usam as camadas pequenas de tests/dados, nunca shapefiles reais',
  '- [ponte-js-python](ponte-js-python.md) · conhecimento/padrao · ui-web · pywebview, api-js - O front chama o Python só pela classe Api exposta ao pywebview, nunca por evaluate_js',
  '',
].join('\n');

const ERRORS_INDEX = [
  INDEX_HEADER,
  '# Erros · 2 entradas',
  '',
  '- [viewshed-crs-metrico](viewshed-crs-metrico.md) · bug/dados · geom · crs, viewshed - Viewshed exige CRS métrico; em graus a máscara sai deslocada',
  '- [pywebview-thread-ui](pywebview-thread-ui.md) · bug/ui · ui-web · pywebview, threads - Chamar o pywebview fora da thread principal trava a janela no Windows',
  '',
].join('\n');

describe('reindex', () => {
  it('gera uma linha por entrada, ordenada por module e depois por slug', () => {
    const results = reindex(root);

    expect(read('.dev/memory/index.md')).toBe(MEMORY_INDEX);
    expect(read('.dev/errors/index.md')).toBe(ERRORS_INDEX);
    expect(results.map((r) => [r.path, r.entries, r.lines, r.changed, r.overBudget])).toEqual([
      ['.dev/memory/index.md', 3, 6, true, false],
      ['.dev/errors/index.md', 2, 5, true, false],
    ]);
  });

  it('produz os mesmos bytes na segunda execução e não regrava o arquivo', () => {
    reindex(root);
    const first = readFileSync(join(root, '.dev/memory/index.md'));
    const mtime = statSync(join(root, '.dev/memory/index.md')).mtimeMs;

    const second = reindex(root);

    expect(readFileSync(join(root, '.dev/memory/index.md')).equals(first)).toBe(true);
    expect(statSync(join(root, '.dev/memory/index.md')).mtimeMs).toBe(mtime);
    expect(second.map((r) => [r.entries, r.changed])).toEqual([[3, false], [2, false]]);
  });

  it('a ordem não depende da ordem de leitura dos arquivos', () => {
    const { entries } = loadTrack(root, 'conhecimento');

    expect(buildIndex('conhecimento', [...entries].reverse())).toBe(MEMORY_INDEX);
    expect(buildIndex('conhecimento', [entries[1]!, entries[2]!, entries[0]!])).toBe(MEMORY_INDEX);
  });

  it('entrada nova aparece na linha do seu module, em ordem de slug', () => {
    reindex(root);
    knowledge('mocks-de-janela', 'testes');
    knowledge('area-de-trabalho', 'geom');

    const [memory] = reindex(root);

    const lines = read('.dev/memory/index.md').split('\n');
    expect(memory!.changed).toBe(true);
    expect(lines[1]).toBe('# Memória · 5 entradas');
    expect(lines.slice(3, 8).map((l) => /\[(.+?)\]/.exec(l)![1])).toEqual([
      'area-de-trabalho',
      'camadas-reprojetadas-na-carga',
      'fixtures-de-camadas',
      'mocks-de-janela',
      'ponte-js-python',
    ]);
    expect(lines[6]).toBe('- [mocks-de-janela](mocks-de-janela.md) · conhecimento/pratica · testes · extra - Resumo de mocks-de-janela');
  });

  it('acusa o orçamento de 200 linhas, mas grava o índice', () => {
    rmSync(join(root, '.dev/memory'), { recursive: true });
    mkdirSync(join(root, '.dev/memory'));
    for (let i = 1; i <= 197; i++) knowledge(`entrada-${String(i).padStart(3, '0')}`, 'geom');

    expect(reindex(root)[0]!).toMatchObject({ entries: 197, lines: 200, overBudget: false });

    knowledge('entrada-198', 'geom');
    expect(reindex(root)[0]!).toMatchObject({ entries: 198, lines: 201, overBudget: true, changed: true });
    expect(read('.dev/memory/index.md').split('\n')).toHaveLength(202);
  });

  it('deixa fora do índice a entrada de frontmatter ilegível, e indexa as demais', () => {
    writeFileSync(join(root, '.dev/memory/quebrada.md'), '---\ntags: [a\n---\n');

    const [memory] = reindex(root);

    expect(memory!.entries).toBe(3);
    expect(memory!.skipped.map((s) => [s.path.replace(/\\/g, '/').replace(/^.*\/\.dev/, '.dev'), s.line])).toEqual([['.dev/memory/quebrada.md', 2]]);
    expect(read('.dev/memory/index.md')).toBe(MEMORY_INDEX);
  });

  it('ignora a trilha cuja pasta não existe', () => {
    rmSync(join(root, '.dev/errors'), { recursive: true });

    expect(reindex(root).map((r) => r.track)).toEqual(['conhecimento']);
  });
});
