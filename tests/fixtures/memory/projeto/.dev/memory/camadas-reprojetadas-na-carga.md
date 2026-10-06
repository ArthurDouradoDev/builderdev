---
track: conhecimento
type: convencao
module: geom
summary: Camadas são reprojetadas para o CRS do projeto na carga; viewshed e buffer dependem disso
tags: [crs, reprojecao]
created: 2026-08-26
---

# Reprojeção na carga

Toda camada passa por `carregar_camada()`, que reprojeta para o CRS do projeto.
O desenho nunca reprojeta.
