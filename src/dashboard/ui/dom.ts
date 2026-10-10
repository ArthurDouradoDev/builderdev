import { renderMarkdown } from './markdown';

// Montagem de elementos sem innerHTML: textos entram como nós de texto, atributos por setAttribute.
// A única exceção é `markdown()`, cujo HTML sai de `renderMarkdown`, que escapa todo o texto antes de formatar.

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

function setAttrs(el: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

function append(el: Element, children: Child[]): void {
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
}

/** Bloco com o markdown do plano renderizado. */
export function markdown(source: string, className = '', headingOffset = 3): HTMLDivElement {
  const el = h('div', { class: `md ${className}`.trim() });
  el.innerHTML = renderMarkdown(source, { headingOffset });
  return el;
}

/** AAAA-MM-DD em DD/MM/AAAA, sem passar por fuso. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
