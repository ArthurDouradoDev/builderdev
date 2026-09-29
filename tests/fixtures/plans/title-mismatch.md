---
id: e4
title: Comparação A/B
phases:
  - id: f1
    title: Máscara de edificações
    files: [src/geom/viewshed.py]
    verify: ["pytest tests/geom -q"]
    commit_msg: "feat: máscara de edificações"
  - id: f2
    title: Endpoint de diff A/B
    files: [api/routes/analysis.py]
    verify: ["pytest tests/api -q"]
    commit_msg: "feat: endpoint A/B"
---

# Comparação A/B

## Contexto

Exemplo com título de fase divergente.

## f1 · Máscara de edificações

### Objetivo

Máscara.

### Escopo

#### Código

- Máscara.

### Validação visual

- Conferir.

## f2 · Endpoint A/B

### Objetivo

Endpoint.

### Escopo

#### Código

- Rota.

### Validação visual

- Conferir.
