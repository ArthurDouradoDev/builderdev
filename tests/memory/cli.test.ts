import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { init } from '../../src/init';
import { buildCli, runCli, type BuiltCli } from '../helpers/cli';

const fixture = (rel: string) => fileURLToPath(new URL(`../fixtures/memory/projeto/.dev/${rel}`, import.meta.url));

let cliDir: string;
let cli: BuiltCli;
let root: string;

beforeAll(() => {
  cliDir = mkdtempSync(join(tmpdir(), 'betterdev-cli-'));
  cli = buildCli(cliDir);
});

afterAll(() => {
  rmSync(cliDir, { recursive: true, force: true });
});

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'betterdev-memcli-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const run = (...args: string[]) => runCli(cli, root, ...args);

describe('memória pelo CLI', { timeout: 30_000 }, () => {
  it('entry new, lint, reindex e recall no ciclo completo', () => {
    init(root);

    const created = run('entry', 'new', '--track', 'bug', '--slug', 'viewshed-crs-metrico');
    expect(created).toMatchObject({ status: 0, stdout: 'criado      .dev/errors/viewshed-crs-metrico.md\n' });
    expect(run('entry', 'new', '--track', 'bug', '--slug', 'viewshed-crs-metrico')).toMatchObject({ status: 1 });

    // A entrada recém-criada ainda não passa no lint.
    const pending = run('lint');
    expect(pending.status).toBe(1);
    expect(pending.stdout).toMatch(/^\.dev\/errors\/viewshed-crs-metrico\.md:3 +erro +field-missing +campo "type" ausente/m);
    expect(pending.stdout).toMatch(/:15 +erro +entry-placeholder +linha ainda com o texto do modelo \(<título>\)/);

    for (const rel of ['errors/viewshed-crs-metrico.md', 'errors/pywebview-thread-ui.md', 'memory/ponte-js-python.md', 'memory/camadas-reprojetadas-na-carga.md']) {
      copyFileSync(fixture(rel), join(root, '.dev', rel));
    }
    expect(run('lint')).toMatchObject({ status: 0, stdout: '0 erros, 0 avisos\n' });

    expect(run('reindex').stdout).toBe(
      'atualizado  .dev/memory/index.md (2 entradas)\natualizado  .dev/errors/index.md (2 entradas)\n',
    );
    expect(run('reindex').stdout).toContain('sem mudança .dev/memory/index.md (2 entradas)');
    expect(readFileSync(join(root, '.dev/errors/index.md'), 'utf8')).toContain(
      '- [viewshed-crs-metrico](viewshed-crs-metrico.md) · bug/dados · geom · crs, viewshed - Viewshed exige CRS métrico; em graus a máscara sai deslocada',
    );
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toContain('.dev/memory/index.md');
    // O índice gerado não é validado como entrada nem como plano.
    expect(run('lint', '.dev/memory')).toMatchObject({ status: 0, stdout: '0 erros, 0 avisos\n' });

    const found = run('recall', 'viewshed', 'crs');
    expect(found.status).toBe(0);
    expect(found.stdout.split('\n').slice(0, 3)).toEqual([
      '1. .dev/errors/viewshed-crs-metrico.md            bug/dados · geom',
      '   Viewshed exige CRS métrico; em graus a máscara sai deslocada',
      '   coincidiu: tags(crs, viewshed), applies_when(viewshed), summary(viewshed, crs), title(viewshed, crs)',
    ]);
    expect(run('recall', 'kubernetes')).toMatchObject({ status: 0, stdout: 'nenhuma entrada coincide com: kubernetes\n' });
  });

  it('module quase igual a um existente gera aviso com sugestão, sem falhar', () => {
    init(root);
    copyFileSync(fixture('memory/camadas-reprojetadas-na-carga.md'), join(root, '.dev/memory/camadas-reprojetadas-na-carga.md'));
    const nova = readFileSync(fixture('memory/ponte-js-python.md'), 'utf8').replace('module: ui-web', 'module: Geom');
    writeFileSync(join(root, '.dev/memory/ponte-js-python.md'), nova);

    const result = run('lint', '.dev/memory/ponte-js-python.md');

    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      [
        '.dev/memory/ponte-js-python.md:4  aviso  corpus-module         module "Geom" é quase igual a "geom", já usado em 1 entrada: use "geom"',
        '0 erros, 1 aviso',
        '',
      ].join('\n'),
    );
  });

  it('acusa .dev/CLAUDE.md acima de 150 linhas', () => {
    init(root);
    writeFileSync(join(root, '.dev/CLAUDE.md'), 'linha\n'.repeat(151));

    const result = run('lint');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('.dev/CLAUDE.md:151  erro   claude-md-too-long');
  });

  it('erros de uso saem com código 2, e recall sem .dev não falha', () => {
    expect(run('entry', 'new', '--track', 'bug').status).toBe(2);
    expect(run('entry', 'velho').status).toBe(2);
    expect(run('recall').status).toBe(2);
    expect(run('recall', 'viewshed')).toMatchObject({ status: 0, stdout: 'nenhuma entrada coincide com: viewshed\n' });
    expect(run('reindex')).toMatchObject({ status: 1 });
  });
});
