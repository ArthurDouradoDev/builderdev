---
id: e4-comparacao
title: Comparação espacial com e sem edificações
branch: feat/e4-viewshed
created: 2026-09-22
phases:
  - id: f1
    title: Máscara de edificações no viewshed
    files: [src/geom/viewshed.py, src/geom/buildings.py]
    verify: ["pytest tests/geom -q"]
    commit_msg: "feat: máscara de edificações no viewshed"
  - id: f2
    title: Endpoint de diff A/B
    files: [api/routes/analysis.py]
    verify: ["pytest tests/api/test_analysis.py -q"]
    commit_msg: "feat: endpoint de comparação A/B"
  - id: f3
    title: Legenda de edificações no globo
    needs: [f1]
    files: [web/globe/legend.tsx]
    verify: ["npm test -- legend"]
    commit_msg: "feat: legenda de edificações"
---

# Comparação espacial com e sem edificações

## Contexto

O viewshed ignora edificações e superestima a área visível.

## Fora do escopo

- Edificações em 3D.

## f1 · Máscara de edificações no viewshed

### Objetivo

Aplicar as edificações como obstáculos no cálculo do viewshed.

### Escopo

#### Código

- `buildings.py` rasteriza os polígonos na grade do viewshed.

#### Testes

- Caso com um prédio bloqueando metade da visada.

### Validação visual

- Abrir o mapa e conferir a sombra atrás do prédio.

## f2 · Endpoint de diff A/B

### Objetivo

Expor a diferença entre as duas máscaras numa rota.

### Escopo

#### Código

- Rota `GET /analysis/diff`.

### Validação visual

- Chamar a rota e conferir o GeoJSON.

## f3 · Legenda de edificações no globo

### Objetivo

Mostrar a legenda das edificações no globo.

### Escopo

#### Código

- Componente `Legend`.

```md
## f9 · Título dentro de bloco de código não conta
```

### Validação visual

- Conferir a legenda no canto inferior.
