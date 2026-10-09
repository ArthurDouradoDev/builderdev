import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { corpusProblems, lintMemory, similar } from '../../src/memory/lint';
import { parseEntry } from '../../src/memory/schema';

/** Entrada de conhecimento mínima com o `module` e as tags dados. */
function entry(slug: string, module: string, tags: string[], created = '2026-09-01') {
  const source = `---\ntrack: conhecimento\ntype: padrao\nmodule: ${module}\nsummary: Resumo de ${slug}\ntags: [${tags.join(', ')}]\ncreated: ${created}\n---\n\n# ${slug}\n`;
  return parseEntry(source, `/projeto/.dev/memory/${slug}.md`);
}

const warnings = (entries: ReturnType<typeof entry>[]) =>
  [...corpusProblems(entries)].flatMap(([path, problems]) => problems.map((p) => `${path.replace(/^.*\//, '')}:${p.line} ${p.code} ${p.message}`));

describe('regra do corpus', () => {
  it('ui-web vs ui_web, teste vs testes e pywebview vs py-webview geram aviso com sugestão', () => {
    expect(warnings([entry('a', 'ui-web', ['teste']), entry('b', 'ui-web', ['teste']), entry('c', 'ui_web', ['testes'])])).toEqual([
      'c.md:4 corpus-module module "ui_web" é quase igual a "ui-web", já usado em 2 entradas: use "ui-web"',
      'c.md:6 corpus-tag tag "testes" é quase igual a "teste", já usada em 2 entradas: use "teste"',
    ]);
    expect(warnings([entry('a', 'janela', ['pywebview']), entry('b', 'janela', ['py-webview'], '2026-09-20')])).toEqual([
      'b.md:6 corpus-tag tag "py-webview" é quase igual a "pywebview", já usada em 1 entrada: use "pywebview"',
    ]);
  });

  it('sugere o valor em minúsculas quando os dois são igualmente usados', () => {
    expect(warnings([entry('antiga', 'geom', ['crs'], '2026-09-01'), entry('nova', 'Geom', ['crs'], '2026-08-01')])).toEqual([
      'nova.md:4 corpus-module module "Geom" é quase igual a "geom", já usado em 1 entrada: use "geom"',
    ]);
  });

  it('tolera erro de digitação proporcional ao tamanho', () => {
    expect(similar('viewshed', 'viewshad')).toBe(true);
    expect(similar('reprojecao', 'reprojeção')).toBe(true);
    expect(similar('fixture', 'fixtrue')).toBe(false);
    expect(similar('pytest', 'pytests')).toBe(true);
  });

  it('valores realmente distintos não geram aviso', () => {
    for (const [a, b] of [['ui', 'ux'], ['node', 'mode'], ['geom', 'dados'], ['teste', 'texto'], ['frontend', 'backend'], ['crs', 'css'], ['api-js', 'api-py']]) {
      expect(similar(a!, b!), `${a} vs ${b}`).toBe(false);
    }
    expect(warnings([entry('a', 'geom', ['crs', 'viewshed']), entry('b', 'ui-web', ['css', 'pywebview']), entry('c', 'dados', ['teste'])])).toEqual([]);
  });

  it('o lint de um arquivo compara com o corpus do projeto inteiro', () => {
    const root = mkdtempSync(join(tmpdir(), 'builderdev-corpus-'));
    try {
      cpSync(fileURLToPath(new URL('../fixtures/memory/projeto', import.meta.url)), root, { recursive: true });
      const nova = join(root, '.dev/memory/nova.md');
      writeFileSync(nova, `---\ntrack: conhecimento\ntype: decisao\nmodule: Geom\nsummary: Nova entrada\ntags: [crs]\ncreated: 2026-10-06\n---\n\n# Nova\n`);

      const reports = lintMemory(root, [nova]);

      expect(reports).toEqual([
        {
          file: nova,
          problems: [{ line: 4, severity: 'aviso', code: 'corpus-module', message: 'module "Geom" é quase igual a "geom", já usado em 2 entradas: use "geom"' }],
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
