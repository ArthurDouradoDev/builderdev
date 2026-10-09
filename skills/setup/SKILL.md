---
name: setup
description: Migra um projeto existente para o BuilderDev. Mede a linha de base das sessões, cria .dev/, divide MEMORY.md e ERRORS.md em candidatos, decide cada um pelo critério de durabilidade e monta o .dev/CLAUDE.md, pedindo confirmação antes de trocar o CLAUDE.md da raiz.
disable-model-invocation: true
argument-hint: "[arquivos de memória além de MEMORY.md e ERRORS.md]"
---

# Setup de um projeto existente

Migre este projeto para o BuilderDev seguindo os nove passos abaixo, nesta ordem. Arquivos de memória indicados pelo usuário (pode estar vazio): $ARGUMENTS

Antes do passo 1, confira com `git status` que a árvore está limpa e que a branch atual não é a principal. Se for a principal, proponha `git switch -c chore/builderdev-setup` e espere a resposta.

Os comandos `builderdev` estão no PATH das sessões com o plugin. Se não estiverem, use `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js"` no lugar.

## 1. Registre a linha de base

```bash
builderdev stats
```

Anote o número de sessões e a mediana de tokens na abertura: eles entram no relatório do passo 9. Anote também a data de hoje, que será o `--split-at` das comparações futuras. O Claude Code apaga históricos com mais de 30 dias (`cleanupPeriodDays`), por isso a linha de base também vai para um arquivo no passo 2.

## 2. Crie a estrutura

```bash
builderdev init
builderdev stats --json > .dev/.local/linha-de-base.json
```

Se o passo 1 disse que não há históricos do Claude Code para o projeto, rode só o `init` e registre isso no relatório.

## 3. Divida os arquivos de memória

Passe `MEMORY.md`, `ERRORS.md` e os demais arquivos de memória que o `CLAUDE.md` atual manda ler ou que o usuário indicou:

```bash
builderdev migrate split MEMORY.md ERRORS.md
```

A saída lista um candidato por linha (número, origem com intervalo de linhas, seção e tamanho). Os arquivos ficam em `.dev/.local/migration/NNN.md`.

## 4. Decida cada candidato

Antes de decidir, monte a lista de valores de `module` (de 5 a 15 áreas do projeto) a partir das seções da saída do passo 3, e reuse essa lista em todas as entradas.

Trabalhe em lotes de 10 a 15 candidatos: abra cada `NNN.md` do lote com Read e aplique a pergunta do critério de durabilidade:

> Se esta entrada sumisse, alguém lendo o código final repetiria o erro ou refaria uma investigação grande?

Cada candidato recebe exatamente uma decisão:

- **criar entrada**: passa no critério. Rode `builderdev entry new --track <bug|conhecimento> --slug <assunto>` e preencha o arquivo: `summary` de uma linha que permite decidir pelo índice, `module` da lista, `tags` reusadas, e na trilha `bug` os `symptoms`, `root_cause`, `resolution` e `occurrences: 1`. Corpo de até 40 linhas, só com o que o frontmatter não cobre, citando arquivos e funções pelo nome.
- **fundir com NNN**: trata do mesmo assunto que outro candidato. A entrada é uma só e reúne os dois.
- **claude-md**: vale para qualquer tarefa no projeto (comandos, arquitetura geral, convenções amplas). Vai para o `.dev/CLAUDE.md` no passo 5.
- **descartar**: narrativa de sessão, lista de mudanças, o que o código, um comentário, o `git log` ou o README já deixam claro, ou o que já está na memória automática do Claude Code.

Registre cada decisão em `.dev/.local/migration/decisoes.md`, uma linha por candidato:

```markdown
| candidato | origem | decisão | motivo |
|---|---|---|---|
| 007 | ERRORS.md:40-58 | entrada viewshed-crs-metrico | causa não aparece no código |
```

Ao fim de cada lote, rode `builderdev lint` e corrija o que ele apontar nas entradas. Avisos `corpus-module` e `corpus-tag` sugerem um valor já usado: troque por ele.

## 5. Monte o .dev/CLAUDE.md

Leia o template em `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md` e o `CLAUDE.md` atual da raiz. Grave `.dev/CLAUDE.md` assim:

- preencha o template com o conteúdo do `CLAUDE.md` atual e com os candidatos marcados `claude-md`;
- remova as instruções de ler `MEMORY.md`, `ERRORS.md` ou qualquer arquivo "antes de começar": a linha de descoberta do template substitui todas;
- quando o `CLAUDE.md` atual já tiver regras equivalentes às de "Como trabalhar", mantenha uma versão só;
- apague os comentários `<!-- -->` e os marcadores `<...>` do template.

Rode `builderdev lint .dev/CLAUDE.md`: o limite é de 150 linhas.

## 6. Peça confirmação antes de trocar o CLAUDE.md da raiz

Mostre ao usuário: o tamanho do `CLAUDE.md` atual e do novo `.dev/CLAUDE.md` em linhas, e o que saiu do texto antigo. Pergunte se pode trocar o conteúdo do `CLAUDE.md` da raiz por uma única linha:

```markdown
@.dev/CLAUDE.md
```

Espere a resposta. Com a aprovação, faça a troca. Sem ela, deixe o `CLAUDE.md` da raiz como está, pule o passo 7 (os arquivos antigos continuam sendo lidos por ele) e diga no relatório que a troca ficou pendente.

## 7. Remova os arquivos antigos num commit próprio

```bash
git rm MEMORY.md ERRORS.md
git commit -m "chore: remove MEMORY.md e ERRORS.md migrados para .dev/" -- MEMORY.md ERRORS.md
```

Inclua os outros arquivos de memória migrados no passo 3. O conteúdo continua no histórico do git.

## 8. Valide e instale os hooks

```bash
builderdev lint
builderdev reindex
builderdev hooks install
```

Corrija o que o `lint` apontar e rode de novo até sair sem erro.

## 9. Reporte

Sua resposta final contém:

1. candidatos: total, quantos viraram entrada, quantos foram fundidos, quantos foram para o `.dev/CLAUDE.md` e quantos foram descartados (conte pelo `decisoes.md`);
2. as entradas criadas, por trilha e `module`;
3. o contexto de abertura antes: a mediana do passo 1;
4. o contexto de abertura depois, estimado: some os bytes de `CLAUDE.md`, `.dev/CLAUDE.md`, `.dev/memory/index.md` e `.dev/errors/index.md` (`wc -c`) e divida por 4. Explique que a mediana do passo 1 inclui o prompt de sistema e as ferramentas, e que a medida real vem de `builderdev stats --split-at <data de hoje>` depois de algumas sessões;
5. os arquivos novos e alterados que o usuário deve revisar e commitar (`.dev/`, `CLAUDE.md`, `.gitignore`).
