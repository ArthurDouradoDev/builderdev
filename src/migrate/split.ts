import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { stringify } from 'yaml';

export const MIGRATION_DIR = '.dev/.local/migration';

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CANDIDATE_FILE = /^\d{3,}\.md$/;

/** Trecho de um arquivo de memória antigo que vira um candidato a entrada. */
export interface Candidate {
  /** Arquivo de origem, relativo à raiz do projeto, com `/`. */
  source: string;
  /** Linhas 1-based, do título até a última linha não vazia antes do próximo título. */
  startLine: number;
  endLine: number;
  /** Títulos que contêm o trecho, do mais externo ao dele; vazio no texto antes do primeiro título. */
  path: string[];
  lines: string[];
}

/**
 * Divide o texto pelos títulos `#` a `######`, ignorando os que estão dentro de blocos de código.
 * Cada título abre um candidato; o texto antes do primeiro título também é um. Trechos só com o título,
 * sem conteúdo (o `# MEMORY` do topo, um `## Erros` que só agrupa subtítulos), não viram candidato,
 * mas continuam no `path` dos candidatos de dentro, exceto o título do documento. Um arquivo sem títulos vira um candidato só.
 */
export function splitMarkdown(source: string, text: string): Candidate[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const starts: Array<{ index: number; level: number; title: string }> = [];
  let fence: string | null = null;
  lines.forEach((line, i) => {
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      // O bloco fecha com o mesmo caractere, pelo menos o mesmo comprimento e nada depois.
      if (fenceMatch?.[1] && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) fence = null;
      return;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      return;
    }
    const m = HEADING.exec(line);
    if (m?.[1]) starts.push({ index: i, level: m[1].length, title: (m[2] ?? '').trim() });
  });

  const candidates: Candidate[] = [];
  const add = (from: number, to: number, path: string[], hasHeading: boolean) => {
    let first = from;
    let last = to;
    while (first <= last && !lines[first]!.trim()) first++;
    while (last >= first && !lines[last]!.trim()) last--;
    if (last < first || (hasHeading && last === from)) return;
    candidates.push({ source, startLine: first + 1, endLine: last + 1, path, lines: lines.slice(first, last + 1) });
  };

  // O título do documento (único `#`, logo no primeiro título) se repetiria em todos os caminhos: fica só nos trechos dele.
  const docTitle = starts[0]?.level === 1 && starts.filter((s) => s.level === 1).length === 1 ? starts[0] : null;
  add(0, (starts[0]?.index ?? lines.length) - 1, [], false);
  const stack: Array<{ level: number; title: string }> = [];
  starts.forEach((h, i) => {
    while (stack.length && stack[stack.length - 1]!.level >= h.level) stack.pop();
    stack.push(h);
    const path = stack.filter((s) => s !== docTitle || stack.length === 1).map((s) => s.title);
    add(h.index, (starts[i + 1]?.index ?? lines.length) - 1, path, true);
  });
  return candidates;
}

export interface SplitResult {
  /** Pasta dos candidatos, relativa à raiz. */
  dir: string;
  written: Array<{ file: string; candidate: Candidate }>;
  /** Candidatos de uma execução anterior que foram substituídos. */
  replaced: number;
}

/**
 * Grava um arquivo por candidato em `.dev/.local/migration/NNN.md`, numerados na ordem dos arquivos recebidos.
 * Os candidatos de uma execução anterior são substituídos; os demais arquivos da pasta (como `decisoes.md`) ficam.
 * `files` são caminhos absolutos ou relativos à raiz.
 */
export function splitFiles(root: string, files: string[]): SplitResult {
  const candidates = files.flatMap((file) => {
    const abs = resolve(root, file);
    return splitMarkdown(relative(root, abs).split(sep).join('/'), readFileSync(abs, 'utf8'));
  });

  const dir = join(root, MIGRATION_DIR);
  mkdirSync(dir, { recursive: true });
  const old = readdirSync(dir).filter((f) => CANDIDATE_FILE.test(f));
  for (const f of old) rmSync(join(dir, f));

  const digits = Math.max(3, String(candidates.length).length);
  const written = candidates.map((candidate, i) => {
    const file = `${String(i + 1).padStart(digits, '0')}.md`;
    writeFileSync(join(dir, file), candidateSource(candidate, file.replace(/\.md$/, '')));
    return { file, candidate };
  });
  return { dir: MIGRATION_DIR, written, replaced: old.length };
}

/** Frontmatter com a origem, e depois o trecho exatamente como estava. */
function candidateSource(c: Candidate, number: string): string {
  const meta = { candidato: number, origem: originLabel(c), secao: sectionLabel(c) };
  return `---\n${stringify(meta, { lineWidth: 0 })}---\n\n${c.lines.join('\n')}\n`;
}

/** Uma linha por candidato, para o modelo decidir sem abrir os arquivos que não interessam. */
export function formatSplit(result: SplitResult): string {
  const width = Math.max(0, ...result.written.map(({ candidate }) => originLabel(candidate).length));
  const out = result.written.map(({ file, candidate: c }) => {
    const size = `${c.lines.length} ${c.lines.length === 1 ? 'linha' : 'linhas'}`;
    return `${file.replace(/\.md$/, '')}  ${originLabel(c).padEnd(width)}  ${sectionLabel(c)} (${size})`;
  });
  const replaced = result.replaced ? `; ${result.replaced} de uma execução anterior substituídos` : '';
  out.push(`${result.written.length} ${result.written.length === 1 ? 'candidato' : 'candidatos'} em ${result.dir}/${replaced}`);
  return out.join('\n');
}

function originLabel(c: Candidate): string {
  return `${c.source}:${c.startLine}-${c.endLine}`;
}

/** Títulos que contêm o trecho; `(sem título)` para o texto antes do primeiro título ou de um arquivo sem títulos. */
function sectionLabel(c: Candidate): string {
  return c.path.length ? c.path.join(' › ') : '(sem título)';
}
