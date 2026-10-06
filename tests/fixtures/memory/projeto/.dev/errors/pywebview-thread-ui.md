---
track: bug
type: ui
module: ui-web
summary: Chamar o pywebview fora da thread principal trava a janela no Windows
tags: [pywebview, threads]
symptoms:
  - janela congela sem erro no console
root_cause: o pywebview exige que a janela seja manipulada pela thread que a criou
resolution: enfileirar a chamada com window.evaluate_js a partir da thread principal
occurrences: 1
created: 2026-09-15
---

# Janela travada pelo pywebview

Tarefas longas rodam em thread separada e devolvem o resultado por uma fila
que a thread principal consome.
