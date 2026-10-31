// Markdown do subconjunto usado nos planos, em HTML. Sem DOM: roda no navegador e nos testes.
//
// Segurança: todo texto do plano passa por `escapeHtml` antes de qualquer marcação ser inserida, e só links
// http(s) viram <a>. O HTML gerado pode então ir para innerHTML; nenhum outro dado do projeto vai.

export interface MarkdownOptions {
  /** Soma ao nível dos títulos (`#` com 2 vira <h3>); o máximo é <h6>. */
  headingOffset?: number;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

export function renderMarkdown(source: string, options: MarkdownOptions = {}): string {
  const text = source
    .replace(/\r\n?/g, '\n')
    .replace(/\0/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  return renderBlocks(text.split('\n'), options.headingOffset ?? 0);
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?/;
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])([ \t]+|$)/;

const indentOf = (line: string) => line.length - line.trimStart().length;
const isBlank = (line: string | undefined) => line === undefined || line.trim() === '';

function renderBlocks(lines: string[], offset: number): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const indent = indentOf(line);
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const l = lines[i]!;
        const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(l);
        if (close && close[1]![0] === marker[0] && close[1]!.length >= marker.length) {
          i++;
          break;
        }
        body.push(l.slice(Math.min(indent, indentOf(l))));
        i++;
      }
      const lang = fence[2] ? ` data-lang="${escapeHtml(fence[2])}"` : '';
      out.push(`<pre class="md-code"${lang}><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(6, heading[1]!.length + offset);
      out.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) body.push(lines[i++]!.replace(QUOTE, ''));
      out.push(`<blockquote>${renderBlocks(body, offset)}</blockquote>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [html, next] = renderList(lines, i, offset);
      out.push(html);
      i = next;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i]!)) paragraph.push(lines[i++]!.trim());
    out.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, ' ')}</p>`);
  }
  return out.join('\n');
}

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || LIST_ITEM.test(line);
}

/**
 * Lista que começa em `lines[start]`. Cada item leva as linhas seguintes mais indentadas que o marcador (sub-listas,
 * parágrafos e código do item), inclusive depois de linhas vazias. Devolve o HTML e o índice da primeira linha depois.
 */
function renderList(lines: string[], start: number, offset: number): [string, number] {
  const first = LIST_ITEM.exec(lines[start]!)!;
  const baseIndent = first[1]!.length;
  const ordered = /\d/.test(first[2]!);
  const startNumber = ordered ? Number.parseInt(first[2]!, 10) : 1;
  const items: string[] = [];
  let loose = false;
  let i = start;

  while (i < lines.length) {
    const m = LIST_ITEM.exec(lines[i]!);
    if (!m || m[1]!.length !== baseIndent || /\d/.test(m[2]!) !== ordered) break;
    const contentIndent = baseIndent + m[2]!.length + Math.max(1, m[3]!.length);
    const body = [lines[i]!.slice(m[0].length)];
    i++;
    while (i < lines.length) {
      const l = lines[i]!;
      if (isBlank(l)) {
        // Linha vazia continua o item só se o que vem depois estiver indentado dentro dele.
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        if (j < lines.length && indentOf(lines[j]!) > baseIndent) {
          body.push(...lines.slice(i, j).map(() => ''));
          i = j;
          continue;
        }
        break;
      }
      if (indentOf(l) > baseIndent) {
        body.push(l.slice(Math.min(contentIndent, indentOf(l))));
        i++;
        continue;
      }
      // Continuação preguiçosa do parágrafo do item (linha sem indentação que não abre outro bloco).
      if (!startsBlock(l) && !isBlank(body[body.length - 1])) {
        body.push(l.trim());
        i++;
        continue;
      }
      break;
    }
    if (body.some((l, k) => k > 0 && isBlank(l) && body.slice(k + 1).some((x) => !isBlank(x)))) loose = true;
    items.push(itemHtml(body, offset));

    // Linhas vazias entre itens da mesma lista.
    let j = i;
    while (j < lines.length && isBlank(lines[j])) j++;
    const nextItem = j < lines.length ? LIST_ITEM.exec(lines[j]!) : null;
    if (j > i && nextItem && nextItem[1]!.length === baseIndent && /\d/.test(nextItem[2]!) === ordered) {
      loose = true;
      i = j;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  const cls = loose ? ' class="md-loose"' : '';
  return [`<${tag}${startAttr}${cls}>${items.map((x) => `<li>${x}</li>`).join('')}</${tag}>`, i];
}

/** Item com só um parágrafo sai sem <p>; o resto passa pelo renderizador de blocos. */
function itemHtml(body: string[], offset: number): string {
  // "- [ ] texto" vira texto: a validação visual é lista de instruções, não estado.
  body[0] = body[0]!.replace(/^\[[ xX]\][ \t]+/, '');
  const html = renderBlocks(body, offset);
  // Item com um parágrafo só (com ou sem sub-listas depois): o texto fica solto, como numa lista compacta.
  if ((html.match(/<p>/g) ?? []).length === 1 && html.startsWith('<p>')) return html.replace(/^<p>([\s\S]*?)<\/p>\n?/, '$1');
  return html;
}

// Marcadores internos: nunca aparecem no texto, que perde os \0 na entrada.
const slot = (n: number) => `\0${n}\0`;
const SLOT = /\0(\d+)\0/g;

/** Código inline, links, negrito e itálico. Todo o texto é escapado; o conteúdo do código vai literal. */
export function renderInline(text: string): string {
  const slots: string[] = [];
  const keep = (html: string) => slot(slots.push(html) - 1);

  let s = text.replace(/\0/g, '');
  // Código primeiro: o que está dentro dele não é formatado.
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_all, _ticks: string, code: string) => {
    const trimmed = /^ .* $/.test(code) && code.trim() ? code.slice(1, -1) : code;
    return keep(`<code>${escapeHtml(trimmed)}</code>`);
  });
  // Imagens viram o texto alternativo (o painel não carrega nada de fora).
  s = s.replace(/!\[([^\]\n]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))*)(?:\s+"[^"]*")?\s*\)/g, (_all, alt: string) => keep(emphasis(alt)));
  // O rótulo pode ter código (já guardado num marcador) e ênfase.
  s = s.replace(/\[([^\]\n]+)\]\(\s*((?:[^()\s]|\([^()\s]*\))*)(?:\s+"[^"]*")?\s*\)/g, (_all, label: string, href: string) =>
    keep(linkHtml(emphasis(label), href)),
  );
  return restore(emphasis(s), slots);
}

/** Escapa o texto e aplica negrito e itálico. Os marcadores de `slot` passam intactos. */
function emphasis(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>');
  s = s.replace(/(^|[^*\w])\*(?=[^\s*])([^*]*?[^\s*])\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_(?=[^\s_])([^_]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>');
  return s;
}

/** Troca os marcadores pelo HTML guardado; marcadores dentro do HTML guardado também. */
function restore(s: string, slots: string[]): string {
  let out = s;
  for (let n = 0; n < 5 && out.includes('\0'); n++) out = out.replace(SLOT, (_all, k: string) => slots[Number(k)] ?? '');
  return out;
}

export type LinkKind = 'externo' | 'arquivo' | 'texto';

/**
 * Como um link do plano aparece: `externo` (http/https) vira <a> em nova aba; `arquivo` (caminho relativo do
 * projeto) aparece como caminho, sem link; `texto` (âncora, `javascript:`, `data:`, `C:/...` e o resto) só o texto.
 */
export function linkKind(href: string): LinkKind {
  // O navegador ignora espaços e controles no início e no meio do esquema (`java\tscript:`).
  const compact = href.replace(/[\s\u0000-\u001f]/g, '');
  if (/^https?:\/\//i.test(compact)) return 'externo';
  if (!compact || compact.startsWith('#') || compact.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(compact)) return 'texto';
  return 'arquivo';
}

function linkHtml(label: string, href: string): string {
  switch (linkKind(href)) {
    case 'externo':
      return `<a href="${escapeHtml(href.trim())}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    case 'arquivo': {
      const path = `<code class="md-ref__path">${escapeHtml(href.trim())}</code>`;
      // "[CONCEPCAO](CONCEPCAO.md#7)": o caminho já diz o nome, então ele aparece sozinho.
      const text = label.replace(/<[^>]*>/g, '').trim().toLowerCase();
      if (text && href.toLowerCase().includes(text)) return `<span class="md-ref">${path}</span>`;
      return `<span class="md-ref">${label} ${path}</span>`;
    }
    default:
      return label;
  }
}

/** Texto puro de uma linha de markdown, para resumos (sem marcação nem HTML). */
export function plainInline(text: string): string {
  return text
    .replace(/!?\[([^\]\n]*)\]\([^)]*\)/g, '$1')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/\*\*|__|(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)/g, '')
    .trim();
}
