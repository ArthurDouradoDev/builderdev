#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, delimiter, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import pkg from '../package.json' with { type: 'json' };
import { prepareCommitMsg } from './commit-msg';
import { installHook, uninstallHook } from './git/hooks-install';
import { GitError, readPlanSteps } from './git/log';
import { init } from './init';
import { newEntry } from './memory/entry';
import { isEntryPath, lintClaudeMd, lintMemory, trackOfPath } from './memory/lint';
import { formatRecall, parseTerms, recall } from './memory/recall';
import { INDEX_MAX_LINES, reindex } from './memory/reindex';
import { brief } from './plan/brief';
import { PLANS_DIR, ProjectError, findPlan, findProjectRoot, listPlans, parsePhaseRef } from './plan/find';
import { formatReport, lintPlanFile, type FileReport } from './plan/lint';
import { formatPlanStatus, planStatus } from './plan/status';
import { clearState, readState, startPhase } from './state';

const USAGE = `uso: betterdev <comando> [opções]

comandos:
  lint [caminhos...]          valida planos, entradas de memory/ e errors/ e o .dev/CLAUDE.md
                              (padrão: o projeto inteiro); sai com 1 se houver erro
  init [pasta]                cria a estrutura .dev/ no projeto (padrão: pasta atual)
  entry new --track conhecimento|bug --slug <slug>
                              cria a entrada em .dev/memory/ ou .dev/errors/, pronta para preencher
  reindex                     gera .dev/memory/index.md e .dev/errors/index.md a partir do frontmatter
  recall <termos...> [--full] busca entradas pelo frontmatter; --full imprime as 3 primeiras inteiras
  status [plano] [--json]     status de cada fase, derivado dos commits com o trailer Plan-Step
         [--all]              considera commits de todas as branches, não só de HEAD
  start <plano>/<fase>        grava a fase ativa em .dev/.local/state.json
        [--force]             ativa mesmo com dependências pendentes
  stop                        limpa a fase ativa
  brief [plano/fase]          imprime só a fase ativa (ou a indicada), com Contexto e Fora do escopo
  hooks install|uninstall     instala ou remove o git hook prepare-commit-msg
  commit-msg <arquivo> [origem]
                              usado pelo git hook: preenche a mensagem e o trailer da fase ativa

opções gerais:
  -h, --help                  mostra esta ajuda
  -v, --version               mostra a versão`;

type Command = (args: string[]) => number;

const commands: Record<string, Command> = {
  lint(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    const cwd = process.cwd();
    const root = findProjectRoot(cwd);
    const mdFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => join(dir, f));

    // Sem argumentos: planos, entradas de memória, orçamento dos índices e .dev/CLAUDE.md do projeto.
    const plans: string[] = [];
    const entries: string[] = [];
    const claudeMds: string[] = [];
    let missing = 0;
    if (!positionals.length && existsSync(join(root, PLANS_DIR))) plans.push(...mdFiles(join(root, PLANS_DIR)));
    for (const target of positionals) {
      const abs = resolve(cwd, target);
      if (!existsSync(abs)) {
        console.error(`betterdev lint: caminho não encontrado: ${target}`);
        missing++;
        continue;
      }
      for (const file of statSync(abs).isDirectory() ? mdFiles(abs) : [abs]) {
        if (isEntryPath(file)) entries.push(file);
        else if (trackOfPath(file)) continue; // index.md gerado
        else if (basename(file) === 'CLAUDE.md') claudeMds.push(file);
        else plans.push(file);
      }
    }

    const reports: FileReport[] = [
      ...plans.map((file) => ({ file, problems: lintPlanFile(file) })),
      ...(positionals.length ? (entries.length ? lintMemory(root, entries) : []) : lintMemory(root)),
      ...claudeMds.map((file) => ({ file, problems: lintClaudeMd(file) })),
    ].map((r) => ({ ...r, file: relative(cwd, r.file).split(sep).join('/') }));
    if (!reports.length) {
      if (!missing) console.log('nada a validar: nenhum plano nem entrada de memória encontrado');
      return missing ? 1 : 0;
    }

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

  status(args) {
    const { positionals, values } = parseArgs({
      args,
      allowPositionals: true,
      options: { json: { type: 'boolean' }, all: { type: 'boolean' } },
    });
    if (positionals.length > 1) throw new UsageError('status aceita no máximo um plano');
    const root = findProjectRoot();
    const plans = listPlans(root);
    const selected = positionals[0] ? [findPlan(root, positionals[0], plans)] : plans;
    const active = readState(root);
    const steps = readPlanSteps(root, { all: values.all });
    const statuses = selected.map((entry) => planStatus(entry, steps, active));

    if (values.json) {
      console.log(JSON.stringify({ active, plans: statuses }, null, 2));
    } else if (!statuses.length) {
      console.log(`nenhum plano em ${PLANS_DIR}/`);
    } else {
      console.log(statuses.map(formatPlanStatus).join('\n\n'));
      if (active) {
        const ref = `${active.plan}/${active.phase}`;
        const activePlan = plans.find((p) => p.id === active.plan);
        const phase = activePlan && planStatus(activePlan, steps, active).phases.find((p) => p.id === active.phase);
        if (!phase) console.log(`\nA fase ativa ${ref} não existe mais nos planos: betterdev stop para limpar.`);
        else if (phase.status === 'concluida') console.log(`\nA fase ativa ${ref} já está concluída: betterdev start <plano>/<próxima fase>.`);
      }
    }
    return statuses.some((s) => s.error) ? 1 : 0;
  },

  start(args) {
    const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { force: { type: 'boolean' } } });
    if (positionals.length !== 1) throw new UsageError('uso: betterdev start <plano>/<fase> [--force]');
    const result = startPhase(findProjectRoot(), positionals[0]!, { force: values.force });
    for (const warning of result.warnings) console.error(`aviso: ${warning}`);
    const ref = `${result.state.plan}/${result.state.phase}`;
    const previous = result.previous ? `${result.previous.plan}/${result.previous.phase}` : null;
    const title = result.title ? ` · ${result.title}` : '';
    console.log(`fase ativa: ${ref}${title}${previous && previous !== ref ? ` (antes: ${previous})` : ''}`);
    return 0;
  },

  stop(args) {
    parseArgs({ args, allowPositionals: false, options: {} });
    const previous = clearState(findProjectRoot());
    console.log(previous ? `fase ${previous.plan}/${previous.phase} desativada` : 'nenhuma fase ativa');
    return 0;
  },

  brief(args) {
    const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
    if (positionals.length > 1) throw new UsageError('uso: betterdev brief [plano/fase]');
    const root = findProjectRoot();
    const ref = positionals[0] ? parsePhaseRef(positionals[0]) : readState(root);
    if (!ref) throw new ProjectError('nenhuma fase ativa: use betterdev start <plano>/<fase> ou betterdev brief <plano>/<fase>');
    process.stdout.write(brief(findPlan(root, ref.plan), ref.phase));
    return 0;
  },

  reindex(args) {
    parseArgs({ args, allowPositionals: false, options: {} });
    const results = reindex(findProjectRoot());
    if (!results.length) throw new ProjectError('nem .dev/memory nem .dev/errors existem: rode betterdev init');
    let failed = false;
    for (const r of results) {
      const count = `${r.entries} ${r.entries === 1 ? 'entrada' : 'entradas'}`;
      console.log(`${(r.changed ? 'atualizado' : 'sem mudança').padEnd(12)}${r.path} (${count})`);
      for (const s of r.skipped) console.error(`aviso: ${s.message} em ${relative(process.cwd(), s.path).split(sep).join('/')}:${s.line}; a entrada ficou fora do índice`);
      if (r.overBudget) {
        console.error(`erro: ${r.path} tem ${r.lines} linhas (máximo ${INDEX_MAX_LINES}): funda ou remova entradas`);
        failed = true;
      }
    }
    return failed ? 1 : 0;
  },

  entry(args) {
    const [sub, ...rest] = args;
    if (sub !== 'new') throw new UsageError('uso: betterdev entry new --track conhecimento|bug --slug <slug>');
    const { values } = parseArgs({ args: rest, allowPositionals: false, options: { track: { type: 'string' }, slug: { type: 'string' } } });
    if (!values.track || !values.slug) throw new UsageError('uso: betterdev entry new --track conhecimento|bug --slug <slug>');
    console.log(`criado      ${newEntry(findProjectRoot(), values.track, values.slug)}`);
    return 0;
  },

  recall(args) {
    const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { full: { type: 'boolean' } } });
    const terms = parseTerms(positionals);
    if (!terms.length) throw new UsageError('uso: betterdev recall <termos...> [--full]');
    const root = findProjectRoot();
    const hits = recall(root, terms);
    console.log(hits.length ? formatRecall(root, hits, { full: values.full }) : `nenhuma entrada coincide com: ${terms.join(' ')}`);
    return 0;
  },

  hooks(args) {
    const [sub, ...rest] = args;
    if (rest.length || (sub !== 'install' && sub !== 'uninstall')) throw new UsageError('uso: betterdev hooks install | uninstall');
    const cwd = process.cwd();
    if (sub === 'install') {
      const r = installHook(cwd);
      const note = r.backup ? ` (hook anterior preservado; cópia em ${r.backup})` : '';
      console.log(`${r.action.padEnd(12)}${r.path}${note}`);
      if (!onPath('betterdev')) {
        console.error('aviso: betterdev não está no PATH, e o hook fica inerte até isso mudar (rode npm link no repositório do betterdev)');
      }
    } else {
      const r = uninstallHook(cwd);
      const messages: Record<string, string> = {
        removido: `removido    ${r.path}`,
        restaurado: `restaurado  ${r.path} (hook anterior de volta; cópia .bak apagada)`,
        'bloco removido': `bloco do betterdev removido de ${r.path}`,
        ausente: `nada a fazer: ${r.path} não tem o bloco do betterdev`,
      };
      console.log(messages[r.action]);
    }
    return 0;
  },

  // Chamado pelo git hook: avisa no stderr, mas nunca falha e nunca bloqueia o commit.
  'commit-msg'(args) {
    try {
      const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
      const [file, source] = positionals;
      if (!file) throw new UsageError('uso: betterdev commit-msg <arquivo> [origem]');
      prepareCommitMsg(file, source || undefined);
    } catch (err) {
      const hint = err instanceof ProjectError ? ' (fase ativa desatualizada? betterdev stop limpa)' : '';
      console.error(`betterdev commit-msg: ${(err as Error).message}${hint}; o commit segue sem o trailer`);
    }
    return 0;
  },
};

/** Executável `name` em alguma pasta do PATH, como o `sh` do git hook procuraria. */
function onPath(name: string): boolean {
  return (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => existsSync(join(dir, name)) || existsSync(join(dir, `${name}.exe`)));
}

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
    if (err instanceof ProjectError || err instanceof GitError) {
      console.error(`betterdev ${name}: ${err.message}`);
      return 1;
    }
    throw err;
  }
}

process.exitCode = main(process.argv.slice(2));
