---
id: v2-dashboard
title: Painel dos projetos - visão geral, dados do BuilderDev e fluxo do plano
branch: feat/v2-dashboard
created: 2026-10-08
phases:
  - id: f1
    title: Varredura da pasta e painel geral com git
    files:
      - package.json
      - scripts/build.mjs
      - src/cli.ts
      - src/git/log.ts
      - src/dashboard/scan.ts
      - src/dashboard/git-info.ts
      - src/dashboard/alerts.ts
      - src/dashboard/server.ts
      - src/dashboard/ui/
      - dist/
      - tests/dashboard/
    verify:
      - "npm run typecheck"
      - "npx vitest run tests/dashboard"
      - "npm run build"
    commit_msg: "feat: painel geral dos projetos com dados do git"
  - id: f2
    title: Dados do BuilderDev nos cards
    files:
      - src/dashboard/builderdev.ts
      - src/dashboard/alerts.ts
      - src/dashboard/scan.ts
      - src/dashboard/ui/
      - dist/
      - tests/dashboard/
      - tests/fixtures/dashboard/
    verify:
      - "npm run typecheck"
      - "npx vitest run tests/dashboard"
      - "npm run build"
    commit_msg: "feat: progresso do plano e verificação nos cards do painel"
  - id: f3
    title: Página do projeto e fluxo do plano
    files:
      - src/dashboard/plan-view.ts
      - src/dashboard/layout.ts
      - src/dashboard/server.ts
      - src/dashboard/ui/
      - dist/
      - tests/dashboard/
    verify:
      - "npm run typecheck"
      - "npm test"
      - "npm run build"
    commit_msg: "feat: página do projeto com grafo de fases do plano"
---

# Painel dos projetos - visão geral, dados do BuilderDev e fluxo do plano

## Contexto

Os projetos ficam todos em `Desktop/Projetos` (14 pastas, 11 com git, só o `betterdev` com `.dev/`), e falta um lugar para ver em que pé cada um está. Este plano adianta o passo 4 do [CONCEPCAO](../../CONCEPCAO.md#7-ordem-de-construção) com uma mudança de escopo: o visualizador começa pela pasta inteira, não por um repositório. Ele precisa ser útil com só git e mostrar mais em cada projeto que adota o BuilderDev.

## Fora do escopo

- Qualquer escrita: o painel só lê. Nada de commit, `start`, edição de plano ou de memória pela UI.
- SQLite e `fs.watch`. Com cerca de 14 projetos, ler o git a cada pedido é rápido o bastante; o cache entra só se a medição da f1 mostrar o contrário.
- As views de memória/erros navegáveis e de mapa do projeto (CONCEPCAO §6.3).
- View de atividade dos agentes (custo por sessão, tokens): o `builderdev stats` continua sendo o lugar disso.
- `git fetch` automático. "À frente" e "atrás" se referem ao último fetch feito por você.
- Varredura recursiva: só as pastas de primeiro nível da raiz.
- Acesso por outra máquina, autenticação e publicação.
- Identidade visual definitiva (`/identidade-visual`). Este plano define tokens próprios, simples e trocáveis.

## Restrições herdadas

Ainda não há entradas em `.dev/memory` neste repositório. Restrições que vêm da concepção e da v1-nucleo:

- **Cache puro, nunca fonte:** tudo que o painel mostra sai dos arquivos e do git no momento do pedido ([CONCEPCAO §6.2](../../CONCEPCAO.md#62-arquitetura)).
- **Status derivado:** o painel reusa `planStatus` e `readPlanSteps`, sem uma segunda implementação ([CONCEPCAO §3.3](../../CONCEPCAO.md#33-status-derivado)).
- **`dist/` é versionado e roda sem build no destino.** O CLI continua um único `dist/cli.js` com só `yaml` como dependência de execução; os arquivos da UI vão para `dist/ui/`.
- **A UI define o formato:** cada seção fixa do plano tem um componente correspondente ([CONCEPCAO §6.3](../../CONCEPCAO.md#63-as-três-views)), e a view de fluxo é a que precisa estar visualmente impecável.
- **Windows primeiro:** caminhos com espaço e com `\`, e `git` chamado sem shell.

## f1 · Varredura da pasta e painel geral com git

### Objetivo

Criar o comando `builderdev dashboard`, que varre as pastas de primeiro nível de uma raiz e abre no navegador uma tela com um card por projeto. Cada card mostra branch, último commit, mudanças sem commit e a situação em relação ao remoto, e destaca o que pede atenção.

### Escopo

#### Código

- **`scripts/build.mjs`:** substitui a linha longa do script `build` no `package.json`. Faz dois bundles com a API do esbuild:
  - o CLI, como hoje: `src/cli.ts` gerando `dist/cli.js` (node, esm, com o banner do `createRequire`);
  - a UI: `src/dashboard/ui/main.ts` gerando `dist/ui/app.js` (browser, iife, minificado). Também copia `index.html` e `styles.css` para `dist/ui/`.

  `package.json`: `"build": "node scripts/build.mjs"`.
- **`src/git/log.ts`:** acrescenta `gitAsync(args, cwd)` com `execFile` em forma de promise, sem shell e com timeout de 10 s. Lança `GitError` como o `git()` síncrono.
- **`src/dashboard/scan.ts`:** `scanRoot(root)` lista as pastas de primeiro nível, sem ocultas (`.`) e sem `node_modules`, e classifica cada uma:
  - `sem-git`: não tem `.git`;
  - `git`: tem `.git`;
  - `builderdev`: tem `.git` e `.dev/plans` (os dados chegam na f2).

  Coleta os projetos com no máximo 4 em paralelo. Um projeto que falha vira um card com `erro`, e a varredura continua. Devolve `{ root, scannedAt, durationMs, projects }`.
- **`src/dashboard/git-info.ts`:** `gitInfo(dir)`, uma chamada `gitAsync` para cada dado:
  - **branch:** `git rev-parse --abbrev-ref HEAD`; `HEAD` vira `destacado` com o hash curto;
  - **último commit:** `git log -1 --format=%h%x1f%s%x1f%cI%x1f%an`. Repositório sem commits devolve `null`, sem erro;
  - **mudanças sem commit:** `git status --porcelain=v1 -z`, separando modificados e não rastreados. Para cada caminho (no máximo 200), lê o `mtime` e guarda o mais antigo e o mais recente;
  - **remoto:** `git rev-list --left-right --count @{u}...HEAD` dá `atrás` e `à frente`. Sem upstream, os dois ficam `null`;
  - **ritmo:** `git rev-list --count --since=7.days HEAD` dá os commits dos últimos 7 dias.

  `lastActivity` é o mais recente entre a data do último commit e o `mtime` mais recente das mudanças. Para pastas `sem-git`, é o `mtime` mais recente entre as entradas de primeiro nível.
- **`src/dashboard/alerts.ts`:** `alertsFor(project, now)` devolve `{ code, severity: 'atencao' | 'info', message }[]`. Regras desta fase:
  - `mudancas-paradas` (atenção): há mudança sem commit cujo `mtime` mais antigo passa de 2 dias;
  - `atras-do-remoto` (atenção): `atrás > 0`;
  - `sem-push` (info): `à frente > 0`;
  - `parado` (info): última atividade há mais de 30 dias;
  - `sem-git` (info): a pasta não é um repositório.

  Os limites ficam em constantes exportadas, sem configuração.
- **`src/dashboard/server.ts`:** `startServer({ root, port, uiDir })` com `node:http`:
  - escuta **só em `127.0.0.1`**. A porta padrão é 4317; `--port 0` escolhe uma livre;
  - recusa com 403 os pedidos cujo `Host` não seja `127.0.0.1:<porta>` ou `localhost:<porta>`, para barrar DNS rebinding. Só aceita `GET`;
  - `GET /api/projects` devolve a varredura em JSON;
  - os outros caminhos servem os arquivos de `uiDir` (`dist/ui/` ao lado do `cli.js`), com o tipo de conteúdo pela extensão e caminho normalizado preso a `uiDir`. Caminho desconhecido devolve `index.html`, porque a UI navega por `#`.
- **`src/cli.ts`:** comando `dashboard [--root <pasta>] [--port <n>] [--no-open]`:
  - `--root` padrão: a pasta atual;
  - imprime a URL e, sem `--no-open`, abre o navegador (`cmd /c start "" <url>` no Windows, `open` no macOS, `xdg-open` nos outros);
  - fica rodando até `Ctrl+C`;
  - entra no `USAGE`.
- **`src/dashboard/ui/`** (TypeScript sem framework, renderização por `<template>` e `textContent`, nunca `innerHTML` com dado do projeto):
  - `index.html`, `styles.css`, `main.ts`, `api.ts` e `cards.ts`;
  - `styles.css` com tokens em `:root` (cores, espaço, raio, tipografia na pilha de fontes do sistema) e tema escuro por `prefers-color-scheme`. Status e alertas usam cor e texto, nunca só cor.

#### Interface

```
$ builderdev dashboard --root C:/Users/awx1530897/Desktop/Projetos
painel em http://127.0.0.1:4317 (14 projetos; Ctrl+C encerra)
```

Tela geral:

- **Cabeçalho:** a raiz, "atualizado há N s" e um botão Atualizar. A tela também atualiza ao voltar o foco para a aba e a cada 60 s enquanto ela está visível.
- **Faixa de resumo:** total de projetos, quantos com atenção, quantos com mudanças sem commit e quantos parados.
- **Filtros:** Todos · Com atenção · BuilderDev · Parados, mais uma busca por nome. O filtro escolhido fica na URL (`#/?filtro=atencao`).
- **Grade de cards**, ordenada por última atividade. Os que têm alerta de atenção vêm primeiro. Cada card mostra:

```
┌───────────────────────────────────────────┐
│ MDT                              ● atenção │
│ feat/pywebview · há 2 h                   │
│ "refactor: ponte js-python"               │
│ 4 modificados · 1 novo · ↑2 ↓0            │
│ 9 commits em 7 dias                       │
│ ▲ mudanças sem commit há 3 dias           │
└───────────────────────────────────────────┘
```

- **Card `sem-git`:** compacto e esmaecido, com a nota "sem git".
- **Card com `erro`:** mostra a mensagem do git, sem quebrar a grade.
- **Estados:** carregando (esqueleto dos cards), raiz vazia e servidor fora do ar ("o painel parou: rode builderdev dashboard de novo").
- **Telas estreitas:** a grade vira uma coluna em telas abaixo de 640 px.

#### Testes

- `tests/dashboard/scan.test.ts`: raiz temporária com uma pasta comum, um repositório git e uma pasta oculta. Classifica certo, ignora a oculta e `node_modules`, e um repositório corrompido vira card com `erro` sem derrubar a varredura.
- `tests/dashboard/git-info.test.ts`, com repositórios reais criados por `tests/helpers/repo.ts`:
  - repositório sem commits;
  - HEAD destacado;
  - modificado e não rastreado contados à parte;
  - caminho com espaço;
  - upstream local (um clone `--bare` como remoto) com `à frente` e `atrás` corretos;
  - sem upstream, os dois ficam `null`.
- `tests/dashboard/alerts.test.ts`: cada regra no limite (2 dias exatos não alerta, 2 dias e 1 min alerta), com `now` fixo.
- `tests/dashboard/server.test.ts`:
  - servidor na porta 0 com uma raiz temporária e um `uiDir` de fixture;
  - `GET /api/projects` devolve JSON com os projetos;
  - `Host: evil.com` recebe 403;
  - `POST` recebe 405;
  - `/../package.json` não sai de `uiDir`;
  - caminho desconhecido devolve o `index.html`.

### Validação visual

- `npm run build`, depois `builderdev dashboard --root C:/Users/awx1530897/Desktop/Projetos`. O navegador abre com os 14 projetos, e `ai`, `BotD-1` e `db_views` aparecem como "sem git".
- Anotar o `durationMs` em `/api/projects` (abrir a URL no navegador). Acima de ~3 s, registrar antes do commit: é o sinal para o cache que ficou fora do escopo.
- Conferir 3 cards contra o terminal: `git status` e `git log -1` no MDT, no atlas e no DT batem com o que o card mostra.
- Modificar um arquivo num projeto qualquer, voltar para a aba do painel e conferir que o card atualizou sozinho.
- Testar os filtros e a busca, recarregar a página com um filtro ativo e conferir que ele se manteve.
- Alternar o Windows entre tema claro e escuro: os dois ficam legíveis, e os alertas se distinguem pelo texto.
- Estreitar a janela até uma coluna: nada transborda na horizontal.
- `Ctrl+C` encerra o processo sem deixar a porta ocupada (rodar de novo funciona).

## f2 · Dados do BuilderDev nos cards

### Objetivo

Nos projetos que usam o BuilderDev, o card passa a mostrar o plano em andamento, o progresso das fases, a fase ativa e o último resultado da verificação. Os alertas ganham as situações do BuilderDev, e os projetos sem `.dev/` ganham a indicação de como adotar.

### Escopo

#### Código

- **`src/dashboard/builderdev.ts`:** `builderdevInfo(dir)` reusa o que já existe (`listPlans`, `readPlanSteps`, `readState`, `planStatus`, `lintPlanFile` e `listEntryFiles`) e devolve:
  - **`plans`:** id, título, `created`, fases concluídas/total, contagem por status e quantidade de erros do lint;
  - **`currentPlan`:** o plano da fase ativa. Sem fase ativa, o plano mais recente (por `created`) que ainda tem fase não concluída. Se todos estiverem concluídos, o último concluído;
  - **`active`:** plano, fase, título, `startedAt` e o status calculado. Indica se a fase está `bloqueada` ou já `concluida` (estado desatualizado);
  - **`lastVerify`:** o último registro `evento: verify` do `.dev/.local/metrics.jsonl` da fase ativa. Para não carregar o arquivo inteiro, lê só os últimos 64 KB;
  - **`memory`:** quantidade de entradas em `.dev/memory` e em `.dev/errors`, e quantos erros têm `occurrences > 1`.

  Erro ao ler um plano entra no resultado como `error`, sem derrubar o card.
- **`src/dashboard/scan.ts`:** para projetos `builderdev`, chama `builderdevInfo` junto com o `gitInfo`.
- **`src/dashboard/alerts.ts`:** regras novas:
  - `verify-falhou` (atenção): o último `verify` da fase ativa falhou;
  - `fase-bloqueada` (atenção): a fase ativa tem dependência pendente;
  - `fase-ativa-concluida` (info): o estado local aponta para uma fase já concluída;
  - `plano-invalido` (atenção): algum plano tem erro no lint;
  - `erro-repetido` (info): há entrada de bug com `occurrences > 1`.
- **`src/dashboard/ui/cards.ts`:** bloco do BuilderDev no card e o filtro "BuilderDev" ligado ao novo tipo.

#### Interface

Card de um projeto com BuilderDev:

```
┌───────────────────────────────────────────┐
│ betterdev                     ● atenção   │
│ feat/v2-dashboard · há 20 min             │
│ v2-dashboard · Painel dos projetos        │
│ ███████░░░░░░░  1/3 fases                 │
│ ativa: f2 · Dados do BuilderDev nos cards │
│ verify: ✕ falhou há 5 min                 │
│ memória 4 · erros 2 (1 repetido)          │
└───────────────────────────────────────────┘
```

- A barra de progresso tem um segmento por fase, colorido pelo status. O título da fase aparece no `title` de cada segmento.
- Sem fase ativa, a linha diz "nenhuma fase ativa" e aponta a próxima fase liberada ("próxima: f3 · …").
- Projeto `git` sem `.dev/` mostra a linha discreta "sem BuilderDev · /builderdev:setup".

#### Testes

- `tests/fixtures/dashboard/`: um projeto com dois planos (um concluído, um em andamento), `state.json`, `metrics.jsonl` com verificações aprovadas e com falha, e entradas de memória e de erro.
- `tests/dashboard/builderdev.test.ts`, numa cópia da fixture com commits reais e trailers `Plan-Step`:
  - a escolha do `currentPlan` em cada um dos três casos;
  - a contagem por status;
  - `lastVerify` pega o registro mais recente da fase ativa e ignora os de outras fases;
  - `metrics.jsonl` ausente ou com uma linha quebrada não lança erro;
  - um plano inválido vira `error` com a contagem do lint.
- `tests/dashboard/alerts.test.ts`: um caso por regra nova.
- `tests/dashboard/scan.test.ts`: um projeto `builderdev` na raiz traz os dois blocos, git e BuilderDev.

### Validação visual

- Com o painel aberto na pasta `Projetos`, o card do `betterdev` mostra a `v2-dashboard` como plano atual. A f1 aparece concluída depois do commit dela, e a f2 aparece ativa após `builderdev start v2-dashboard/f2`.
- Quebrar um teste de `tests/dashboard`, deixar o hook `Stop` rodar numa sessão e voltar ao painel. O card mostra "verify: ✕ falhou" e o alerta de atenção. Consertar e conferir que volta para ✓.
- `builderdev start v2-dashboard/f3 --force`: o card mostra o alerta de fase bloqueada. Voltar com `builderdev start v2-dashboard/f2`.
- Os cards dos outros 10 repositórios mostram "sem BuilderDev · /builderdev:setup", e nenhum deles quebrou.
- Se o MDT já tiver passado pelo `/builderdev:setup` (v1-nucleo, f5), o card dele mostra a contagem de memória e erros coerente com `.dev/memory` e `.dev/errors`.

## f3 · Página do projeto e fluxo do plano

### Objetivo

Ao clicar num card de projeto com BuilderDev, abrir a página do projeto com os planos dele. Ao escolher um plano, ver as fases como grafo, com cor por status e um painel com as seções fixas de cada fase. É a view de fluxo da §6.3 do CONCEPCAO, só para leitura.

### Escopo

#### Código

- **`src/dashboard/plan-view.ts`:** `planView(dir, planId)` monta o JSON da view a partir do parser e do status que já existem:
  - cabeçalho: id, título, branch, `created`, Contexto e Fora do escopo (markdown cru);
  - restrições herdadas, com os links resolvidos para caminhos dentro do projeto;
  - para cada fase:
    - campos: id, título, status, `dependsOn`, `blockedBy`, `files`, `verify` e `commit_msg`;
    - seções Objetivo, Código, Interface, Testes e Validação visual (markdown cru; seção ausente vira `null`);
    - último resultado de `verify` da fase no `metrics.jsonl`;
    - commits da fase com hash curto, assunto e data (um `git log --no-walk` para todos os hashes).
  - **fases órfãs:** commits com trailer `<plano>/<fase>` cuja fase não existe mais no YAML. Aparecem numa lista à parte, em vez de sumirem (questão em aberto da CONCEPCAO §8).
- **`src/dashboard/layout.ts`:** `layoutGraph(phases)`, um layout em camadas determinístico e sem dependência. Devolve as posições dos nós e as arestas, prontas para SVG:
  - camada de uma fase = o maior caminho até ela a partir das fases sem dependência;
  - dentro da camada, a ordem do YAML;
  - plano linear vira uma linha só.
- **`src/dashboard/server.ts`:** rotas novas. `<nome>` precisa ser o nome de um projeto da varredura (senão 404), e nunca é usado como caminho direto:
  - `GET /api/projects/<nome>`: o card mais a lista de planos;
  - `GET /api/projects/<nome>/plans/<id>`: o `planView`.
- **`src/dashboard/ui/`:**
  - **`router.ts`:** rotas por `#`: `#/`, `#/p/<nome>` e `#/p/<nome>/<plano>[/<fase>]`. O voltar do navegador funciona;
  - **`markdown.ts`:** renderizador do subconjunto usado nos planos:
    - títulos, parágrafos e listas aninhadas;
    - blocos de código e código inline;
    - negrito, itálico e links.

    Escapa todo o texto antes de formatar. Link externo abre em nova aba com `rel="noopener"`; link relativo a arquivo do projeto aparece como caminho, sem link;
  - **`graph.ts`:** desenha o `layoutGraph` em SVG. Os nós são cards com id, título e status (cor e rótulo), e as arestas são curvas. Fase com `blockedBy` mostra a aresta pendente tracejada. Clique ou Enter num nó seleciona a fase, e as setas do teclado navegam entre os nós;
  - **`phase-panel.ts`:** painel lateral da fase, em ordem fixa:
    - Objetivo;
    - abas Código, Interface e Testes (só as que existem);
    - arquivos (`files`);
    - verificação (`verify`, com o último resultado e a data);
    - Validação visual como lista de instruções, sem caixas de marcar (não é estado);
    - commit: a mensagem sugerida, ou os commits reais quando a fase está concluída.

#### Interface

- **Página do projeto (`#/p/betterdev`):**
  - cabeçalho com nome, branch e o resumo do git da f1;
  - lista de planos, do mais recente ao mais antigo, cada um com título, data, barra de progresso por fase e a fase ativa destacada.
- **Página do plano (`#/p/betterdev/v2-dashboard`):**

```
← betterdev   Painel dos projetos - visão geral, dados do BuilderDev e fluxo do plano
              feat/v2-dashboard · criado em 08/10/2026 · 1/3 fases
┌ Contexto ──────────────────────────────────────────────────────────┐
│ Os projetos ficam todos em Desktop/Projetos (14 pastas, ...)        │
└────────────────────────────────────────────────────────────────────┘
Fora do escopo: escrita pela UI · SQLite e fs.watch · views de memória ...   [ver tudo]

 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │ f2 · Dados do BuilderDev...
 │ f1 concluída │ ──▶ │ f2 ativa     │ ──▶ │ f3 bloqueada │ │ Objetivo
 │ Varredura... │     │ Dados do ... │     │ Página do... │ │ [Código] Interface  Testes
 └──────────────┘     └──────────────┘     └──────────────┘ │ ...
                                                            │ Arquivos · Verificação
                                                            │ Validação visual · Commit
```

- **Fase selecionada:** a fase ativa, ou a primeira não concluída. A seleção vai para a URL (`/<fase>`), então dá para compartilhar o link localmente.
- **Fases órfãs:** aparecem abaixo do grafo, em "Commits de fases que não existem mais no plano", com o hash e o assunto.
- **Card da tela geral:** o clique leva para `#/p/<nome>`. O plano atual tem um atalho direto para o grafo.
- **Telas estreitas:** abaixo de 900 px, o painel da fase desce para baixo do grafo, e o grafo ganha rolagem horizontal própria (a página não rola na horizontal).
- **Tema:** os mesmos tokens da f1. As cores de status são as mesmas da barra de progresso da f2.

#### Testes

- `tests/dashboard/layout.test.ts`:
  - plano linear em uma linha;
  - `needs` paralelo (f2 e f3 dependendo só de f1) em duas camadas, com f2 e f3 na mesma;
  - diamante (f4 depende de f2 e f3);
  - saída idêntica em duas execuções.
- `tests/dashboard/plan-view.test.ts`, numa cópia da fixture da f2:
  - seções extraídas por fase, e seção ausente vira `null`;
  - status e commits com assunto;
  - fase órfã: commit com trailer de uma fase removida do YAML aparece na lista de órfãs;
  - plano inexistente lança erro tratado.
- `tests/dashboard/markdown.test.ts`:
  - `<script>` no texto sai escapado;
  - listas aninhadas;
  - bloco de código preserva o conteúdo;
  - link `javascript:` não vira link;
  - o próprio `.dev/plans/v2-dashboard.md` renderiza sem lançar erro.
- `tests/dashboard/server.test.ts`: as rotas novas; projeto desconhecido recebe 404; `%2e%2e` no nome recebe 404.
- `npm test` completo passa.

### Validação visual

- No card do `betterdev`, clicar e conferir a página do projeto com a `v1-nucleo` (5/5) e a `v2-dashboard`.
- Abrir a `v1-nucleo`: o grafo mostra f1 na base, f2 e f3 lado a lado dependendo dela, f4 juntando as duas e f5 no fim, como no YAML. Todas aparecem concluídas, com os commits reais no painel.
- Abrir a `v2-dashboard`: uma linha f1 → f2 → f3, com a f3 ativa. Comparar o painel da f3 com este arquivo, seção por seção, e conferir que nada falta ou sobra.
- Navegar só pelo teclado (Tab até o grafo, setas entre os nós, Enter seleciona) e usar o voltar do navegador entre as páginas.
- Num repositório de teste, criar um commit com `Plan-Step: v2-dashboard/f9` e conferir que ele aparece em "Commits de fases que não existem mais no plano".
- Ver a página do plano em tema claro e escuro e com a janela estreita. Julgar com cuidado: é a view que precisa estar impecável. Anotar o que incomoda antes do commit em vez de deixar para depois.
