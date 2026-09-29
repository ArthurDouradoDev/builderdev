# BetterDev — Documento de concepção

**Data:** 22/09/2026 · **Revisão 1:** 22/09/2026, após análise das referências (ver [`referencias/`](referencias/README.md))
**Escopo:** dois projetos irmãos — um plugin de fluxo de desenvolvimento com IA e uma plataforma de visualização desse fluxo.

Este documento registra o diagnóstico que originou os projetos, as decisões de arquitetura já tomadas, o desenho resultante e a ordem de construção. É o ponto de partida; não é um plano de implementação (esses ficam em `.dev/plans/`; o primeiro é [`v1-nucleo`](.dev/plans/v1-nucleo.md)).

---

## 1. Diagnóstico — o problema medido

Varredura dos projetos em `Desktop/Projetos` em 22/09/2026. Tamanhos reais dos arquivos que o `CLAUDE.md` manda ler na abertura de toda sessão:

| Projeto | CLAUDE.md | MEMORY.md | ERRORS.md | Total | ≈ tokens |
|---|---|---|---|---|---|
| `atlas` | 6 KB | 67 KB | 57 KB | 130 KB | ~33k |
| `smart-events` | 5 KB | 185 KB | 93 KB | 283 KB | ~71k |
| `MDT` | 3 KB | 90 KB | 59 KB | 152 KB | ~38k |
| `DT` | 4 KB | 4 KB | 3 KB | 11 KB | ~3k |
| `Projetos/` (raiz) | — | 432 KB | 290 KB | 722 KB | ~180k |

*Estimativa a ~4 caracteres por token.*

O `atlas/CLAUDE.md` instrui, nas primeiras linhas:

> 1. Read this `CLAUDE.md` completely.
> 2. Read `MEMORY.md` for the current project state...
> 3. Read `ERRORS.md` to avoid repeating known failures.

### Por que isso é um problema

O custo em dinheiro é secundário. O problema real:

- a sessão entra na janela de contexto com 20–40% já comprometido;
- a compactação chega cedo;
- depois da compactação, o agente perde justamente o detalhe que foi caro carregar.

**O fluxo atual fica mais burro mais rápido.** E como os arquivos são append-only por design (`## Sessão 11/09/2026 — ...`), a degradação é monotônica: piora sozinha, todo dia.

O contexto residente não é pago uma vez: é relido a cada turno. As referências medem isso de forma independente — no superpowers, metade do custo de uma execução é "~150 turnos × contexto residente"; o Codex relê o SKILL.md ~500× numa sessão longa; o guia oficial do Claude Code diz que um CLAUDE.md inchado faz o modelo ignorar as instruções. Os 33–71k do `atlas` são pagos em todo turno, não na abertura.

Esse é o problema que os dois projetos atacam, cada um de um lado — o plugin pelo lado da escrita, a plataforma pelo lado da leitura humana.

---

## 2. Decisões tomadas

| Questão | Decisão |
|---|---|
| Fonte da verdade | **Híbrido**: arquivos `.md` canônicos + índice em banco (cache reconstruível) |
| Deploy / multiusuário | **Local-first**, sincronização via git |
| Escopo da v1 | As três views: planos, memória/erros, mapa do projeto — **com peso na qualidade visual** |
| Integração com a IA | **CLI + hooks** |
| Forma dos planos | **Fases** com estrutura `.md` padrão; dependência opcional, padrão linear; grafo só quando há paralelismo real *(rev. 1)* |
| Estado de execução | **Derivado do git**, nunca escrito no plano *(rev. 1)* |
| O que entra na memória | Só o que passa no **critério de durabilidade**; o `/wrap` pode não escrever nada *(rev. 1)* |
| Índices | **Gerados** a partir do frontmatter, nunca editados à mão *(rev. 1)* |
| Modelo barato | Só para **mecânica**; julgamento fica no modelo da sessão *(rev. 1)* |

---

## 3. A espinha — um formato de plano, três consumidores

O plano deixa de ser prosa solta e vira **estrutura declarada + prosa em lugares fixos**. A regra: *estrutura no YAML, prosa no corpo, nunca os dois*. O template completo está em [`templates/plan.md`](templates/plan.md).

### 3.1 Frontmatter — o que a máquina consome

```yaml
---
id: e4-comparacao-espacial
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
    needs: [f1]            # opcional; ausente = depende da fase anterior
    files: [web/globe/legend.tsx]
    verify: ["npm test -- legend"]
    commit_msg: "feat: legenda de edificações"
---
```

Não há `status` nem hash de commit. As duas referências maduras (compound e superpowers) proíbem estado mutável dentro do plano: ele deriva e diverge. No BetterDev há um motivo a mais — colaboração via git, e dois devs movendo `status:` no mesmo YAML é conflito de merge.

`needs:` é opcional. O caso comum (fases em sequência) não declara nada e a UI desenha uma cadeia; bifurcações aparecem só quando declaradas. `needs:` continua sendo o que separa isso de um Trello: bloqueio explícito e caminho crítico saem de graça.

### 3.2 Corpo — o que o humano lê

Títulos fixos, em ordem fixa, derivados do prompt de planejamento que já funciona na prática:

```
# <título>
## Contexto                 obrigatório · 2–4 linhas, vem da conversa
## Fora do escopo           recomendado
## Restrições herdadas      links para memory/ e errors/
## f1 · <título da fase>    id + título idênticos ao YAML
### Objetivo                obrigatório · até 3 linhas
### Escopo
#### Código                 obrigatório
#### Interface              opcional (omitir em vez de "sem mudanças")
#### Testes                 opcional
### Validação visual        checklist de instruções para o humano
```

Um script (`betterdev lint`) valida a correspondência YAML ↔ corpo: mesmos ids, mesmos títulos, seções obrigatórias presentes. Plano de fase única usa a mesma estrutura com `f1`. Tarefa trivial ("se dá para descrever o diff em uma frase") não gera plano.

### 3.3 Status derivado

| Status | Origem |
|---|---|
| Pendente | nenhum commit com `Plan-Step: <plano>/<fase>` |
| Bloqueada | alguma fase em `needs` (ou a anterior) sem commit |
| Ativa | `betterdev start f2` grava estado local, gitignored; o hook `SessionStart` injeta na sessão |
| Concluída | existe commit com o trailer da fase |

A validação visual acontece **antes** do commit; o commit é a confirmação. O checklist é instrução, não estado.

### 3.4 Os três consumidores

1. **A IA** recebe só a fase ativa: o bloco `## f2` e a entrada `f2` do YAML, extraídos por script — nunca o plano inteiro, nunca o histórico.
2. **A UI** lê `phases` e `needs` como grafo e cada seção fixa como um componente (§6.3).
3. **Os hooks** fecham o ciclo: `prepare-commit-msg` preenche `commit_msg` + trailer `Plan-Step` da fase ativa; `Stop` roda `verify`; o status sai do `git log`.

---

## 4. Projeto 1 — Plugin

### 4.1 Estrutura de arquivos

```
CLAUDE.md / AGENTS.md    shim de 1–3 linhas: @.dev/CLAUDE.md (hosts não leem .dev/ sozinhos)
.dev/
  CLAUDE.md              ~120 linhas · estável · IMUTÁVEL durante a sessão
  memory/                trilha de conhecimento (convenções, decisões, padrões)
    index.md             GERADO · gitignored · 1 linha por entrada
    enquadramento-camera.md      slug, não data · frontmatter validado · máx 40 linhas
  errors/                trilha de bugs (sintoma, causa, correção)
    index.md             GERADO · gitignored
    viewshed-crs-metrico.md
  plans/                 planos no formato da §3 (sem active/ e done/: status é derivado)
  templates/plan.md      copiado do plugin pelo /setup
  map.md
  DESIGN.md
  .local/                gitignored · fase ativa, logs de hooks, métricas
```

**Frontmatter das entradas** (adaptado do compound): `track` (conhecimento | bug), `type` de um enum fechado, `module`, `summary` (uma linha; vira a linha do índice), `tags` (máx 8, vocabulário do próprio corpus), `applies_when`, `created`, `updated`. Bugs exigem também `symptoms`, `root_cause`, `resolution` e `occurrences` (incrementado quando o mesmo erro volta, em vez de criar entrada nova). O enum fechado e a regra "reusar o valor que o corpus já usa" resolvem a degradação por tag livre.

**Índices gerados:** `betterdev reindex` monta `index.md` a partir do frontmatter, e o hook de sessão regenera a cada abertura. Ninguém edita e o arquivo fica fora do git, então não apodrece nem gera conflito de merge.

**Abertura de sessão:** `CLAUDE.md` + estado injetado pelo hook + os dois `index.md` ≈ **3k tokens**, no lugar dos 33–71k atuais. O resto entra sob demanda.

**Linha de descoberta no `CLAUDE.md` — informativa, não imperativa.** "`.dev/memory/` e `.dev/errors/`: aprendizados do projeto com frontmatter (module, tags); relevantes ao implementar ou depurar áreas documentadas." Nunca "sempre leia antes de começar": o compound mediu que a forma imperativa causa leituras redundantes — é o defeito do `atlas/CLAUDE.md` hoje.

**Sobreposição com a memória nativa.** O Claude Code já tem memória automática (índice + um fato por arquivo, por usuário, fora do repo). O BetterDev se diferencia por viver no repo, ser compartilhado via git, portável entre hosts e visualizável. O `/setup` deve orientar a não duplicar conteúdo entre as duas.

### 4.2 Portabilidade entre IAs

O cenário mudou desde a primeira versão (fonte: manifestos do compound e do superpowers, que suportam 14–16 hosts):

- Vários hosts **leem o manifesto de plugin do Claude Code nativamente** (Copilot CLI, Factory Droid, Qwen Code, Grok CLI). Cursor, Codex, Kimi e outros têm manifesto próprio, que é um JSON fino no mesmo repo.
- Segundo o README do compound, o Gemini CLI de consumo foi substituído pelo **Antigravity CLI (`agy`)**, que lê `GEMINI.md`.
- O custo real de portabilidade está no **formato de saída dos hooks**: o `session-start` do superpowers emite JSON diferente para Claude Code, Cursor e Copilot.

**Abordagem revisada:** `.dev/` continua neutro e canônico; toda a inteligência fica em markdown neutro e em scripts. Em vez de um gerador `betterdev sync` por host, o plugin publica manifestos nativos no próprio repo (como fazem as referências) e um único script de hook com saída por host.

> ⚠️ **A verificar** na documentação atual de cada host antes de virar decisão: formatos de manifesto, eventos de hook disponíveis e a substituição Gemini CLI → `agy`.

### 4.3 Comandos

Os comandos se partem em dois regimes econômicos opostos, e tratá-los igual é o erro que encarece os plugins concorrentes.

**Geradores** — rodam raro, produzem arquivo, podem gastar:

- `/setup` — modo greenfield (perguntas + estrutura do zero) e modo existente (absorve o que seria `/organize`: detecta faltantes, migra `MEMORY.md`/`ERRORS.md`, propõe plano de organização). No modo existente, respeita a lista do que **nunca muda em silêncio**: URLs, rótulos de navegação, nomes de campos de formulário, marca.
- `/plan` — preenche [`templates/plan.md`](templates/plan.md). Roda **na mesma sessão** da conversa que o originou: o valor vem do contexto acumulado, e reconstruí-lo num subagente custaria em dobro. Instrução-base (o prompt que já funciona, mais três pedidos):
  > Crie um plano completo para esta implementação seguindo o template. Veja se é necessário dividir em fases; caso contrário, trate como uma única fase. Cada fase começa com uma explicação simples do que será desenvolvido, seguida do escopo detalhado (código, interface e testes), dos arquivos envolvidos, dos comandos que provam que funciona e do checklist de validação visual. Termine cada fase com a mensagem de commit no padrão `tipo: texto curto`. Registre o que fica fora do escopo e as restrições herdadas de `.dev/memory` e `.dev/errors`.
- `/identidade-visual` — perguntas + identidade. Segue o método do Refero: pesquisa → **reference lock** (direção primária, traços a preservar, o que rejeitar) → **decision ledger** (toda decisão aponta para uma fonte). Uma única autoridade de design: as referências de design se contradizem entre si (ver `referencias/`).
- `/stitch` — prompts do Stitch + `DESIGN.md` no formato semântico do `stitch-skill` (nome + hex + papel de cada cor) e os três dials (variância, motion, densidade).

**Auditores** — rodam sempre, precisam ser baratos:

- `/performance`
- `/security` — checklist derivado de fontes mantidas (OWASP da comunidade, Trail of Bits) em vez de escrito do zero.
- Checagens de design mecânicas (contagem de travessões, de eyebrows, contraste, cores fora dos tokens) viram script, não prosa.

Padrão obrigatório dos auditores: **script coleta evidência, modelo só julga.** `/security` roda `npm audit`, grep de segredos e o checklist de N pontos versionado no plugin, e entrega ~200 linhas ao modelo. Deixar o modelo ler o codebase custa de 10 a 50 vezes mais e acerta menos.

**Os comandos que sustentam o sistema:**

- `/wrap` — fim de sessão. Aplica o **critério de durabilidade**: *se esta entrada sumisse, alguém lendo o código final repetiria o erro ou refaria uma investigação grande?* Se não, não escreve nada — é um resultado válido, não uma falha. Narrativa de sessão e "o que foi mudado" nunca passam (o git já registra). Divisão de trabalho: o **modelo da sessão**, com o contexto em cache, decide e redige no máximo uma entrada curta (julgamento); um **script** valida frontmatter, orçamento de tamanho, detecta duplicata por slug e tags e regenera os índices (mecânica).
- `/recall <tema>` — carga dirigida: grep no frontmatter (`tags`, `module`, `applies_when`, título), leitura dos primeiros ~30 linhas dos candidatos, leitura completa só dos relevantes, no máximo 5.
- `/refresh [escopo]` *(novo)* — manutenção contra o apodrecimento, adaptado do `ce-compound-refresh`. Cada entrada recebe um de cinco desfechos: **Keep, Update, Consolidate, Replace, Delete**. Não existe `_archived/`: o git é o arquivo. Idade sozinha não é obsolescência; afirmação não verificável não é falsa. Delete automático só quando a implementação sumiu, o problema sumiu e nenhuma entrada depende dela.

### 4.4 Regras de escrita das skills e do CLAUDE.md

Medidas pelas referências e aplicáveis a todo texto que o plugin coloca em contexto:

- **Corpo de skill ≤ ~8 KB, com o essencial no topo.** Truncamentos conhecidos preservam o começo: o Codex corta em 8.000 bytes; segundo o compound, o Claude Code reanexa após compactação só os primeiros ~5k tokens de cada skill (teto combinado ~25k).
- **Leitura obrigatória nomeada no ponto de uso**, não mencionada de passagem no início. O compound mediu que o Claude tende a ler todas as referências de uma skill logo no carregamento — a economia de "carregar sob demanda" precisa ser medida, não presumida.
- **Receita positiva para composição; proibição só para ação discreta.** "Não reescreva o spec" saiu pela culatra nos testes do superpowers; "sua mensagem deve conter (1)…(5)" funcionou. Listas de "red flags" e tripwires funcionam.
- **Ênfase em uma linha, não em várias.** "IMPORTANT" em tudo não destaca nada (guia oficial); "se houver 1% de chance você ABSOLUTAMENTE DEVE" empurrou tarefa trivial para cerimônia completa em 5/5 (eval do superpowers).
- **Se é validável por regex ou script, vira script.** Documentação fica para julgamento.

---

## 5. Mapa de economia de tokens

Em ordem de impacto, para o caso medido na seção 1:

1. **Índice + entradas curtas no lugar do monólito.** 10–25x na abertura de sessão. Sozinho justifica o plugin. Com o critério de durabilidade, o volume também cresce mais devagar.
2. **Hook `SessionStart` injetando o estado.** Branch, `git log -5`, `diff --stat`, fase ativa. Injetado direto na sessão (como faz o superpowers), com matcher `startup|clear|compact` para **reinjetar após compactação**. Geração custa zero tokens, leitura ~300, zero tool calls, e elimina cinco chamadas de reorientação.
3. **Tudo determinístico vira hook, não instrução.** "Rode o build ao final" é um hook `Stop` rodando o `verify` da fase — com a ressalva de que o Claude Code encerra o turno após 8 bloqueios consecutivos. Commit com trailer é `prepare-commit-msg`.
4. **Respeitar o cache de prompt.** O prefixo (system + `CLAUDE.md`) só é barato enquanto não muda; reescrevê-lo no meio da sessão invalida o cache inteiro. Daí a regra: **arquivo auto-carregado é imutável durante a sessão**; escrita vai para `.local/` e `memory/`, lidos sob demanda.
5. **Disciplina de subagente.** Só compensa quando o input é grande e o output é pequeno (varredura → conclusão). Regra prática: só spawna se a leitura esperada passa de ~20k tokens e a resposta cabe em 1k. Ao delegar, **passe caminhos, não conteúdo**. É o oposto dos plugins de quinze subagentes — o superpowers mede ~US$13 por execução com um subagente por tarefa.
6. **Contexto escopado por fase.** Garantido pelo campo `files:` e pela extração do bloco da fase ativa.
7. **Orçamento de tamanho versionado.** `index.md` ≤ 200 linhas, entrada ≤ 40 linhas, `CLAUDE.md` ≤ 150 linhas, corpo de skill ≤ 8 KB; o script do `/wrap` e o `betterdev lint` falham se estourar. Sem isso, o sistema regride ao estado atual em três meses.
8. **Roteamento de modelo: barateie mecânica, nunca julgamento.** Regenerar índice, validar formato e montar changelog vão para script ou modelo barato. Decidir o que vira memória, calibrar severidade e revisar ficam no modelo da sessão. Evidência: no superpowers, revisores baratos sinalizaram corretamente 0 de 10 defeitos plantados e defenderam os defeitos. Níveis nomeados semanticamente (extração / geração / teto), sem nome de modelo fixo no texto.
9. **Medição.** Hook que loga tokens por arquivo lido e resultados do `verify`. Sem número, a otimização é no escuro — e é essa métrica que alimenta a view de atividade dos agentes, se ela existir. Medir também **qualidade**, não só tokens: modelos fortes mascaram mudanças de prompt, e economizar tokens piorando o resultado passa despercebido.

---

## 6. Projeto 2 — Visualizador

### 6.1 O que ele é

Não é um Trello para desenvolvimento. **O board é uma projeção do estado do repositório.** Planos, memória, erros e git já são o banco de dados — hoje ilegíveis porque estão em arquivos de 185 KB. A plataforma é a camada de leitura humana da mesma estrutura que o plugin escreve.

Consequência de projeto: a UI define o formato. Cada seção fixa do plano (§3.2) existe porque tem um componente correspondente. Os dois projetos são um só contrato.

### 6.2 Arquitetura

```
betterdev watch  →  fs.watch em .dev/ + git log  →  parse  →  SQLite local (gitignored)
                                                                     ↓
                                                             UI web em localhost
                                                                     ↓
                                                   ação do usuário → escreve .md → git
```

O SQLite é **cache puro, 100% reconstruível dos arquivos e do git** (`betterdev reindex`), incluindo o status derivado das fases.

Isso elimina o risco clássico do modelo híbrido: não existe reconciliação, porque o banco nunca é fonte de nada. A IA edita o arquivo direto e o board acompanha — que é exatamente o comportamento necessário.

Multiusuário acontece pelo git: cada dev roda a sua instância local apontando para o clone, e o compartilhamento é o próprio repositório. Sem auth, sem infra, sem código saindo da máquina. A fase *ativa* é local de cada dev; *concluída* e *bloqueada* são globais, porque vêm do git.

### 6.3 As três views

**Planos como fluxo.** Montada a partir das seções fixas do plano:

| Parte do `.md` | Componente |
|---|---|
| `phases` + `needs` | Grafo: nós e arestas; cadeia linear quando não há `needs` |
| Status derivado (§3.3) | Cor do nó |
| Contexto | Cabeçalho do plano |
| Fora do escopo | Faixa fixa, visível em todas as fases |
| Restrições herdadas | Links que abrem a view de memória/erros |
| Objetivo | Resumo no card do nó |
| Escopo › Código / Interface / Testes | Abas do painel da fase |
| `files` | Lista de arquivos; após o commit, cada um abre seu diff |
| `verify` | Comandos com o último resultado registrado pelo hook `Stop` |
| Validação visual | Checklist de instruções |
| `commit_msg` / trailer | Mensagem sugerida; após o commit, link para o commit real |

É a view que precisa estar visualmente impecável — é ela que vende o produto.

**Memória e erros navegáveis.** Busca e filtro por `track`, `type`, `module` e `tags` sobre o frontmatter. A menos vistosa e a que resolve a dor comprovada de hoje. Inclui o relatório do `/refresh` (entradas marcadas como obsoletas).

**Mapa do projeto.** A única com risco real de virar diagrama bonito e mentiroso. Blindagem: **nós e arestas saem do código** (grafo de imports/dependências, determinístico); a IA escreve apenas o rótulo de intenção de cada módulo. A topologia nunca é inventada pelo modelo.

### 6.4 Concorrência

Mapeada a partir da awesome-list (detalhes em `referencias/concorrentes.md`): **feature-track** cobre boa parte da metade "memória no repo"; **plannotator** revisa planos no navegador, mas sem grafo nem status; **plasma-ai/wiki** gera índices de markdown de forma determinística. O que ninguém faz junto: plano como grafo com status derivado do git + memória com critério de durabilidade + hooks.

---

## 7. Ordem de construção

1. **Formato de plano + template + `betterdev lint` + `/plan`.** É o contrato entre os dois projetos; tudo depende dele. Validar o template reescrevendo 2–3 planos reais já existentes.
2. **Migração do MDT** *(o `atlas` está pausado)*. Quebrar `MEMORY.md`/`ERRORS.md` em entradas com frontmatter, aplicando o critério de durabilidade (espera-se descartar boa parte), e gerar os índices por script. **Medir o antes/depois** com `betterdev stats`, que lê os históricos de sessão já gravados pelo Claude Code (19 sessões do MDT como linha de base). Critérios combinados em 22/09/2026: tokens na abertura ≥ 10× menores (~38k → ≤ 4k), menos tool calls até a primeira edição útil, compactações iguais ou menores, e nenhum erro já registrado se repetindo. A migração do MDT para pywebview é o uso real que alimenta a comparação. Se o número não aparecer aqui, a tese está errada — e é melhor descobrir agora.
3. **Hooks + `/wrap`.** `SessionStart` (com reinjeção após compactação), `Stop` rodando `verify`, `prepare-commit-msg` com trailer. Fecha o ciclo: o sistema passa a se manter sozinho.
4. **`betterdev watch` + view de fluxo.** Só depois de existirem planos reais, com commits reais, para renderizar.
5. **`/refresh`.** Quando o corpus migrado tiver algumas semanas de uso.

O passo 2 é o teste da hipótese inteira e pode ser feito imediatamente.

---

## 8. Questões em aberto

**Resolvidas na revisão 1:**

- ~~Vocabulário de tags~~ → enum fechado para `type` + regra "reusar o valor do corpus" para campos abertos, validado por script (§4.1).
- ~~Política de arquivamento~~ → não há arquivamento: `/refresh` com cinco desfechos; o git é o arquivo (§4.3).
- ~~Formato de instrução por host~~ → parcialmente: manifestos nativos em vez de gerador (§4.2); falta verificar na documentação atual.

**Abertas:**

- Confirmar na documentação de cada host: formato de manifesto, eventos de hook e a substituição Gemini CLI → `agy`.
- Decidir se a view de atividade dos agentes (custo por sessão, arquivos tocados) entra na v1 ou espera a métrica do item 9 da seção 5.
- Medir se o carregamento sob demanda de fato economiza no Claude, dado que ele tende a ler referências antecipadamente (§4.4).
- Títulos do template em português: fixar o idioma ou aceitar sinônimos no parser?
- Como tratar planos que mudam no meio da execução: fases novas recebem o próximo id livre e ids nunca são renumerados (regra do compound) — falta decidir como a UI mostra fases removidas.
- Coexistência com a memória nativa do Claude Code: orientar, detectar duplicata ou ignorar?

---

## 9. Referências

Análise completa das referências trazidas em `IDEAS.md` — o que cada uma oferece, o que vale trazer, o que não vale e por quê — em [`referencias/README.md`](referencias/README.md).
