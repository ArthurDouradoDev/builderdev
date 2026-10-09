# Superpowers

**Fonte:** [obra/superpowers @ 5bf4e78011](https://github.com/obra/superpowers/tree/5bf4e78011) · MIT · lido em 22/09/2026

## O que é

Metodologia de desenvolvimento em forma de skills que disparam sozinhas: brainstorming → worktree → plano → execução (um subagente por tarefa, ou tudo na sessão) → TDD → revisão → finalização. Um hook de início de sessão injeta a skill de introdução. Suporta 16 hosts. O repositório inclui specs de experimentos de custo com números medidos, que são a parte mais valiosa para o BuilderDev.

## Trazer

| Ideia | Como funciona | Destino no BuilderDev |
|---|---|---|
| **Hook de início de sessão** | Script injeta contexto direto na sessão (sem arquivo para o modelo ler). O matcher é `startup\|clear\|compact`, então o contexto volta depois de uma compactação. O script detecta o host por variáveis de ambiente e emite o JSON no formato de cada um (Claude Code, Cursor, Copilot usam campos diferentes). | §5 item 2, §4.2 |
| **Extração da tarefa ativa** | Script de ~20 linhas (awk) recorta do plano só o bloco de uma tarefa, pelo título, ignorando títulos dentro de blocos de código, e grava num arquivo que o executor lê numa chamada. | §3.4 consumidor 1 |
| **Juntar chamadas em script** | `task-start` e `task-done` fazem em uma tool call o que seriam duas ou três, com a justificativa explícita: cada chamada é um turno que relê o contexto inteiro. `task-done` roda os testes e só registra a tarefa como concluída se passarem. | Scripts do `/plan` e dos hooks |
| **Registro fora do plano** | O progresso vive num arquivo por plano, fora do git, e nos commits. Depois de uma compactação, o executor confia no registro e no `git log`, não na própria memória. | §3.3 |
| **Evidência antes de afirmar** | Não declarar "funciona" sem ter rodado o comando que prova, nesta mensagem, e lido a saída. Tabela de afirmação → o que é necessário → o que não basta. | Template do `CLAUDE.md` |
| **Plano com restrições globais e interfaces** | Cabeçalho com restrições do projeto inteiro (versões mínimas, regras de nome) e, por tarefa, o que ela consome e produz de outras tarefas. Nos testes deles, isso reduziu retrabalho entre tarefas. | Candidato a seção do template |
| **Dimensionamento de tarefa** | A menor unidade que tem seu próprio ciclo de teste e merece uma revisão. Setup e configuração se juntam à tarefa que precisa deles. | Fase do template = essa unidade |
| **Doutrina de instrução** | Medido: proibição sobre como compor uma saída pode sair pela culatra (o modelo faz *mais* do que foi proibido); receita positiva ("sua mensagem deve conter (1)…(5)") funciona. Proibição de ação discreta, tripwires e tabelas de "red flags" funcionam. Empate vai para o texto mais curto. | §4.4 |
| **Automatize o mecânico** | "Se dá para validar com regex, automatize; documentação fica para julgamento." | §5 item 3 |
| **Teste de skill antes de escrever** | Rodar o cenário *sem* a skill, observar como o agente falha, e só então escrever a skill contra essas falhas. | Método para medir o `atlas` |

## Não trazer

- **O bootstrap agressivo** ("se houver 1% de chance, você ABSOLUTAMENTE DEVE usar a skill"). O próprio eval deles mostrou que regras absolutas empurraram tarefa pequena para a cerimônia completa em 5 de 5 casos.
- **A cadeia obrigatória para tudo** (brainstorm → worktree → spec → plano → subagentes). Eles mesmos estão introduzindo um roteador de três tamanhos.
- **Um subagente por tarefa como padrão.** Custa ~US$13 por execução no benchmark deles e contradiz a disciplina de subagentes da §5.
- **TDD estrito com "apague o código escrito antes do teste".** Depende do projeto; não é regra de plugin.
- **Telemetria** (logo carregado do site deles com a versão).

## Medições citadas (alegações da fonte)

Da spec de custo (`docs/superpowers/specs/2026-06-10-strict-cost-sdd-design.md`), num benchmark de ~US$13 por execução:

| Componente | Custo | Motivo |
|---|---|---|
| Orquestrador (modelo da sessão) | ~US$6–7 | ~150 turnos × contexto residente |
| Implementadores | ~US$5–6 | o trabalho em si |
| Revisores por tarefa | ~US$1–1,5 | |
| Revisão final + correções | ~US$1 | |

- **Orquestrador barato:** lidou bem com conflito explícito no plano (5/5 escalou), mas deixou passar defeito plantado em 4 de 5 execuções.
- **Revisores baratos (Haiku):** sinalizaram corretamente 0 de 10 defeitos plantados; nos que perderam, justificaram o defeito ("o plano pedia assim"). Conclusão deles: *barateie a mecânica, nunca o julgamento*.
- **Maior alavanca de custo:** a qualidade do plano (tarefas bem dimensionadas, restrições e interfaces explícitas), não o modelo do executor.
- O Codex relê o SKILL.md ~500 vezes numa sessão longa; o tamanho do texto é custo real.
- 60–78% das esperas curtas por subagente no Codex expiravam sem resultado; uma espera longa tem a mesma latência com ~1/90 das chamadas.

## Onde olhar na fonte

- `hooks/hooks.json`, `hooks/session-start`: o hook.
- `skills/subagent-driven-development/scripts/task-brief`, `skills/executing-plans/scripts/task-start` e `task-done`: os scripts.
- `skills/writing-plans/SKILL.md`: cabeçalho de plano, dimensionamento, autorrevisão.
- `skills/verification-before-completion/SKILL.md`.
- `docs/superpowers/specs/2026-06-10-strict-cost-sdd-design.md`, `2026-06-10-positive-instruction-redesign-design.md`, `2026-07-30-codex-efficiency-fixes-design.md`: as medições.
