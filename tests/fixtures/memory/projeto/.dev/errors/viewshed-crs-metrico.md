---
track: bug
type: dados
module: geom
summary: Viewshed exige CRS métrico; em graus a máscara sai deslocada
tags: [crs, viewshed]
symptoms:
  - máscara de visibilidade deslocada alguns quilômetros
  - raio de alcance ignorado em camadas EPSG:4326
root_cause: o cálculo de distância trata as unidades do CRS como metros
resolution: reprojetar a camada para um CRS métrico (UTM da zona) antes do viewshed
occurrences: 2
applies_when: [calcular viewshed, usar camadas em graus]
created: 2026-08-28
updated: 2026-09-12
---

# Viewshed em CRS geográfico

O `viewshed()` recebe o raio em unidades do CRS. Em EPSG:4326 isso vira graus,
e o resultado parece plausível mas está errado.

```python
camada = camada.to_crs(camada.estimate_utm_crs())
```
