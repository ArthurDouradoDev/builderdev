import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

export interface BuiltCli {
  /** Bundle do `src/cli.ts` atual. */
  script: string;
  /** Pasta com um `betterdev` executável, para pôr no PATH do git hook. */
  binDir: string;
}

/**
 * Gera o CLI a partir do código-fonte, como o `npm run build`, dentro de `dir`.
 * Os testes de ponta a ponta usam isto em vez do `dist/`, que só é atualizado no build.
 */
export function buildCli(dir: string): BuiltCli {
  const script = join(dir, 'cli.mjs');
  buildSync({
    entryPoints: [fileURLToPath(new URL('../../src/cli.ts', import.meta.url))],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: script,
    logLevel: 'silent',
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  });
  const binDir = join(dir, 'bin');
  mkdirSync(binDir, { recursive: true });
  const shim = join(binDir, 'betterdev');
  const posix = (p: string) => p.replace(/\\/g, '/');
  writeFileSync(shim, `#!/bin/sh\nexec "${posix(process.execPath)}" "${posix(script)}" "$@"\n`);
  chmodSync(shim, 0o755);
  return { script, binDir };
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function runCli(cli: BuiltCli, cwd: string, ...args: string[]): RunResult {
  const r = spawnSync(process.execPath, [cli.script, ...args], { cwd, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/**
 * Roda o git com o `betterdev` do bundle no PATH, como numa máquina com `npm link`.
 * Com `cli` nulo, tira do PATH qualquer `betterdev` instalado, para simular a máquina sem ele.
 */
export function gitWithCli(cli: BuiltCli | null, cwd: string, ...args: string[]): RunResult {
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  const path = cli
    ? [cli.binDir, ...dirs]
    : dirs.filter((d) => !existsSync(join(d, 'betterdev')) && !existsSync(join(d, 'betterdev.exe')));
  // No Windows a chave costuma ser `Path`; gravar outra grafia criaria duas variáveis.
  const env = { ...process.env };
  const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  env[key] = path.join(delimiter);
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}
