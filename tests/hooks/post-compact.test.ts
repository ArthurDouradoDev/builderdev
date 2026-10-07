import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { init } from '../../src/init';
import { buildCli, runHook, type BuiltCli } from '../helpers/cli';

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
  root = mkdtempSync(join(tmpdir(), 'betterdev-compact-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('hook PostCompact', { timeout: 30_000 }, () => {
  it('anexa o evento a metrics.jsonl, sem saída', () => {
    init(root);

    const first = runHook(cli, root, 'post-compact', { session_id: 'sessao-1', cwd: root, hook_event_name: 'PostCompact', trigger: 'manual' });
    // Variante com o gatilho dentro de hookSpecificOutput.
    const second = runHook(cli, root, 'post-compact', { session_id: 'sessao-1', cwd: root, hook_event_name: 'PostCompact', hookSpecificOutput: { trigger: 'auto' } });

    expect(first).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(second).toEqual({ status: 0, stdout: '', stderr: '' });
    const lines = readFileSync(join(root, '.dev/.local/metrics.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as unknown);
    expect(lines).toEqual([
      { evento: 'compact', trigger: 'manual', session_id: 'sessao-1', ts: expect.any(String) },
      { evento: 'compact', trigger: 'auto', session_id: 'sessao-1', ts: expect.any(String) },
    ]);
  });

  it('aceita o JSON com BOM (como o PowerShell envia)', () => {
    init(root);

    runHook(cli, root, 'post-compact', `﻿${JSON.stringify({ session_id: 'com-bom', cwd: root, trigger: 'auto' })}`);

    expect(JSON.parse(readFileSync(join(root, '.dev/.local/metrics.jsonl'), 'utf8'))).toMatchObject({ trigger: 'auto', session_id: 'com-bom' });
  });

  it('fora de projeto BetterDev, não grava nada', () => {
    expect(runHook(cli, root, 'post-compact', { cwd: root, trigger: 'auto' })).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(existsSync(join(root, '.dev'))).toBe(false);
  });

  it('evento desconhecido sai com 1, nunca com 2', () => {
    init(root);
    expect(runHook(cli, root, 'pre-tool', {}).status).toBe(1);
  });
});
