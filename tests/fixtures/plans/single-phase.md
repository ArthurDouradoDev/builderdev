---
id: renomear-rotas
title: Renomear rotas de análise
branch: fix/rotas
created: 2026-09-22
phases:
  - id: f1
    title: Rotas com prefixo /v2
    files: [api/routes/]
    verify: ["pytest tests/api -q"]
    commit_msg: "refactor: rotas de análise sob /v2"
---

# Renomear rotas de análise

## Contexto

As rotas antigas conflitam com o proxy.

## f1 · Rotas com prefixo /v2

### Objetivo

Mover as rotas de análise para `/v2`.

### Escopo

#### Código

- Prefixo no roteador.

### Validação visual

- Chamar `/v2/analysis` e receber 200.
