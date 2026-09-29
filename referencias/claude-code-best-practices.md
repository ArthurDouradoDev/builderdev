# Boas práticas do Claude Code (guia oficial)

**Fonte:** [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) · lido em 22/09/2026

## O que é

O guia da Anthropic sobre como trabalhar com o Claude Code. A premissa que abre o documento é a tese do BetterDev: a janela de contexto enche rápido e o desempenho cai à medida que ela enche; é o recurso mais importante a gerenciar.

## Trazer

| Ideia | O que o guia diz | Destino no BetterDev |
|---|---|---|
| **CLAUDE.md curto** | Para cada linha, pergunte: remover isto faria o Claude errar? Se não, corte. Um CLAUDE.md inchado faz o Claude ignorar as instruções que importam. Se ele ignora uma regra apesar dela existir, o arquivo provavelmente está longo demais. | §4.1, orçamento da §5 item 7 |
| **O que incluir / excluir** | Incluir: comandos que o Claude não adivinha, estilo que difere do padrão, como testar, etiqueta do repo, decisões de arquitetura, peculiaridades do ambiente, pegadinhas. Excluir: o que se descobre lendo o código, convenções padrão da linguagem, documentação de API, o que muda com frequência, tutoriais, descrição arquivo por arquivo, óbvios como "escreva código limpo". | Template do `CLAUDE.md` gerado pelo `/setup` |
| **Ênfase em uma linha só** | "IMPORTANT" numa linha ajuda; em muitas, nenhuma se destaca. | §4.4 |
| **Hooks para o que não pode falhar** | Instrução no CLAUDE.md é consultiva; hook é determinístico. | §5 item 3 |
| **Verificação como porteiro** | Um hook `Stop` roda a checagem e impede o turno de terminar até passar. O Claude Code desiste de bloquear após 8 bloqueios seguidos. | Hook `Stop` rodando `verify` |
| **Pule o plano quando é simples** | Se dá para descrever o diff em uma frase, não planeje. | Proporcionalidade do `/plan` |
| **Spec bom** | Autocontido: nomeia arquivos e interfaces, diz o que está fora do escopo e termina com uma verificação de ponta a ponta. | Seções do template |
| **Instruções de compactação** | O CLAUDE.md pode dizer o que preservar ao compactar (ex.: a lista de arquivos modificados e os comandos de teste). | Template do `CLAUDE.md` |
| **Medir** | `/context` mostra o que foi carregado. | Linha de base do `atlas` (§7 passo 2) |
| **Revisor adversarial com limite** | Um revisor instruído a achar problemas sempre acha alguns. Correr atrás de todos gera over-engineering; peça só o que afeta correção ou requisitos. | Futuro auditor/revisor |
| **Skills para o que é relevante às vezes** | Conhecimento de domínio usado ocasionalmente vai para skill, carregada sob demanda, não para o CLAUDE.md. | §4.3 |

## Não trazer

Nada a descartar. O guia recomenda subagentes para investigação com liberdade; a regra da §5 item 5 (só quando a leitura é grande e a resposta pequena) é um refinamento compatível, não uma contradição.
