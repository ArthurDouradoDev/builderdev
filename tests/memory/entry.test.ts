import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { localDate, newEntry } from '../../src/memory/entry';
import { parseEntry } from '../../src/memory/schema';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'betterdev-entry-'));
  mkdirSync(join(root, '.dev/memory'), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('entry new', () => {
  it('cria a entrada na pasta da trilha, com o frontmatter da trilha', () => {
    expect(newEntry(root, 'conhecimento', 'ponte-js-python', '2026-10-06')).toBe('.dev/memory/ponte-js-python.md');
    // A pasta da trilha bug ainda não existia.
    expect(newEntry(root, 'bug', 'viewshed-crs-metrico', '2026-10-06')).toBe('.dev/errors/viewshed-crs-metrico.md');

    const knowledge = parseEntry(readFileSync(join(root, '.dev/memory/ponte-js-python.md'), 'utf8'), 'ponte-js-python.md');
    const bug = parseEntry(readFileSync(join(root, '.dev/errors/viewshed-crs-metrico.md'), 'utf8'), 'viewshed-crs-metrico.md');
    expect(Object.keys(knowledge.frontmatter)).toEqual(['track', 'type', 'module', 'summary', 'tags', 'applies_when', 'created']);
    expect(knowledge.frontmatter).toMatchObject({ track: 'conhecimento', type: null, tags: [], created: '2026-10-06' });
    expect(Object.keys(bug.frontmatter)).toEqual([
      'track', 'type', 'module', 'summary', 'tags', 'symptoms', 'root_cause', 'resolution', 'occurrences', 'applies_when', 'created',
    ]);
    expect(bug.frontmatter).toMatchObject({ track: 'bug', occurrences: 1, symptoms: [] });
    expect(readFileSync(join(root, '.dev/errors/viewshed-crs-metrico.md'), 'utf8')).toContain(
      'type:              # build | teste | runtime | performance | dados | seguranca | ui | integracao | logica',
    );
  });

  it('recusa slug já usado em qualquer das trilhas, sem tocar no arquivo', () => {
    writeFileSync(join(root, '.dev/memory/ja-existe.md'), 'conteúdo\n');

    expect(() => newEntry(root, 'conhecimento', 'ja-existe')).toThrow('já existe .dev/memory/ja-existe.md');
    expect(() => newEntry(root, 'bug', 'ja-existe')).toThrow('já existe .dev/memory/ja-existe.md');
    newEntry(root, 'bug', 'erro-repetido');
    expect(() => newEntry(root, 'conhecimento', 'erro-repetido')).toThrow('(se é o mesmo erro, incremente occurrences)');
    expect(readFileSync(join(root, '.dev/memory/ja-existe.md'), 'utf8')).toBe('conteúdo\n');
  });

  it('recusa trilha desconhecida, slug inválido e projeto sem .dev', () => {
    expect(() => newEntry(root, 'nota', 'x')).toThrow('trilha "nota" inválida');
    expect(() => newEntry(root, 'bug', 'Erro_Grave')).toThrow('não é um slug');
    expect(() => newEntry(root, 'bug', '2026-10-06-erro')).toThrow('tem data no nome');
    rmSync(join(root, '.dev'), { recursive: true });
    expect(() => newEntry(root, 'bug', 'erro')).toThrow('rode betterdev init');
  });

  it('usa a data local no formato AAAA-MM-DD', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
