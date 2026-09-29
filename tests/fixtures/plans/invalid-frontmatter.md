---
id: yaml-quebrado
title: YAML quebrado
phases:
  - id: f1
    title: Primeira fase
    files: [src/a.ts, src/b.ts
    verify: ["npm test"]
    commit_msg: "feat: primeira fase"
---

# YAML quebrado

## Contexto

A lista de files não fecha o colchete.
