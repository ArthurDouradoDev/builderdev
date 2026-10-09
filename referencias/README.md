# Referências

Análise das referências listadas em [`IDEAS.md`](../IDEAS.md), feita em 22/09/2026 para a revisão 1 do [`CONCEPCAO.md`](../CONCEPCAO.md).

## O que esta pasta é

São **notas destiladas**, não cópias. Cada arquivo diz o que a referência é, o que vale trazer para o BuilderDev (e para onde), o que não vale e por quê. Os originais somam centenas de KB; copiá-los para cá repetiria o problema que o BuilderDev existe para resolver.

Regras de uso:

- **Nada aqui é carregado automaticamente** em sessões de IA. Consulte o arquivo da referência quando for implementar a parte do BuilderDev que ela alimenta (coluna "Alimenta" abaixo).
- Os links apontam para o **commit exato que foi lido**. As referências mudam rápido; se for reaproveitar algo, confira a versão atual.
- Números marcados como *alegação da fonte* foram medidos pelos autores das referências e **não foram verificados** por nós.
- Todas as referências de código são MIT. Ao copiar trecho de código de alguma delas para o plugin, mantenha o aviso de copyright e a licença junto.

## Índice

| Arquivo | Referência | Em uma linha | Alimenta |
|---|---|---|---|
| [compound-engineering.md](compound-engineering.md) | EveryInc/compound-engineering-plugin | A mais próxima do Projeto 1: memória no repo, critério de durabilidade, manutenção contra apodrecimento | §4.1, `/wrap`, `/recall`, `/refresh`, §4.4 |
| [superpowers.md](superpowers.md) | obra/superpowers | Hook de sessão, extração da tarefa ativa por script, dados de custo por modelo | §3.4, §5 itens 2, 5 e 8, §4.4 |
| [claude-code-best-practices.md](claude-code-best-practices.md) | Guia oficial do Claude Code | Confirma a tese: contexto é o recurso escasso; hooks para o que não pode falhar | §1, §4.1, §5 |
| [karpathy.md](karpathy.md) | multica-ai/andrej-karpathy-skills | 4 regras de comportamento que cabem em ~15 linhas | Template do `CLAUDE.md`, campo `verify:` |
| [refero-design.md](refero-design.md) | referodesign/refero_skill | Método de design por evidência: reference lock e decision ledger + regras de ofício | `/identidade-visual`, auditor de design |
| [taste-skill.md](taste-skill.md) | Leonxlnx/taste-skill | Formato de `DESIGN.md` para o Stitch, dials, checagens mecânicas | `/stitch`, `/setup` modo existente |
| [concorrentes.md](concorrentes.md) | BehiSecc/awesome-claude-skills + 4 projetos | Mapa de quem já faz partes do BuilderDev | §6.4, `/security` |

## Versões lidas

| Referência | Commit | Data do commit |
|---|---|---|
| everyinc/compound-engineering-plugin | `4fbabcd32b` | 2026-09-22 |
| obra/superpowers | `5bf4e78011` | 2026-09-18 |
| referodesign/refero_skill | `a9b54a3e62` | 2026-09-05 |
| Leonxlnx/taste-skill | `a6153b39e4` | 2026-09-22 |
| multica-ai/andrej-karpathy-skills | `2c60614193` | 2026-04-20 |
| BehiSecc/awesome-claude-skills | `c368a0ae3c` | 2026-09-21 |
| code.claude.com/docs/en/best-practices | — | lido em 2026-09-22 |

## Conclusões transversais

Os pontos em que referências independentes chegaram à mesma conclusão pesam mais que qualquer recomendação isolada:

1. **O artefato deve escalar com a tarefa.** O compound (resposta direta / resumo no chat / plano completo), o superpowers (spike / bounded / architectural) e o guia oficial ("se dá para descrever o diff em uma frase, pule o plano") convergem. O prompt de planejamento atual já faz isso ("veja se é necessário dividir em fases").
2. **Estado de execução não mora no plano.** O compound proíbe campo `status`; o superpowers usa um registro separado, fora do git. Ambos derivam o progresso de commits.
3. **O que é mecânico vira script.** O superpowers ("se dá para validar com regex, automatize") e o guia oficial ("hooks são determinísticos, CLAUDE.md é consultivo") concordam com o item 3 da §5.
4. **Julgamento não vai para modelo barato.** O superpowers mediu; o compound codifica em níveis de modelo nomeados.
5. **Texto residente precisa ser curto e ter o essencial no topo.** Todas as fontes, com medições diferentes.

## Onde as referências se contradizem

As duas referências de design discordam em pontos concretos (Inter, Lucide, animações em loop). Gosto é opinião: o BuilderDev adota **uma** autoridade para design, o método do Refero, e usa do taste-skill só o formato de `DESIGN.md` e as checagens mecânicas. Detalhes em [taste-skill.md](taste-skill.md).
