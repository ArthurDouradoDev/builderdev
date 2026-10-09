---
name: plan
description: Transforma a conversa atual num plano de implementação por fases em .dev/plans/, no formato do BuilderDev, validado por builderdev lint.
disable-model-invocation: true
argument-hint: "[foco ou restrição adicional]"
---

# Plano de implementação

Transforme o que foi discutido nesta conversa num plano gravado em `.dev/plans/`. Pedido adicional do usuário (pode estar vazio): $ARGUMENTS

Siga os cinco passos abaixo, nesta ordem.

## 1. Trabalhe nesta sessão, a partir da conversa

O contexto que vale está nesta conversa: decisões tomadas, alternativas descartadas, arquivos já lidos, restrições ditas pelo usuário. Escreva o plano aqui mesmo, sem subagente. Leia arquivos do projeto só para confirmar caminhos, nomes e comandos que vão entrar no plano.

## 2. Confira se a mudança pede um plano

Se o diff inteiro cabe numa frase (renomear uma variável, corrigir um texto, trocar um valor), não gere plano. Responda em até 3 linhas com a mudança proposta e pergunte se pode aplicá-la. Esse é um resultado válido.

## 3. Preencha o template

Leia o template em `.dev/templates/plan.md` se ele existir no projeto; senão, em `${CLAUDE_PLUGIN_ROOT}/templates/plan.md`. Preencha seguindo esta instrução:

> Crie um plano completo para esta implementação seguindo o template. Veja se é necessário dividir em fases; caso contrário, trate como uma única fase. Cada fase começa com uma explicação simples do que será desenvolvido, seguida do escopo detalhado (código, interface e testes), dos arquivos envolvidos, dos comandos que provam que funciona e do checklist de validação visual. Termine cada fase com a mensagem de commit no padrão `tipo: texto curto`. Registre o que fica fora do escopo e as restrições herdadas de `.dev/memory` e `.dev/errors`.

O plano pronto tem:

- **Frontmatter com a estrutura, corpo com a prosa.** Cada informação fica num lugar só.
- **`id`** em minúsculas com hífen; é também o nome do arquivo. `created` com a data de hoje.
- **Fases `f1`, `f2`...** Um plano de fase única usa `f1`. Uma fase é uma entrega que vale um commit e pode ser verificada sozinha.
- **`title` da fase idêntico** ao texto depois de `## fN · ` no corpo.
- **`needs`** só quando há paralelismo real. Sem `needs`, a fase depende da anterior.
- **`files`**: arquivos e pastas que a fase cria ou altera; é o que será carregado quando ela estiver ativa.
- **`verify`**: comandos que já existem no projeto (ou que a própria fase cria), rodam sem interação e falham quando algo está errado.
- **`commit_msg`** no formato `tipo: texto curto`, com tipo `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `build` ou `ci`.
- **`## Contexto`** com 2 a 4 linhas sobre por que o plano existe, tiradas da conversa.
- **`## Fora do escopo`** com o que a conversa deixou de fora de propósito.
- **`## Restrições herdadas`**: se existirem `.dev/memory/index.md` ou `.dev/errors/index.md`, leia os índices e liste só as entradas que se aplicam, com link. Se nenhuma se aplica, omita a seção.
- **Em cada fase:** `### Objetivo` com até 3 linhas em linguagem simples; `### Escopo` com `#### Código` e, quando houver, `#### Interface` e `#### Testes` (omita o título que não se aplica); `### Validação visual` com instruções que o humano segue antes do commit.
- **Só estrutura e prosa.** O status de cada fase vem dos commits, então o plano fica sem campos de status, hashes e caixas marcadas.

## 4. Grave o arquivo

Grave em `.dev/plans/<id>.md`. Se a pasta `.dev/` não existir, rode `builderdev init` antes. Se já existir um plano com esse id, escolha outro id ou pergunte antes de sobrescrever.

## 5. Valide com o lint

Rode `builderdev lint .dev/plans/<id>.md`. Corrija cada erro apontado e rode de novo, até a última linha mostrar `0 erros`. Corrija também os avisos, a menos que haja motivo claro para mantê-los.

Termine respondendo com o caminho do arquivo e a lista de fases (`id · título`), uma por linha.
