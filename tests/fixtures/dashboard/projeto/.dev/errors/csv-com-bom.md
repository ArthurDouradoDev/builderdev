---
track: bug
type: dados
module: importacao
summary: CSV salvo pelo Excel começa com BOM e a primeira coluna perde o nome
tags: [csv, encoding]
symptoms:
  - primeira coluna vem como "﻿nome"
root_cause: o Excel grava UTF-8 com BOM
resolution: remover o BOM antes de ler o cabeçalho
occurrences: 3
created: 2026-09-16
---

# BOM no CSV

O mesmo erro voltou em cada nova planilha de cliente.
