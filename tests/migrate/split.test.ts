import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { splitFiles, splitMarkdown } from '../../src/migrate/split';
import { buildCli, runCli, type BuiltCli } from '../helpers/cli';

const MEMORY = [
  '# MEMORY', //                                   1
  '', //                                           2
  '## Pywebview', //                               3
  '', //                                           4
  'Notas gerais da ponte.', //                     5
  '', //                                           6
  '### Threads', //                                7
  '', //                                           8
  'Só a thread principal mexe na janela.', //      9
  '', //                                           10
  '#### Exemplo', //                               11
  '', //                                           12
  '```python', //                                  13
  '# isto é comentário, não título', //            14
  '## nem isto', //                                15
  '```', //                                        16
  '', //                                           17
  '## Build', //                                   18
  '', //                                           19
  '~~~~', //                                       20
  '# dentro de til', //                            21
  '~~~', //                                        22
  '# ainda dentro: o bloco só fecha com 4 tis', // 23
  '~~~~', //                                       24
  'Rodar npm ci antes.', //                        25
  '', //                                           26
  '', //                                           27
].join('\n');

describe('splitMarkdown', () => {
  it('cada título abre um candidato, com o caminho dos títulos que o contêm, sem o título do documento', () => {
    const candidates = splitMarkdown('MEMORY.md', MEMORY);
    expect(candidates.map((c) => ({ path: c.path, start: c.startLine, end: c.endLine }))).toEqual([
      { path: ['Pywebview'], start: 3, end: 5 },
      { path: ['Pywebview', 'Threads'], start: 7, end: 9 },
      { path: ['Pywebview', 'Threads', 'Exemplo'], start: 11, end: 16 },
      { path: ['Build'], start: 18, end: 25 },
    ]);
  });

  it('o título do documento fica no caminho do próprio trecho, e vários # ficam em todos', () => {
    const titled = splitMarkdown('a.md', ['# Memória', 'Intro.', '## Build', 'npm ci'].join('\n'));
    expect(titled.map((c) => c.path)).toEqual([['Memória'], ['Build']]);
    const many = splitMarkdown('b.md', ['# Parte 1', '## A', 'texto', '# Parte 2', '## B', 'texto'].join('\n'));
    expect(many.map((c) => c.path)).toEqual([['Parte 1', 'A'], ['Parte 2', 'B']]);
  });

  it('título dentro de bloco de código não divide', () => {
    const exemplo = splitMarkdown('MEMORY.md', MEMORY)[2]!;
    expect(exemplo.lines).toEqual(['#### Exemplo', '', '```python', '# isto é comentário, não título', '## nem isto', '```']);
    const build = splitMarkdown('MEMORY.md', MEMORY)[3]!;
    expect(build.lines.at(-1)).toBe('Rodar npm ci antes.');
  });

  it('o texto de cada candidato é o do intervalo de linhas registrado', () => {
    const lines = MEMORY.split('\n');
    for (const c of splitMarkdown('MEMORY.md', MEMORY)) {
      expect(c.lines).toEqual(lines.slice(c.startLine - 1, c.endLine));
    }
  });

  it('texto antes do primeiro título vira candidato; título sem conteúdo não', () => {
    const text = ['Intro solta.', '', '# Erros', '', '## Viewshed', 'Precisa de CRS métrico.', '## Vazio', '', ''].join('\r\n');
    expect(splitMarkdown('ERRORS.md', text).map((c) => [c.path.join(' › '), c.startLine, c.endLine])).toEqual([
      ['', 1, 1],
      ['Viewshed', 5, 6],
    ]);
  });

  it('arquivo sem títulos vira um candidato só', () => {
    const candidates = splitMarkdown('notas.md', '\n\nlinha 1\n\nlinha 2\n');
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ path: [], startLine: 3, endLine: 5, lines: ['linha 1', '', 'linha 2'] });
  });

  it('arquivo vazio não gera candidato', () => {
    expect(splitMarkdown('vazio.md', '\n  \n')).toEqual([]);
  });
});

describe('splitFiles', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'builderdev-split-'));
    mkdirSync(join(root, '.dev'));
    writeFileSync(join(root, 'MEMORY.md'), MEMORY);
    writeFileSync(join(root, 'ERRORS.md'), '# Erros\n\n## Janela travada\n\nUsar a thread principal.\n');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('grava NNN.md com a origem no frontmatter e o trecho intacto, numerando na ordem dos arquivos', () => {
    const result = splitFiles(root, ['MEMORY.md', join(root, 'ERRORS.md')]);
    const dir = join(root, '.dev/.local/migration');

    expect(result.written.map((w) => w.file)).toEqual(['001.md', '002.md', '003.md', '004.md', '005.md']);
    const last = readFileSync(join(dir, '005.md'), 'utf8');
    const [, yaml, body] = last.split(/^---$/m);
    expect(parse(yaml!)).toEqual({ candidato: '005', origem: 'ERRORS.md:3-5', secao: 'Janela travada' });
    expect(body).toBe('\n\n## Janela travada\n\nUsar a thread principal.\n');
  });

  it('nova execução substitui os candidatos anteriores e preserva o decisoes.md', () => {
    splitFiles(root, ['MEMORY.md', 'ERRORS.md']);
    const dir = join(root, '.dev/.local/migration');
    writeFileSync(join(dir, 'decisoes.md'), '| candidato | decisão | motivo |\n');

    const again = splitFiles(root, ['ERRORS.md']);
    expect(again.replaced).toBe(5);
    expect(readdirSync(dir).sort()).toEqual(['001.md', 'decisoes.md']);
  });
});

describe('builderdev migrate split', { timeout: 30_000 }, () => {
  let cliDir: string;
  let cli: BuiltCli;
  let root: string;

  beforeAll(() => {
    cliDir = mkdtempSync(join(tmpdir(), 'builderdev-cli-'));
    cli = buildCli(cliDir);
  });

  afterAll(() => {
    rmSync(cliDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'builderdev-splitcli-'));
    writeFileSync(join(root, 'MEMORY.md'), MEMORY);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lista um candidato por linha, com origem e seção', () => {
    mkdirSync(join(root, '.dev'));
    const r = runCli(cli, root, 'migrate', 'split', 'MEMORY.md');
    expect(r.status).toBe(0);
    expect(r.stdout.split('\n')).toEqual([
      '001  MEMORY.md:3-5    Pywebview (3 linhas)',
      '002  MEMORY.md:7-9    Pywebview › Threads (3 linhas)',
      '003  MEMORY.md:11-16  Pywebview › Threads › Exemplo (6 linhas)',
      '004  MEMORY.md:18-25  Build (8 linhas)',
      '4 candidatos em .dev/.local/migration/',
      '',
    ]);
  });

  it('exige o .dev/ e arquivos existentes', () => {
    expect(runCli(cli, root, 'migrate', 'split', 'MEMORY.md')).toMatchObject({ status: 1 });
    expect(existsSync(join(root, '.dev'))).toBe(false);

    mkdirSync(join(root, '.dev'));
    const missing = runCli(cli, root, 'migrate', 'split', 'MEMORY.md', 'ERRORS.md');
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('ERRORS.md');
    expect(existsSync(join(root, '.dev/.local/migration'))).toBe(false);
    expect(runCli(cli, root, 'migrate', 'split')).toMatchObject({ status: 2 });
    expect(runCli(cli, root, 'migrate', 'juntar')).toMatchObject({ status: 2 });
  });
});
