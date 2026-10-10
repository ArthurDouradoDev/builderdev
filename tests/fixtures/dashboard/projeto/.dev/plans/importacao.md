---
id: importacao
title: Importação de planilhas
branch: feat/importacao
created: 2026-09-15
phases:
  - id: f1
    title: Leitura do CSV
    files: [src/csv.ts]
    verify: ["npm test -- csv"]
    commit_msg: "feat: leitura do CSV"
  - id: f2
    title: Validação das linhas
    files: [src/validacao.ts]
    verify: ["npm test -- validacao"]
    commit_msg: "feat: validação das linhas importadas"
---

# Importação de planilhas

## Contexto

Planilhas chegam por e-mail e são digitadas à mão.

## f1 · Leitura do CSV

### Objetivo

Ler o CSV.

### Escopo

#### Código

- `src/csv.ts`

### Validação visual

- Importar um arquivo de exemplo.

## f2 · Validação das linhas

### Objetivo

Recusar linhas inválidas.

### Escopo

#### Código

- `src/validacao.ts`

### Validação visual

- Importar um arquivo com erro.
