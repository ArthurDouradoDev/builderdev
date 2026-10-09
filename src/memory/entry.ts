import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProjectError } from '../plan/find';
import { TRACKS, TRACK_DIRS, TYPES, slugProblems, type Track } from './schema';

/** Textos do modelo que precisam ser substituídos; o lint acusa os que sobrarem. */
export const PLACEHOLDERS = ['<título>', '<O que vale', '<Detalhes que'];

/**
 * Cria `.dev/memory/<slug>.md` ou `.dev/errors/<slug>.md` com o frontmatter da trilha pronto para preencher.
 * Recusa slug inválido ou já usado em qualquer das duas trilhas. Devolve o caminho relativo à raiz.
 */
export function newEntry(root: string, track: string, slug: string, today = localDate()): string {
  if (!(TRACKS as readonly string[]).includes(track)) throw new ProjectError(`trilha "${track}" inválida: use --track ${TRACKS.join(' | ')}`);
  const [slugProblem] = slugProblems(slug);
  if (slugProblem) throw new ProjectError(slugProblem);
  if (!existsSync(join(root, '.dev'))) throw new ProjectError('pasta .dev/ não encontrada: rode builderdev init antes');

  for (const t of TRACKS) {
    const existing = `${TRACK_DIRS[t]}/${slug}.md`;
    if (existsSync(join(root, existing))) {
      const hint = t === 'bug' ? ' (se é o mesmo erro, incremente occurrences)' : '';
      throw new ProjectError(`já existe ${existing}: atualize essa entrada${hint} ou escolha outro slug`);
    }
  }

  const rel = `${TRACK_DIRS[track as Track]}/${slug}.md`;
  mkdirSync(join(root, TRACK_DIRS[track as Track]), { recursive: true });
  writeFileSync(join(root, rel), entryTemplate(track as Track, today), { flag: 'wx' });
  return rel;
}

export function entryTemplate(track: Track, today: string): string {
  const common = [
    `type:              # ${TYPES[track].join(' | ')}`,
    'module:            # área do código; reuse um valor que o índice já usa',
    'summary:           # uma linha, até 120 caracteres; vira a linha do índice',
    'tags: []           # 1 a 8, minúsculas com hífen; reuse as do índice',
  ];
  const bug = [
    'symptoms: []       # 1 a 5: como o erro aparece (mensagem, comportamento)',
    'root_cause:',
    'resolution:',
    'occurrences: 1     # quando o mesmo erro voltar, incremente em vez de criar outra entrada',
  ];
  const body =
    track === 'bug'
      ? '<Detalhes que o frontmatter não cobre: exemplo mínimo, comando que reproduz, armadilha. Até 40 linhas.>'
      : '<O que vale, por que vale e onde aparece no código. Até 40 linhas.>';
  return [
    '---',
    `track: ${track}`,
    ...common,
    ...(track === 'bug' ? bug : []),
    'applies_when: []   # opcional, até 5: situações em que a entrada se aplica',
    `created: ${today}`,
    '---',
    '',
    '# <título>',
    '',
    body,
    '',
  ].join('\n');
}

export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
