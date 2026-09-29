# Concorrentes e fontes úteis

**Fonte do mapa:** [BehiSecc/awesome-claude-skills @ c368a0ae3c](https://github.com/BehiSecc/awesome-claude-skills/tree/c368a0ae3c) · lido em 22/09/2026

## Sobre a lista

Catálogo com ~220 skills em 14 categorias, com patrocinadores no topo. Não traz conteúdo para reaproveitar diretamente; o valor está em mostrar quem já faz partes do BetterDev. Os quatro projetos mais próximos da tese foram lidos pelo README.

## Concorrentes diretos

| Projeto | O que faz | Sobreposição com o BetterDev | Diferença |
|---|---|---|---|
| [feature-track](https://github.com/JunsW/feature-track) | "Memória compartilhada nativa do repo" por feature: `docs/features/README.md` como índice global e um arquivo por feature com status atual, fonte da verdade, decisões, riscos e mudanças recentes. | Quase toda a metade "memória no repo", inclusive o índice lido no início da sessão. | Índice mantido pelo agente (à mão), sem critério de durabilidade, sem hooks, sem visualização. O status fica escrito no arquivo. |
| [plasma-ai/wiki](https://github.com/plasma-ai/wiki) | Base de conhecimento em markdown com `_index.md` em cada nível, **gerados por um CLI determinístico**, que também resolve automaticamente o merge da parte gerada quando duas edições colidem. Busca e lint pelo CLI. | Índice da memória. | Não tem planos nem fluxo de desenvolvimento. É a prova de que o índice gerado (§4.1) é viável e resolve o conflito de merge. |
| [plannotator](https://github.com/backnotprop/plannotator) | Interface local no navegador para anotar planos, specs e diffs e mandar o feedback de volta ao agente, via hooks. Suporta 9 hosts. | A view de planos do visualizador. | Revisão de texto e diff, não plano como grafo nem status derivado do git. Mostra que a interface local conectada por hooks funciona na prática. |
| [agnix](https://github.com/avifenesh/agnix) | Linter para configurações de agentes (CLAUDE.md, SKILL.md, hooks, MCP) com centenas de regras e correção automática. | O `betterdev lint` e o orçamento de tamanho. | Candidato a dependência ou inspiração para as regras de tamanho e formato, em vez de reescrever. |

## Fontes para os auditores

| Projeto | Uso |
|---|---|
| [owasp-security](https://github.com/agamm/claude-code-owasp) | Checklists OWASP Top 10:2025 e ASVS 5.0 por linguagem: base do checklist versionado do `/security`. |
| [Trail of Bits Security Skills](https://github.com/trailofbits/skills) | Análise estática com CodeQL e Semgrep: candidatos à etapa "script coleta evidência" do `/security`. |
| [VibeSec-Skill](https://github.com/BehiSecc/VibeSec-Skill) | Checklist de segurança para aplicações web geradas com IA. |

## Para a view de atividade (se entrar na v1)

| Projeto | Uso |
|---|---|
| [agenttrace-session-audit](https://github.com/luoyuctl/agenttrace/tree/master/skills/agenttrace-session-audit) | Auditoria de sessões por custo, falhas, latência e diffs. |
| [vibe-replay](https://github.com/tuo-lei/vibe-replay) | Sessões transformadas em replays HTML navegáveis. |

Todos os links acima apontam para a versão atual de cada projeto e não foram fixados em commit.
