---
track: conhecimento
type: padrao
module: ui-web
summary: O front chama o Python só pela classe Api exposta ao pywebview, nunca por evaluate_js
tags: [pywebview, api-js]
applies_when: [expor função Python ao front]
created: 2026-09-18
---

# Ponte entre o front e o Python

Métodos públicos de `Api` viram `window.pywebview.api.<nome>()` no front.
