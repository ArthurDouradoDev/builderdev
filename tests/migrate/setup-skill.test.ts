import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CLAUDE_MD_MAX_LINES, lintClaudeMd } from '../../src/memory/lint';

const skillPath = fileURLToPath(new URL('../../skills/setup/SKILL.md', import.meta.url));
const skill = readFileSync(skillPath);
const text = skill.toString('utf8');
const templatePath = fileURLToPath(new URL('../../templates/CLAUDE.md', import.meta.url));
const template = readFileSync(templatePath, 'utf8');

/** Corpo do passo `## N. ...`, até o próximo passo. */
function step(n: number): string {
  const start = text.search(new RegExp(`^## ${n}\\. `, 'm'));
  const next = text.slice(start + 1).search(/^## \d+\. /m);
  return start < 0 ? '' : text.slice(start, next < 0 ? undefined : start + 1 + next);
}

// Checagem estrutural; o comportamento do modelo é validado à mão (Validação visual da f5).
describe('skills/setup/SKILL.md', () => {
  it('tem no máximo 8 KB', () => {
    expect(skill.byteLength).toBeLessThanOrEqual(8 * 1024);
  });

  it('só é invocada pelo usuário', () => {
    const frontmatter = parse(text.split(/^---$/m)[1]!) as Record<string, unknown>;
    expect(frontmatter).toMatchObject({ name: 'setup', 'disable-model-invocation': true });
  });

  it('tem os nove passos, em ordem', () => {
    const positions = Array.from({ length: 9 }, (_, i) => text.search(new RegExp(`^## ${i + 1}\\. `, 'm')));
    expect(positions.every((p) => p > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('passo 1: registra a linha de base com builderdev stats antes de qualquer mudança', () => {
    expect(step(1)).toContain('builderdev stats');
    expect(text.indexOf('builderdev stats')).toBeLessThan(text.indexOf('builderdev init'));
  });

  it('passo 6: pede confirmação antes de trocar o CLAUDE.md da raiz pelo atalho', () => {
    const six = step(6);
    expect(six).toMatch(/confirmação/);
    expect(six).toContain('@.dev/CLAUDE.md');
    expect(six).toContain('Espere a resposta');
    expect(text.indexOf('git rm')).toBeGreaterThan(text.indexOf('@.dev/CLAUDE.md'));
  });

  it('usa os comandos do script para a parte mecânica', () => {
    for (const command of ['builderdev init', 'builderdev migrate split', 'builderdev entry new', 'builderdev lint', 'builderdev reindex', 'builderdev hooks install']) {
      expect(text).toContain(command);
    }
    expect(text).toContain('alguém lendo o código final repetiria o erro ou refaria uma investigação grande?');
    expect(text).toContain('decisoes.md');
  });
});

describe('templates/CLAUDE.md', () => {
  it('cabe no orçamento do .dev/CLAUDE.md', () => {
    expect(lintClaudeMd(templatePath)).toEqual([]);
    expect(template.split('\n').length).toBeLessThan(CLAUDE_MD_MAX_LINES);
  });

  it('traz a linha de descoberta informativa, sem mandar ler a memória', () => {
    expect(template).toContain(
      '`.dev/memory/` e `.dev/errors/`: aprendizados do projeto com frontmatter (module, tags); relevantes ao implementar ou depurar áreas documentadas.',
    );
    expect(template).not.toMatch(/sempre leia|leia antes|MEMORY\.md|ERRORS\.md/i);
  });

  it('traz as regras de mudança cirúrgica e verificação e o que preservar ao compactar', () => {
    expect(template).toContain('**Mudanças cirúrgicas.**');
    expect(template).toContain('**Verifique pelo objetivo.**');
    expect(template).toMatch(/^## Ao compactar$/m);
    expect(template).toMatch(/fase ativa.*arquivos modificados.*comandos de teste/s);
  });
});
