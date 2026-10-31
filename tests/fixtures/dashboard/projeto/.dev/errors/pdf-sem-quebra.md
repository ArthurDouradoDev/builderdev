---
track: bug
type: ui
module: relatorios
summary: Tabela longa no PDF não quebrava de página e cortava as linhas
tags: [pdf]
symptoms:
  - linhas somem no fim da página
root_cause: a tabela era desenhada como um bloco só
resolution: desenhar linha a linha e quebrar a página quando faltar espaço
occurrences: 1
created: 2026-09-20
---

# Tabela cortada no PDF

A quebra de página é feita por linha.
