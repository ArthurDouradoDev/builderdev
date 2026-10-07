import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readConfig } from '../../src/config';
import { FAILURE_LINES_MAX, VERIFY_STATE_FILE, failureLines, phaseFingerprint, stopHook } from '../../src/hooks/stop';
import { init } from '../../src/init';
import { writeState } from '../../src/state';
import { buildCli, runHook, type BuiltCli } from '../helpers/cli';
import { planSource, writePlan } from '../helpers/repo';

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

// Comando espião: registra cada execução em spy.log. Falha (com 50 linhas de FAIL entre ruído) se existir o arquivo "quebrar".
const SPY = `import { appendFileSync, existsSync } from 'node:fs';
appendFileSync('spy.log', 'x');
if (existsSync('quebrar')) {
  for (let i = 1; i <= 50; i++) console.log(i % 2 ? 'linha de ruído ' + i : '');
  for (let i = 1; i <= 50; i++) console.error('FAIL tests/x.test.ts > caso ' + i);
  process.exit(1);
}
console.log('tudo certo');
`;

function setup(verify = ['node spy.mjs'], files = ['src/', 'notas.md']): void {
  root = mkdtempSync(join(tmpdir(), 'betterdev-stop-'));
  init(root);
  writePlan(root, 'demo', planSource('demo', [{ id: 'f1', title: 'Primeira', files, verify }]));
  writeFileSync(join(root, 'spy.mjs'), SPY);
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/a.ts'), 'export const a = 1;\n');
  writeState(root, { plan: 'demo', phase: 'f1', startedAt: '2026-10-06T00:00:00.000Z' });
}

const spyRuns = () => (existsSync(join(root, 'spy.log')) ? readFileSync(join(root, 'spy.log'), 'utf8').length : 0);
const metrics = () =>
  existsSync(join(root, '.dev/.local/metrics.jsonl'))
    ? readFileSync(join(root, '.dev/.local/metrics.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as Record<string, unknown>)
    : [];

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('hook Stop', { timeout: 30_000 }, () => {
  beforeEach(() => setup());

  it('sem fase ativa, não faz nada', () => {
    rmSync(join(root, '.dev/.local/state.json'));

    expect(stopHook(root, {})).toEqual({ action: 'ignorado', reason: 'nenhuma fase ativa' });
    expect(spyRuns()).toBe(0);
    expect(metrics()).toEqual([]);
  });

  it('stop_hook_active verdadeiro, não faz nada', () => {
    expect(stopHook(root, { stop_hook_active: true })).toEqual({ action: 'ignorado', reason: 'stop_hook_active' });
    expect(spyRuns()).toBe(0);
  });

  it('verifyOnStop: false em .dev/config.json é respeitado', () => {
    writeFileSync(join(root, '.dev/config.json'), JSON.stringify({ verifyOnStop: false }));

    expect(stopHook(root, {})).toEqual({ action: 'ignorado', reason: 'verifyOnStop desligado' });
    expect(spyRuns()).toBe(0);
  });

  it('sucesso não produz saída e grava a impressão digital; sem mudança, não roda de novo', () => {
    const first = stopHook(root, {});

    expect(first.action).toBe('aprovado');
    expect(first.output).toBeUndefined();
    expect(spyRuns()).toBe(1);
    expect(JSON.parse(readFileSync(join(root, VERIFY_STATE_FILE), 'utf8'))).toHaveProperty(['demo/f1', 'fingerprint']);
    expect(readFileSync(join(root, first.log!), 'utf8')).toContain('$ node spy.mjs\ntudo certo');

    // Impressão digital igual: o comando espião não roda.
    expect(stopHook(root, {})).toEqual({ action: 'sem-mudanca' });
    expect(spyRuns()).toBe(1);

    // Arquivo da fase alterado, arquivo novo numa pasta da fase, arquivo ausente criado: roda de novo.
    writeFileSync(join(root, 'src/a.ts'), 'export const a = 2;\n');
    expect(stopHook(root, {}).action).toBe('aprovado');
    writeFileSync(join(root, 'src/b.ts'), 'export const b = 1;\n');
    expect(stopHook(root, {}).action).toBe('aprovado');
    writeFileSync(join(root, 'notas.md'), 'nota\n');
    expect(stopHook(root, {}).action).toBe('aprovado');
    expect(spyRuns()).toBe(4);

    // Arquivo fora de files não conta.
    writeFileSync(join(root, 'fora.txt'), 'x\n');
    expect(stopHook(root, {}).action).toBe('sem-mudanca');

    expect(metrics().map((m) => m.resultado)).toEqual(['aprovado', 'sem-mudanca', 'aprovado', 'aprovado', 'aprovado', 'sem-mudanca']);
    expect(metrics()[0]).toMatchObject({ evento: 'verify', fase: 'demo/f1', resultado: 'aprovado', log: first.log });
  });

  it('falha produz additionalContext com no máximo 30 linhas de falha e o caminho do log', () => {
    writeFileSync(join(root, 'quebrar'), '');

    const result = stopHook(root, {}, { now: new Date(2026, 8, 23, 14, 2, 11) });

    expect(result.action).toBe('falhou');
    expect(result.log).toBe('.dev/.local/verify/2026-09-23T14-02-11.log');
    const context = result.output!.hookSpecificOutput.additionalContext;
    expect(result.output!.hookSpecificOutput.hookEventName).toBe('Stop');
    const lines = context.split('\n');
    expect(lines[0]).toBe('[betterdev] verificação da fase f1 falhou: node spy.mjs');
    const failures = lines.filter((l) => l.startsWith('  '));
    expect(failures).toHaveLength(FAILURE_LINES_MAX);
    expect(failures.every((l) => l.startsWith('  FAIL tests/x.test.ts > caso '))).toBe(true);
    expect(lines.at(-2)).toBe('(+20 linhas de falha no log)');
    expect(lines.at(-1)).toBe('Log completo: .dev/.local/verify/2026-09-23T14-02-11.log');

    // O log guarda a saída completa, ruído incluído.
    const log = readFileSync(join(root, result.log!), 'utf8');
    expect(log).toContain('linha de ruído 49');
    expect(log).toContain('FAIL tests/x.test.ts > caso 50');
    expect(log).toContain('[saiu com 1]');

    // Falha não grava impressão digital: o próximo fim de turno verifica de novo.
    expect(existsSync(join(root, VERIFY_STATE_FILE))).toBe(false);
    const again = stopHook(root, {}, { now: new Date(2026, 8, 23, 14, 2, 11) });
    expect(again.action).toBe('falhou');
    expect(again.log).toBe('.dev/.local/verify/2026-09-23T14-02-11-2.log');
    expect(metrics()[0]).toMatchObject({ evento: 'verify', fase: 'demo/f1', resultado: 'falhou', comando: 'node spy.mjs' });
  });

  it('para no primeiro comando que falha', () => {
    rmSync(root, { recursive: true, force: true });
    setup(['node -e "process.exit(3)"', 'node spy.mjs']);

    const result = stopHook(root, {});

    expect(result.action).toBe('falhou');
    expect(result.output!.hookSpecificOutput.additionalContext.split('\n')[0]).toBe('[betterdev] verificação da fase f1 falhou: node -e "process.exit(3)"');
    expect(spyRuns()).toBe(0);
  });

  it('orçamento de tempo esgotado conta como falha', () => {
    const result = stopHook(root, {}, { budgetMs: 0 });

    expect(result.action).toBe('falhou');
    expect(result.output!.hookSpecificOutput.additionalContext.split('\n')[0]).toBe(
      '[betterdev] verificação da fase f1 falhou (tempo esgotado após 0 s): node spy.mjs',
    );
    expect(spyRuns()).toBe(0);
  });

  it('pelo CLI: falha vira JSON no stdout com código 0; sucesso não imprime nada', () => {
    writeFileSync(join(root, 'quebrar'), '');
    const failed = runHook(cli, root, 'stop', { session_id: 's', cwd: root, hook_event_name: 'Stop', stop_hook_active: false });

    expect(failed.status).toBe(0);
    const output = JSON.parse(failed.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
    expect(output.hookSpecificOutput.hookEventName).toBe('Stop');
    expect(output.hookSpecificOutput.additionalContext).toContain('Log completo: .dev/.local/verify/');

    rmSync(join(root, 'quebrar'));
    expect(runHook(cli, root, 'stop', { cwd: root, hook_event_name: 'Stop' })).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(runHook(cli, root, 'stop', { cwd: root, hook_event_name: 'Stop', stop_hook_active: true })).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(spyRuns()).toBe(2);
  });
});

describe('impressão digital, linhas de falha e configuração', () => {
  beforeEach(() => setup());

  it('globs consideram só os arquivos que coincidem', () => {
    mkdirSync(join(root, 'src/sub'));
    writeFileSync(join(root, 'src/sub/c.ts'), 'c\n');
    writeFileSync(join(root, 'src/sub/c.md'), 'c\n');
    const files = ['src/**/*.ts'];
    const before = phaseFingerprint(root, files, ['x']);

    writeFileSync(join(root, 'src/sub/c.md'), 'mudou\n');
    expect(phaseFingerprint(root, files, ['x'])).toBe(before);
    writeFileSync(join(root, 'src/sub/c.ts'), 'mudou\n');
    expect(phaseFingerprint(root, files, ['x'])).not.toBe(before);
    // Mudar os comandos de verify também invalida a verificação aprovada.
    expect(phaseFingerprint(root, files, ['y'])).not.toBe(phaseFingerprint(root, files, ['x']));
  });

  it('sem linha que pareça falha, devolve as últimas 10 linhas; remove cores ANSI', () => {
    const output = Array.from({ length: 15 }, (_, i) => `\x1b[2msaída ${i + 1}\x1b[22m`).join('\n');
    expect(failureLines(output)).toEqual({ lines: Array.from({ length: 10 }, (_, i) => `saída ${i + 6}`), hidden: 0 });
    expect(failureLines('ok\nsrc/a.ts(3,1): error TS2304: Cannot find name\nok').lines).toEqual(['src/a.ts(3,1): error TS2304: Cannot find name']);
  });

  it('config ausente ou inválida liga a verificação', () => {
    expect(readConfig(root)).toEqual({ verifyOnStop: true });
    writeFileSync(join(root, '.dev/config.json'), '{ quebrado');
    expect(readConfig(root)).toEqual({ verifyOnStop: true });
    writeFileSync(join(root, '.dev/config.json'), JSON.stringify({ verifyOnStop: 'não' }));
    expect(readConfig(root)).toEqual({ verifyOnStop: true });
  });
});
