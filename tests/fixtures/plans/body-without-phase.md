---
id: sem-yaml
title: Corpo sem fase
phases:
  - id: f1
    title: Primeira fase
    files: [src/a.ts]
    verify: ["npm test"]
    commit_msg: "feat: primeira fase"
---

# Corpo sem fase

## Contexto

A f2 está no corpo, mas não no YAML.

## f1 · Primeira fase

### Objetivo

Primeira.

### Escopo

#### Código

- A.

### Validação visual

- Conferir.

## f2 · Fase esquecida no YAML

### Objetivo

Segunda.

### Escopo

#### Código

- B.

### Validação visual

- Conferir.
