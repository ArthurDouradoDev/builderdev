import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEV_DIRS, init, pluginTemplatesDir } from '../../src/init';

const IGNORED = '.dev/.local/\n.dev/memory/index.md\n.dev/errors/index.md\n';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'builderdev-init-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Caminho, conteúdo e data de modificação de tudo que existe em `dir`. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      const stat = statSync(path);
      const key = relative(root, path);
      if (stat.isDirectory()) {
        out[key] = `dir ${stat.mtimeMs}`;
        walk(path);
      } else {
        out[key] = `${stat.mtimeMs} ${readFileSync(path, 'utf8')}`;
      }
    }
  };
  walk(dir);
  return out;
}

describe('init', () => {
  it('cria a estrutura .dev, copia o template e ignora .dev/.local e os índices gerados', () => {
    const actions = init(root);

    for (const dir of DEV_DIRS) expect(statSync(join(root, dir)).isDirectory()).toBe(true);
    expect(readFileSync(join(root, '.dev/templates/plan.md'), 'utf8')).toBe(
      readFileSync(join(pluginTemplatesDir(), 'plan.md'), 'utf8'),
    );
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(IGNORED);
    expect(actions).toHaveLength(DEV_DIRS.length + 2);
  });

  it('não altera nada na segunda execução', () => {
    init(root);
    const before = snapshot(root);

    expect(init(root)).toEqual([]);
    expect(snapshot(root)).toEqual(before);
  });

  it('deixa o CLAUDE.md intacto', () => {
    const claude = '# Projeto\n\nLeia MEMORY.md antes de começar.\n';
    writeFileSync(join(root, 'CLAUDE.md'), claude);
    const mtime = statSync(join(root, 'CLAUDE.md')).mtimeMs;

    init(root);

    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe(claude);
    expect(statSync(join(root, 'CLAUDE.md')).mtimeMs).toBe(mtime);
    expect(existsSync(join(root, '.dev/CLAUDE.md'))).toBe(false);
  });

  it('acrescenta ao .gitignore existente sem apagar o que havia', () => {
    writeFileSync(join(root, '.gitignore'), 'node_modules/\ndist');

    init(root);

    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(`node_modules/\ndist\n${IGNORED}`);
  });

  it('não duplica regras que o .gitignore já cobre e mantém o fim de linha do arquivo', () => {
    writeFileSync(join(root, '.gitignore'), 'node_modules/\r\n/.dev/.local\r\n');

    init(root);

    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(
      'node_modules/\r\n/.dev/.local\r\n.dev/memory/index.md\r\n.dev/errors/index.md\r\n',
    );

    const covered = 'node_modules/\n/.dev/.local\n/.dev/memory/index.md\n.dev/errors/index.md\n';
    writeFileSync(join(root, '.gitignore'), covered);
    init(root);
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe(covered);
  });

  it('preserva um template já existente no projeto', () => {
    init(root);
    writeFileSync(join(root, '.dev/templates/plan.md'), 'template do projeto\n');

    expect(init(root)).toEqual([]);
    expect(readFileSync(join(root, '.dev/templates/plan.md'), 'utf8')).toBe('template do projeto\n');
  });
});
