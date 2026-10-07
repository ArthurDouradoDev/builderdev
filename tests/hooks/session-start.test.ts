import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CONTEXT_MAX, buildContext, sessionStart } from '../../src/hooks/session-start';
import { init } from '../../src/init';
import { startPhase } from '../../src/state';
import { buildCli, runHook, type BuiltCli } from '../helpers/cli';
import { commit, git, makeRepo, planSource, removeRepo, useIsolatedGit, writePlan } from '../helpers/repo';

useIsolatedGit();

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

afterEach(() => {
  removeRepo(root);
});

const PHASES = [
  { id: 'f1', title: 'Primeira' },
  { id: 'f2', title: 'Segunda', files: ['src/f2.ts', 'tests/f2/'], verify: ['npm run typecheck', 'npx vitest run tests/f2'] },
];

/** Projeto BetterDev com plano, f1 concluída, f2 ativa, 2 entradas em cada trilha e uma mudança não commitada. */
function setupProject(prefix = 'betterdev-session-'): string {
  const dir = makeRepo(prefix);
  init(dir);
  writePlan(dir, 'demo', planSource('demo', PHASES));
  for (const rel of ['errors/viewshed-crs-metrico.md', 'errors/pywebview-thread-ui.md', 'memory/ponte-js-python.md', 'memory/camadas-reprojetadas-na-carga.md']) {
    copyFileSync(fixture(rel), join(dir, '.dev', rel));
  }
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/f2.ts'), 'export const a = 1;\n');
  git(dir, 'add', '-A');
  commit(dir, 'feat: primeira fase', 'demo/f1');
  writeFileSync(join(dir, 'src/f2.ts'), 'export const a = 2;\nexport const b = 3;\n');
  startPhase(dir, 'demo/f2');
  return dir;
}

const metrics = (dir: string) =>
  readFileSync(join(dir, '.dev/.local/metrics.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, unknown>);

describe('hook SessionStart', { timeout: 30_000 }, () => {
  beforeEach(() => {
    root = setupProject();
  });

  it('entrada JSON via stdin produz o additionalContext com o estado do projeto', () => {
    const input = { session_id: 'sessao-1', cwd: root, hook_event_name: 'SessionStart', source: 'startup', transcript_path: join(root, 't.jsonl') };

    const result = runHook(cli, root, 'session-start', input);

    expect(result).toMatchObject({ status: 0, stderr: '' });
    const output = JSON.parse(result.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
    expect(Object.keys(output)).toEqual(['hookSpecificOutput']);
    expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');

    const lines = output.hookSpecificOutput.additionalContext.split('\n');
    expect(lines.slice(0, 5)).toEqual([
      '[betterdev] branch main · fase ativa demo/f2 - Segunda',
      'Objetivo: Texto exclusivo da f2.',
      'Arquivos: src/f2.ts, tests/f2/',
      'Verificação: npm run typecheck · npx vitest run tests/f2',
      'Detalhes da fase: betterdev brief',
    ]);
    expect(lines[5]).toBe('Últimos commits:');
    expect(lines[6]).toMatch(/^ {2}[0-9a-f]{7,} feat: primeira fase$/);
    expect(lines[7]).toBe('Mudanças não commitadas (git diff --stat):');
    expect(lines[8]).toMatch(/src\/f2\.ts \| 3 /);
    expect(lines).toContain('Memória (2 entradas, .dev/memory/index.md):');
    expect(lines).toContain('Erros (2 entradas, .dev/errors/index.md):');
    expect(lines).toContain(
      '- [viewshed-crs-metrico](viewshed-crs-metrico.md) · bug/dados · geom · crs, viewshed - Viewshed exige CRS métrico; em graus a máscara sai deslocada',
    );
    // O texto das outras fases e o resto do plano ficam de fora.
    expect(output.hookSpecificOutput.additionalContext).not.toContain('exclusivo da f1');

    // Índices regenerados pelo hook e injeção registrada.
    expect(existsSync(join(root, '.dev/memory/index.md'))).toBe(true);
    expect(metrics(root)).toEqual([
      { evento: 'session-start', source: 'startup', caracteres: output.hookSpecificOutput.additionalContext.length, session_id: 'sessao-1', ts: expect.any(String) },
    ]);
  });

  it('source compact gera o mesmo contexto', () => {
    const startup = sessionStart(root, { source: 'startup' }).context;
    const compact = sessionStart(root, { source: 'compact' }).context;

    expect(compact).toBe(startup);
    expect(metrics(root).map((m) => m.source)).toEqual(['startup', 'compact']);
  });

  it('sem fase ativa, diz isso e ainda injeta commits e índices', () => {
    rmSync(join(root, '.dev/.local/state.json'));

    const context = sessionStart(root, { source: 'clear' }).context;

    expect(context.split('\n')[0]).toBe('[betterdev] branch main · nenhuma fase ativa (planos: betterdev status)');
    expect(context).not.toContain('Objetivo:');
    expect(context).toContain('Últimos commits:');
    expect(context).toContain('Erros (2 entradas, .dev/errors/index.md):');
  });

  it('teto de 8.000 caracteres: corta o diff primeiro e depois o índice mais longo', () => {
    // 15 arquivos alterados: o diff --stat já vem resumido a 10 linhas.
    for (let i = 0; i < 15; i++) writeFileSync(join(root, `src/arquivo-${String(i).padStart(2, '0')}.ts`), 'x\n');
    git(root, 'add', '-A');
    commit(root, 'chore: arquivos');
    for (let i = 0; i < 15; i++) writeFileSync(join(root, `src/arquivo-${String(i).padStart(2, '0')}.ts`), 'y\n');
    // 80 entradas de memória com summary longo: o índice sozinho passa de 8.000 caracteres.
    for (let i = 0; i < 80; i++) {
      const slug = `entrada-${String(i).padStart(3, '0')}`;
      writeFileSync(
        join(root, `.dev/memory/${slug}.md`),
        ['---', 'track: conhecimento', 'type: padrao', `module: modulo-${i % 4}`, `summary: ${'Resumo longo da entrada para encher o índice '.repeat(2).trim()} ${i}`, 'tags: [enchimento]', 'created: 2026-01-01', '---', '', `# ${slug}`, ''].join('\n'),
      );
    }
    sessionStart(root, { source: 'startup' }); // regenera os índices

    const context = buildContext(root);
    const lines = context.split('\n');

    expect(context.length).toBeLessThanOrEqual(CONTEXT_MAX);
    // Diff cortado por inteiro: o título fica, seguido só do marcador.
    const diffAt = lines.indexOf('Mudanças não commitadas (git diff --stat):');
    expect(lines[diffAt + 1]).toBe('  [+10 linhas: git diff --stat]');
    // Índice de memória (o mais longo) cortado com marcador; o de erros, inteiro.
    const memoryAt = lines.indexOf('Memória (82 entradas, .dev/memory/index.md):');
    const marker = lines.findIndex((l) => /^ {2}\[\+\d+ linhas: betterdev reindex\]$/.test(l));
    expect(marker).toBeGreaterThan(memoryAt + 1);
    const shown = marker - memoryAt - 1;
    expect(lines[marker]).toBe(`  [+${82 - shown} linhas: betterdev reindex]`);
    const errorsAt = lines.indexOf('Erros (2 entradas, .dev/errors/index.md):');
    expect(lines.slice(errorsAt + 1)).toHaveLength(2);
    // O corte para assim que cabe: uma linha a mais passaria do teto.
    expect(context.length + 200).toBeGreaterThan(CONTEXT_MAX);
  });
});

describe('hook SessionStart fora de projeto BetterDev e com espaço no caminho', { timeout: 30_000 }, () => {
  it('projeto sem .dev/ não produz saída nem arquivos', () => {
    root = makeRepo('betterdev-sem-dev-');
    commit(root, 'chore: inicial');

    const result = runHook(cli, root, 'session-start', { cwd: root, hook_event_name: 'SessionStart', source: 'startup' });

    expect(result).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(existsSync(join(root, '.dev'))).toBe(false);
  });

  it('caminho com espaço funciona de ponta a ponta', () => {
    root = setupProject('betterdev com espaço-');

    const result = runHook(cli, join(root, 'src'), 'session-start', { cwd: join(root, 'src'), hook_event_name: 'SessionStart', source: 'resume' });

    expect(result.status).toBe(0);
    const context = (JSON.parse(result.stdout) as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput.additionalContext;
    expect(context.split('\n')[0]).toBe('[betterdev] branch main · fase ativa demo/f2 - Segunda');
    expect(metrics(root)).toHaveLength(1);
  });

  it('entrada vazia ou inválida no stdin não quebra o hook', () => {
    root = setupProject();

    const result = runHook(cli, root, 'session-start', 'não é json');

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toHaveProperty('hookSpecificOutput.additionalContext');
  });
});
