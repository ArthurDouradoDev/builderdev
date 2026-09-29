---
id: ciclo
title: Ciclo de dependências
phases:
  - id: f1
    title: Primeira fase
    needs: [f3]
    files: [src/a.ts]
    verify: ["npm test"]
    commit_msg: "feat: primeira fase"
  - id: f2
    title: Segunda fase
    files: [src/b.ts]
    verify: ["npm test"]
    commit_msg: "feat: segunda fase"
  - id: f3
    title: Terceira fase
    needs: [f2]
    files: [src/c.ts]
    verify: ["npm test"]
    commit_msg: "feat: terceira fase"
---

# Ciclo de dependências

## Contexto

f1 depende de f3, f3 de f2 e f2, sem needs, da anterior (f1).

## f1 · Primeira fase

### Objetivo

Primeira.

### Escopo

#### Código

- A.

### Validação visual

- Conferir.

## f2 · Segunda fase

### Objetivo

Segunda.

### Escopo

#### Código

- B.

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
