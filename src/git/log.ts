import { execFile, execFileSync } from 'node:child_process';

export const TRAILER_KEY = 'Plan-Step';

/** Falha de um comando git; a mensagem é a primeira linha do stderr. */
export class GitError extends Error {
  constructor(message: string, readonly args: string[]) {
    super(message);
    this.name = 'GitError';
  }
}

/** Roda `git <args>` em `cwd` e devolve o stdout. */
export function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    throw new GitError(`git ${args[0]}: ${gitReason(err)}`, args);
  }
}

const GIT_ASYNC_TIMEOUT_MS = 10_000;

/**
 * Como `git()`, sem bloquear: para ler vários repositórios em paralelo. Desiste depois de 10 s.
 * `env` acrescenta variáveis ao ambiente herdado.
 */
export function gitAsync(args: string[], cwd: string, env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd,
        encoding: 'utf8',
        timeout: GIT_ASYNC_TIMEOUT_MS,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: env && { ...process.env, ...env },
      },
      (err, stdout, stderr) => {
        if (!err) return resolve(stdout);
        const reason = err.killed ? `tempo esgotado (${GIT_ASYNC_TIMEOUT_MS / 1000} s)` : gitReason({ stderr, message: err.message });
        reject(new GitError(`git ${args[0]}: ${reason}`, args));
      },
    );
  });
}

/** Primeira linha do stderr, sem o `fatal: `; a mensagem do erro quando o stderr vem vazio. */
function gitReason(err: unknown): string {
  const stderr = String((err as { stderr?: unknown }).stderr ?? '').trim();
  return stderr.split(/\r?\n/)[0]?.replace(/^fatal: /, '') || (err as Error).message;
}

/** Verdadeiro quando `HEAD` aponta para um commit (falso em repositório recém-criado). */
export function hasCommits(cwd: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', 'HEAD'], cwd);
    return true;
  } catch {
    return false;
  }
}

// Um registro por commit: hash, US, valores do trailer separados por RS, RS.
const LOG_FORMAT = `--format=%H%x1f%(trailers:key=${TRAILER_KEY},valueonly,separator=%x1e)%x1e`;

/**
 * Commits com o trailer `Plan-Step`, agrupados pelo valor (`plano/fase`), do mais recente ao mais antigo.
 * Padrão: histórico de `HEAD`; `all` inclui todas as refs.
 */
export function readPlanSteps(cwd: string, { all = false } = {}): Map<string, string[]> {
  const steps = new Map<string, string[]>();
  if (!all && !hasCommits(cwd)) return steps;

  // O --grep só poupa trabalho; quem decide é o parser de trailers do próprio git.
  const args = ['log', LOG_FORMAT, '--regexp-ignore-case', `--grep=${TRAILER_KEY}`];
  if (all) args.push('--all');
  for (const record of git(args, cwd).split('\x1e\n')) {
    const sep = record.indexOf('\x1f');
    if (sep < 0) continue;
    const hash = record.slice(0, sep).trim();
    for (const value of record.slice(sep + 1).split('\x1e')) {
      // Valores dobrados em várias linhas voltam com a quebra; normaliza para uma linha.
      const ref = value.replace(/\s+/g, ' ').trim();
      if (!ref) continue;
      const commits = steps.get(ref) ?? [];
      if (!commits.includes(hash)) commits.push(hash);
      steps.set(ref, commits);
    }
  }
  return steps;
}
