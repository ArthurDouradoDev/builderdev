# Diretrizes "Karpathy"

**Fonte:** [multica-ai/andrej-karpathy-skills @ 2c60614193](https://github.com/multica-ai/andrej-karpathy-skills/blob/2c60614193/CLAUDE.md) · MIT · lido em 22/09/2026

## O que é

Um CLAUDE.md de 2,4 KB (~600 tokens) com quatro princípios contra erros comuns de LLMs escrevendo código. Não é do Karpathy: é uma destilação feita por terceiros a partir de um post dele sobre essas falhas.

## Trazer

| Princípio | Resumo | Destino no BetterDev |
|---|---|---|
| **Pense antes de codar** | Declarar suposições; se há interpretações diferentes, apresentá-las em vez de escolher em silêncio; parar e perguntar quando algo está confuso. | Template do `CLAUDE.md` (1–2 linhas) |
| **Simplicidade primeiro** | Só o que foi pedido; nenhuma abstração para uso único; nenhuma configurabilidade não solicitada; nenhum tratamento de erro para cenário impossível. | Template do `CLAUDE.md` |
| **Mudanças cirúrgicas** | Não "melhorar" código vizinho; seguir o estilo existente; remover só o que a *própria* mudança deixou órfão. Teste: toda linha alterada deve rastrear até o pedido. | Template do `CLAUDE.md` — é a melhor regra contra diff inchado |
| **Execução guiada por objetivo** | Transformar tarefas em critérios verificáveis ("corrija o bug" → "escreva um teste que reproduz, depois faça passar"); em tarefas de vários passos, cada passo tem sua checagem: `passo → verify: checagem`. | Campo `verify:` de cada fase no template do plano |

## Não trazer

- **O `EXAMPLES.md`** (15 KB de exemplos de código certo/errado). Ilustra bem, mas no contexto é custo sem efeito proporcional.
- **Linhas que o modelo já cumpre.** Parte de "pense antes de codar" já é o comportamento padrão dos modelos atuais. Pelo critério do guia oficial, só entram as linhas cuja remoção muda o comportamento; isso se verifica na migração do `atlas`.
