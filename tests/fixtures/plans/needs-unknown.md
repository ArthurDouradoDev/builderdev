---
id: needs-desconhecido
title: Dependência inexistente
phases:
  - id: f1
    title: Primeira fase
    files: [src/a.ts]
    verify: ["npm test"]
    commit_msg: "feat: primeira fase"
  - id: f3
    title: Terceira fase
    needs: [f9]
    files: [src/c.ts]
    verify: ["npm test"]
    commit_msg: "feat: terceira fase"
---

# Dependência inexistente

## Contexto

A f3 depende de uma fase que não existe. Ids não precisam ser sequenciais.

## f1 · Primeira fase

### Objetivo

Primeira.

### Escopo

#### Código

- A.

### Validação visual

- Conferir.

## f3 · Terceira fase

### Objetivo

Terceira.

### Escopo

#### Código

- C.

### Validação visual

- Conferir.
