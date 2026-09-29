---
# Estrutura (lida por máquina). Regra: estrutura aqui, prosa no corpo, nunca os dois.
# Não há campo de status nem de hash de commit: o status é derivado do git
# (commits com o trailer `Plan-Step: <id>/<fase>`).
id: <slug-do-plano>
title: <Título do plano>
branch: <feat/nome-da-branch>
created: <AAAA-MM-DD>
phases:
  - id: f1                      # ids nunca são renumerados; fase nova recebe o próximo id livre
    title: <Título da fase>     # idêntico ao título "## f1 · ..." no corpo
    files: [<caminho/arquivo>]  # o que a IA carrega quando esta fase estiver ativa
    verify: ["<comando que prova que funciona>"]   # o hook Stop roda estes comandos
    commit_msg: "<tipo>: <texto curto>"            # feat | fix | refactor | test | docs | chore | perf | style | build | ci
  # - id: f2
  #   title: <Título>
  #   needs: [f1]               # opcional; ausente = depende da fase anterior
  #   files: []
  #   verify: []
  #   commit_msg: ""
---

# <Título do plano>

## Contexto

<!-- Obrigatório. 2–4 linhas: por que este plano existe. Vem da conversa que o originou. -->

## Fora do escopo

<!-- Recomendado. O que este plano deliberadamente não faz. -->

- <item>

## Restrições herdadas

<!-- Aprendizados de .dev/memory e .dev/errors que se aplicam. Omitir a seção se não houver. -->

- [<slug>](../memory/<slug>.md): <restrição em uma linha>

## f1 · <Título da fase>

### Objetivo

<!-- Obrigatório. Até 3 linhas, linguagem simples: o que esta fase entrega. Vira o resumo do card na UI. -->

### Escopo

#### Código

<!-- Obrigatório. O que será criado ou alterado e como. -->

#### Interface

<!-- Opcional. Omita o título se a fase não muda a interface (em vez de escrever "sem mudanças"). -->

#### Testes

<!-- Opcional. Testes novos ou alterados e o que cada um cobre. -->

### Validação visual

<!-- Instruções para o humano conferir antes do commit. O commit é a confirmação; isto não é estado. -->

- <Abrir X e conferir que Y acontece>
