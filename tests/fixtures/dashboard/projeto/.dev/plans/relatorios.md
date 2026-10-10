---
id: relatorios
title: Relatórios mensais
branch: feat/relatorios
created: 2026-09-01
phases:
  - id: f1
    title: Coleta dos dados
    files: [src/coleta.ts]
    verify: ["npm test -- coleta"]
    commit_msg: "feat: coleta dos dados do relatório"
  - id: f2
    title: Geração do PDF
    files: [src/pdf.ts]
    verify: ["npm test -- pdf"]
    commit_msg: "feat: geração do PDF"
  - id: f3
    title: Envio por e-mail
    files: [src/envio.ts]
    verify: ["npm test -- envio"]
    commit_msg: "feat: envio do relatório por e-mail"
  - id: f4
    title: Agendamento
    needs: [f1]
    files: [src/agenda.ts]
    verify: ["npm test -- agenda"]
    commit_msg: "feat: agendamento dos relatórios"
---

# Relatórios mensais

## Contexto

Relatórios gerados à mão todo mês.

## f1 · Coleta dos dados

### Objetivo

Ler os dados do mês.

### Escopo

#### Código

- `src/coleta.ts`

### Validação visual

- Conferir os totais.

## f2 · Geração do PDF

### Objetivo

Gerar o PDF.

### Escopo

#### Código

- `src/pdf.ts`

### Validação visual

- Abrir o PDF.

## f3 · Envio por e-mail

### Objetivo

Enviar o PDF.

### Escopo

#### Código

- `src/envio.ts`

### Validação visual

- Receber o e-mail.

## f4 · Agendamento

### Objetivo

Rodar todo mês.

### Escopo

#### Código

- `src/agenda.ts`

### Validação visual

- Conferir o agendamento.
