#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import pkg from '../package.json' with { type: 'json' };
import { init } from './init';
import { formatReport, lintPlanFile, type FileReport } from './plan/lint';

const USAGE = `uso: betterdev <comando> [opções]

comandos:
  lint [caminhos...]   valida planos (padrão: .dev/plans/*.md); sai com 1 se houver erro
  init [pasta]         cria a estrutura .dev/ no projeto (padrão: pasta atual)

opções gerais:
  -h, --help           mostra esta ajuda
  -v, --version        mostra a versão`;

type Command = (args: string[]) => number;

const commands: Record<string, Command> = {
  lint(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    const cwd = process.cwd();
    const targets = positionals.length ? positionals : [join('.dev', 'plans')];

    const files: string[] = [];
    let missing = 0;
    for (const target of targets) {
      const abs = resolve(cwd, target);
      if (!existsSync(abs)) {
        if (positionals.length) {
          console.error(`betterdev lint: caminho não encontrado: ${target}`);
          missing++;
        }
        continue;
      }
      if (statSync(abs).isDirectory()) {
        files.push(...readdirSync(abs).filter((f) => f.endsWith('.md')).sort().map((f) => join(abs, f)));
      } else {
        files.push(abs);
      }
    }
    if (!files.length) {
      if (!missing) console.log('nenhum plano encontrado');
      return missing ? 1 : 0;
    }

    const reports: FileReport[] = files.map((file) => ({
      file: relative(cwd, file).split(sep).join('/'),
      problems: lintPlanFile(file),
    }));
    console.log(formatReport(reports));
    const failed = reports.some((r) => r.problems.some((p) => p.severity === 'erro'));
    return failed || missing ? 1 : 0;
  },

  init(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    if (positionals.length > 1) throw new UsageError('init aceita no máximo uma pasta');
    const root = resolve(positionals[0] ?? '.');
    const actions = init(root);
    console.log(actions.length ? actions.join('\n') : 'nada a fazer: a estrutura .dev/ já existe');
    return 0;
  },
};

class UsageError extends Error {}

function main(argv: string[]): number {
  const [name, ...rest] = argv;
  if (!name || name === '-h' || name === '--help' || name === 'help') {
    console.log(USAGE);
    return name ? 0 : 2;
  }
  if (name === '-v' || name === '--version') {
    console.log(pkg.version);
    return 0;
  }
  const command = commands[name];
  if (!command) {
    console.error(`betterdev: comando desconhecido "${name}"\n\n${USAGE}`);
    return 2;
  }
  try {
    return command(rest);
  } catch (err) {
    // parseArgs lança TypeError com code ERR_PARSE_ARGS_* para opções inválidas.
    const code = (err as { code?: string }).code ?? '';
    if (err instanceof UsageError || code.startsWith('ERR_PARSE_ARGS')) {
      console.error(`betterdev ${name}: ${(err as Error).message}`);
      return 2;
    }
    throw err;
  }
}

process.exitCode = main(process.argv.slice(2));
