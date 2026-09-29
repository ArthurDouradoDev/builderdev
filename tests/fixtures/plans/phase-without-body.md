---
id: sem-corpo
title: Fase sem corpo
phases:
  - id: f1
    title: Primeira fase
    files: [src/a.ts]
    verify: ["npm test"]
    commit_msg: "feat: primeira fase"
  - id: f2
    title: Segunda fase
    files: [src/b.ts]
    verify: ["npm test"]
    commit_msg: "feat: segunda fase"
---

# Fase sem corpo

## Contexto

A f2 está no YAML, mas não no corpo.

## f1 · Primeira fase

### Objetivo

Primeira.

### Escopo

#### Código

- A.

### Validação visual

- Conferir.
