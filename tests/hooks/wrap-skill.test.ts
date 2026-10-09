import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const skill = readFileSync(fileURLToPath(new URL('../../skills/wrap/SKILL.md', import.meta.url)));
const text = skill.toString('utf8');

// Checagem estrutural; o comportamento do modelo é validado à mão (Validação visual da f4).
describe('skills/wrap/SKILL.md', () => {
  it('tem no máximo 8 KB', () => {
    expect(skill.byteLength).toBeLessThanOrEqual(8 * 1024);
  });

  it('só é invocada pelo usuário', () => {
    const frontmatter = parse(text.split(/^---$/m)[1]!) as Record<string, unknown>;
    expect(frontmatter).toMatchObject({ name: 'wrap', 'disable-model-invocation': true });
  });

  it('traz o critério de durabilidade antes do limite de uma entrada', () => {
    const criterion = text.indexOf('alguém lendo o código final repetiria o erro ou refaria uma investigação grande?');
    const limit = text.indexOf('no máximo uma entrada por sessão');

    expect(criterion).toBeGreaterThan(0);
    expect(limit).toBeGreaterThan(criterion);
    expect(text.indexOf('nada a registrar')).toBeLessThan(limit);
  });

  it('valida e reindexa pelo script', () => {
    expect(text).toContain('builderdev entry new');
    expect(text).toContain('builderdev lint');
    expect(text).toContain('builderdev reindex');
    expect(text).toContain('incremente `occurrences`');
  });
});
