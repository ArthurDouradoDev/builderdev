import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { linkKind, plainInline, renderInline, renderMarkdown } from '../../src/dashboard/ui/markdown';

const md = (s: string) => renderMarkdown(s);

describe('renderMarkdown', () => {
  it('<script> no texto sai escapado, em parágrafo, lista, título e código', () => {
    const html = md('<script>alert(1)</script>\n\n- <img src=x onerror=alert(1)>\n\n# <b>t</b>\n\n`<i>`\n\n```\n<script>\n```');
    expect(html).not.toMatch(/<script|<img|<b>|<i>/);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('<code>&lt;i&gt;</code>');
  });

  it('aspas não escapam de atributos', () => {
    const html = md('[x](https://exemplo.com/"onmouseover="alert(1))');
    expect(html).not.toContain('"onmouseover');
  });

  it('listas aninhadas', () => {
    const html = md('- um\n  - um.a\n    - um.a.i\n  - um.b\n- dois\n\n1. primeiro\n2. segundo');
    expect(html).toBe(
      '<ul><li>um<ul><li>um.a<ul><li>um.a.i</li></ul></li><li>um.b</li></ul></li><li>dois</li></ul>\n' +
        '<ol><li>primeiro</li><li>segundo</li></ol>',
    );
  });

  it('item com parágrafo depois de linha vazia continua no item', () => {
    const html = md('- **`build.mjs`:** faz dois bundles:\n  - o CLI;\n  - a UI.\n\n  `package.json`: o script.\n- outro');
    expect(html).toContain('<li><p><strong><code>build.mjs</code>:</strong> faz dois bundles:</p>');
    expect(html).toContain('<ul><li>o CLI;</li><li>a UI.</li></ul>');
    expect(html).toContain('<p><code>package.json</code>: o script.</p></li><li>outro</li>');
  });

  it('bloco de código preserva o conteúdo, indentação e linhas vazias', () => {
    const source = '```\n┌──┐\n│ a  *b* `c` │\n\n  <x>\n└──┘\n```';
    expect(md(source)).toBe('<pre class="md-code"><code>┌──┐\n│ a  *b* `c` │\n\n  &lt;x&gt;\n└──┘</code></pre>');
  });

  it('bloco de código dentro de item de lista', () => {
    const html = md('- passo:\n\n  ```\n  npm test\n  ```');
    expect(html).toContain('<pre class="md-code"><code>npm test</code></pre>');
  });

  it('negrito, itálico, código inline e links', () => {
    expect(renderInline('**forte** e *leve* e _também_ e `a*b*c`')).toBe(
      '<strong>forte</strong> e <em>leve</em> e <em>também</em> e <code>a*b*c</code>',
    );
    // Sublinhado no meio da palavra não é itálico.
    expect(renderInline('node_modules e snake_case_name')).toBe('node_modules e snake_case_name');
  });

  it('link externo abre em nova aba com rel="noopener"', () => {
    const html = renderInline('veja [a doc](https://code.claude.com/docs)');
    expect(html).toBe('veja <a href="https://code.claude.com/docs" target="_blank" rel="noopener noreferrer">a doc</a>');
  });

  it('link relativo a arquivo do projeto aparece como caminho, sem link', () => {
    const html = renderInline('[CONCEPCAO §6.2](CONCEPCAO.md#62-arquitetura)');
    expect(html).not.toContain('<a');
    expect(html).toContain('CONCEPCAO §6.2');
    expect(html).toContain('<code class="md-ref__path">CONCEPCAO.md#62-arquitetura</code>');
    // Rótulo que é o próprio nome do arquivo não se repete.
    expect(renderInline('[CONCEPCAO](CONCEPCAO.md#7)')).toBe('<span class="md-ref"><code class="md-ref__path">CONCEPCAO.md#7</code></span>');
  });

  it('link javascript: (e outros esquemas) não vira link', () => {
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x']) {
      const html = renderInline(`[clique](${href})`);
      expect(html, href).toBe('clique');
    }
    // Com espaço no endereço nem é link em markdown; e o esquema disfarçado também é reconhecido.
    expect(renderInline('[clique](java\tscript:alert(1))')).not.toContain('<a');
    expect(linkKind('java\tscript:alert(1)')).toBe('texto');
    expect(linkKind(' javascript:alert(1)')).toBe('texto');
    expect(linkKind('#secao')).toBe('texto');
    expect(linkKind('C:/Users/x')).toBe('texto');
    expect(linkKind('../x.md')).toBe('arquivo');
    expect(linkKind('http://exemplo.com')).toBe('externo');
  });

  it('rótulo de link com código e ênfase', () => {
    expect(renderInline('[`npm` **já**](https://npmjs.com)')).toBe(
      '<a href="https://npmjs.com" target="_blank" rel="noopener noreferrer"><code>npm</code> <strong>já</strong></a>',
    );
  });

  it('caixa de marcar vira item comum e comentários HTML somem', () => {
    expect(md('- [ ] abrir o painel\n- [x] fechar\n<!-- nota -->')).toBe('<ul><li>abrir o painel</li><li>fechar</li></ul>');
  });

  it('títulos com deslocamento de nível', () => {
    expect(renderMarkdown('## Escopo', { headingOffset: 2 })).toBe('<h4>Escopo</h4>');
    expect(renderMarkdown('#### Fundo', { headingOffset: 4 })).toBe('<h6>Fundo</h6>');
  });

  it('plainInline tira a marcação', () => {
    expect(plainInline('**SQLite** e `fs.watch`: [veja](x.md)')).toBe('SQLite e fs.watch: veja');
  });

  it('o próprio .dev/plans/v2-dashboard.md renderiza sem lançar erro', () => {
    const source = readFileSync(fileURLToPath(new URL('../../.dev/plans/v2-dashboard.md', import.meta.url)), 'utf8');
    const html = md(source.replace(/^---[\s\S]*?\n---\n/, ''));
    expect(html).toContain('<h2>f3 · Página do projeto e fluxo do plano</h2>');
    expect(html).toContain('<pre class="md-code"><code>┌───');
    expect(html).not.toMatch(/<script/i);
  });
});
