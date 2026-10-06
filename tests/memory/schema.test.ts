import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { entryTemplate } from '../../src/memory/entry';
import { lintEntry } from '../../src/memory/lint';
import { EntryParseError, parseEntry, slugProblems, validateEntry } from '../../src/memory/schema';

const fixture = (rel: string) => fileURLToPath(new URL(`../fixtures/memory/projeto/.dev/${rel}`, import.meta.url));
const source = (rel: string) => readFileSync(fixture(rel), 'utf8').replace(/\r\n/g, '\n');
const BUG = 'errors/viewshed-crs-metrico.md';
const KNOWLEDGE = 'memory/ponte-js-python.md';

/** Valida o conteúdo como se estivesse no lugar da fixture `rel`. */
const lint = (rel: string, text = source(rel)) => lintEntry(parseEntry(text, fixture(rel)));
const codes = (rel: string, text: string) => lint(rel, text).map((p) => [p.line, p.severity, p.code]);

describe('schema das entradas', () => {
  it('aceita fixtures válidas nas duas trilhas', () => {
    for (const rel of [BUG, 'errors/pywebview-thread-ui.md', KNOWLEDGE, 'memory/camadas-reprojetadas-na-carga.md', 'memory/fixtures-de-camadas.md']) {
      expect(lint(rel), rel).toEqual([]);
    }
  });

  it('lê o título do primeiro "# " do corpo e cai no slug sem ele', () => {
    expect(parseEntry(source(BUG), fixture(BUG)).title).toBe('Viewshed em CRS geográfico');
    expect(parseEntry(source(BUG).replace('# Viewshed em CRS geográfico', ''), fixture(BUG)).title).toBe('viewshed-crs-metrico');
  });

  it('acusa campo obrigatório ausente, na linha certa', () => {
    const problems = lint(KNOWLEDGE, source(KNOWLEDGE).replace('module: ui-web\n', ''));

    expect(problems).toEqual([{ line: 1, severity: 'erro', code: 'field-missing', message: 'campo "module" ausente ou vazio' }]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('summary: O front', 'summary: \nx: O front'))).toContainEqual([5, 'erro', 'field-missing']);
  });

  it('acusa type fora do enum da trilha', () => {
    const problems = lint(KNOWLEDGE, source(KNOWLEDGE).replace('type: padrao', 'type: dados'));

    expect(problems).toEqual([
      {
        line: 3,
        severity: 'erro',
        code: 'type-enum',
        message: 'type "dados" não existe na trilha conhecimento: use convencao | decisao | padrao | ferramenta | fluxo | pratica',
      },
    ]);
  });

  it('exige os campos de bug só na trilha bug', () => {
    const bug = source(BUG)
      .replace(/symptoms:\n(?: {2}- .*\n)+/, '')
      .replace(/root_cause: .*\n/, '')
      .replace('occurrences: 2', 'occurrences: 0');
    expect(codes(BUG, bug)).toEqual([
      [1, 'erro', 'field-missing'],
      [1, 'erro', 'field-missing'],
      [8, 'erro', 'occurrences-invalid'],
    ]);
    expect(lint(BUG, bug).map((p) => p.message).slice(0, 2)).toEqual([
      'campo "symptoms" ausente: lista com 1 a 5 itens',
      'campo "root_cause" ausente ou vazio (obrigatório na trilha bug)',
    ]);

    // A mesma entrada sem nenhum campo de bug é válida na trilha conhecimento.
    expect(lint(KNOWLEDGE)).toEqual([]);
    const withBugField = source(KNOWLEDGE).replace('created:', 'occurrences: 1\ncreated:');
    expect(codes(KNOWLEDGE, withBugField)).toEqual([[8, 'aviso', 'field-wrong-track']]);
  });

  it('acusa tag com maiúscula ou sublinhado e quantidade fora do limite', () => {
    expect(lint(KNOWLEDGE, source(KNOWLEDGE).replace('[pywebview, api-js]', '[PyWebview, api_js]')).map((p) => p.message)).toEqual([
      'tag "PyWebview" fora do formato: minúsculas e hífen (ex.: ui-web)',
      'tag "api_js" fora do formato: minúsculas e hífen (ex.: ui-web)',
    ]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('[pywebview, api-js]', '[]'))).toEqual([[6, 'erro', 'tags-count']]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('[pywebview, api-js]', '[a, b, c, d, e, f, g, h, i]'))).toEqual([[6, 'erro', 'tags-count']]);
    expect(lint(KNOWLEDGE, source(KNOWLEDGE).replace('[pywebview, api-js]', '[configuração, pywebview]'))).toEqual([]);
  });

  it('limita summary a uma linha de 120 caracteres e applies_when a 5 itens', () => {
    const long = 'x'.repeat(121);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace(/summary: .*/, `summary: ${long}`))).toEqual([[5, 'erro', 'summary-too-long']]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace(/summary: .*/, 'summary: |\n  linha um\n  linha dois'))).toEqual([[5, 'erro', 'summary-multiline']]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('[expor função Python ao front]', '[a, b, c, d, e, f]'))).toEqual([[7, 'erro', 'applies-when-count']]);
  });

  it('acusa data inválida, track inválida e campo desconhecido', () => {
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('2026-09-18', '2026-02-30'))).toEqual([[8, 'erro', 'date-invalid']]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('track: conhecimento', 'track: nota'))).toEqual([[2, 'erro', 'track-invalid']]);
    expect(codes(KNOWLEDGE, source(KNOWLEDGE).replace('created:', 'autor: eu\ncreated:'))).toEqual([[8, 'aviso', 'field-unknown']]);
  });

  it('acusa entrada na pasta da outra trilha', () => {
    expect(codes(KNOWLEDGE, source(BUG))).toEqual([[2, 'erro', 'track-dir-mismatch']]);
  });

  it('acusa corpo acima de 40 linhas', () => {
    const body = Array.from({ length: 40 }, (_, i) => `linha ${i + 1}`).join('\n');
    const text = source(KNOWLEDGE).replace(/---\n\n[\s\S]*$/, `---\n\n# Título\n\n${body}\n\n`);
    expect(codes(KNOWLEDGE, text)).toEqual([[10, 'erro', 'entry-too-long']]);
    expect(lint(KNOWLEDGE, text)[0]!.message).toBe('corpo com 42 linhas (máximo 40)');
  });

  it('acusa o modelo do entry new sem preencher', () => {
    const problems = lint(KNOWLEDGE, entryTemplate('conhecimento', '2026-10-06'));

    expect(problems.filter((p) => p.code === 'entry-placeholder').map((p) => p.line)).toEqual([11, 13]);
    expect(problems.filter((p) => p.code === 'field-missing').length).toBe(3);
  });

  it('frontmatter ausente ou inválido lança erro com linha', () => {
    expect(() => parseEntry('# Sem frontmatter\n', fixture(KNOWLEDGE))).toThrow(EntryParseError);
    expect(() => parseEntry('---\ntags: [a\n---\n', fixture(KNOWLEDGE))).toThrow('frontmatter inválido');
  });
});

describe('slug', () => {
  it('aceita slug simples e recusa maiúscula, acento, espaço e data', () => {
    expect(slugProblems('viewshed-crs-metrico')).toEqual([]);
    expect(slugProblems('erro-2')).toEqual([]);
    for (const bad of ['Viewshed', 'reprojeção', 'com espaco', 'a--b', '-a']) expect(slugProblems(bad)).toHaveLength(1);
    for (const dated of ['2026-09-22-viewshed', 'viewshed-2026-09-22', 'viewshed-20260922', 'sessao-2026-09']) {
      expect(slugProblems(dated)[0]).toContain('tem data no nome');
    }
  });

  it('o lint acusa arquivo com nome fora do padrão', () => {
    const path = fixture(KNOWLEDGE).replace('ponte-js-python', '2026-09-18-ponte');
    expect(validateEntry(parseEntry(source(KNOWLEDGE), path))).toEqual([]);
    expect(lintEntry(parseEntry(source(KNOWLEDGE), path)).map((p) => p.code)).toEqual(['slug-invalid']);
  });
});
