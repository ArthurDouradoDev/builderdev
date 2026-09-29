# Compound Engineering

**Fonte:** [EveryInc/compound-engineering-plugin @ 4fbabcd32b](https://github.com/EveryInc/compound-engineering-plugin/tree/4fbabcd32b) · MIT · lido em 22/09/2026

## O que é

Plugin com 36 skills, suportando 14 hosts, construído em torno de um ciclo: brainstorm → plano → execução → simplificação → revisão → **"compound"** (registrar o aprendizado onde a próxima execução vai encontrá-lo). A estratégia deles chama a camada de memória de *knowledge substrate*: é exatamente o Projeto 1 do BetterDev. É a referência mais próxima, e também o exemplo do "plugin caro" que o BetterDev quer superar.

## Trazer

| Ideia | Como funciona | Destino no BetterDev |
|---|---|---|
| **Critério de durabilidade** | Uma entrada só entra na memória se guardar raciocínio que não é recuperável do código, dos testes, dos comentários ou de outra doc. Teste contrafactual: se ela sumisse, alguém lendo a implementação final repetiria o erro ou refaria uma investigação grande? Esforço, tamanho do diff e "a tarefa terminou" não contam. Se não passa, não escreve nada. | `/wrap` (§4.3) |
| **Uma entrada por execução** | Uma sessão que produziu vários aprendizados gera várias execuções, nunca um lote. | `/wrap` |
| **Duas trilhas no frontmatter** | Trilha de *bug* (exige sintomas, causa raiz, tipo de correção) e trilha de *conhecimento* (convenções, decisões, padrões; campos extras opcionais). `problem_type` é um enum fechado; campos abertos como `component` seguem a regra "reusar o valor que o corpus já usa, na grafia mais usada". | `memory/` e `errors/` (§4.1) |
| **Datas no frontmatter, não no nome** | O nome do arquivo é um slug descritivo; a data de criação fica no frontmatter. | §4.1 |
| **Busca por frontmatter** | Em vez de ler a memória, o pesquisador extrai palavras-chave da tarefa, faz grep paralelo em campos (`title:`, `tags:`, `module:`, itens de `applies_when`), lê só as primeiras ~30 linhas dos candidatos e o arquivo completo só dos relevantes. Devolve no máximo 5 achados e sinaliza quando um aprendizado contradiz o código atual. | `/recall` (§4.3) |
| **Manutenção com cinco desfechos** | `ce-compound-refresh` classifica cada entrada como Keep, Update, Consolidate, Replace ou Delete. Não existe pasta de arquivados: o git é o arquivo. Idade não é obsolescência. Afirmação que o repo não confirma não é falsa. Delete automático só se a implementação sumiu, o problema de domínio sumiu e nada depende da entrada. | `/refresh` (§4.3) |
| **Linha de descoberta informativa** | O CLAUDE.md deve *descrever* que a memória existe e quando é relevante, não *mandar* consultá-la. Eles observaram que a forma imperativa ("sempre busque antes de implementar") causa leituras redundantes. | §4.1 |
| **Plano sem status** | O plano é um artefato de decisão. Progresso vive nos commits. Unidades de trabalho têm ids estáveis (`U1`, `U2`…) que nunca são renumerados: unidade nova recebe o próximo id livre, e lacunas são normais. | §3 |
| **Proporcionalidade do plano** | Antes de pesquisar, o `/ce-plan` escolhe o tamanho da saída: resposta direta, resumo no chat, ou plano completo. Na dúvida, o mais pesado. | `/plan`, template |
| **Corpo de skill pequeno** | Todas as skills ficam em ~8 KB: o essencial fica no corpo e cada fase lê seu arquivo de referência no momento de agir. | §4.4 |
| **Níveis de modelo semânticos** | Extração (o mais barato capaz), geração (intermediário) e teto (o modelo da sessão). O texto da skill cita o nível, nunca o nome do modelo. | §5 item 8 |
| **Passe caminhos, não conteúdo** | O orquestrador acha os caminhos (barato) e o subagente lê só o que precisa. Passar o conteúdo infla todo prompt e tira do subagente o julgamento sobre relevância. | §5 item 5 |
| **Escrita só no orquestrador** | Subagentes escrevem em área temporária; só o orquestrador escreve nos arquivos do projeto. | Regra geral de subagentes |

## Não trazer

- **A escala.** 36 skills, 14 hosts, painéis de revisores com várias personas, execução cross-model com um runner Python de ~104 KB. É a complexidade que o BetterDev se propõe a evitar.
- **Referências gigantes.** O `/ce-plan` tem arquivos de referência de 30–44 KB. A economia do corpo pequeno se perde se o modelo lê tudo de uma vez (ver medições).
- **Imposição só por prosa.** O plugin não tem nenhum hook (só fixtures de teste). O diferencial do BetterDev é justamente o contrário.
- **O vocabulário do `CONCEPTS.md` inteiro.** É um glossário denso ("outcome spine", "proxy rule", "case accretion"…). Útil para entender o raciocínio deles, ruim para importar.

## Medições citadas (alegações da fonte)

- O Codex trunca o corpo de uma skill em 8.000 bytes. O Claude Code, após compactação, reanexa só os primeiros ~5.000 tokens de cada skill invocada, dentro de um teto combinado de ~25.000; skills mais antigas saem inteiras. Todo truncamento conhecido preserva o **começo** do arquivo.
- Em testes com rastreamento de leituras, o Claude leu todas as referências de uma skill logo no carregamento (18 leituras de 15 arquivos antes de escrever o plano), enquanto Codex e Grok leram cada referência na fase correspondente. Consequência: no Claude, a economia do "carregar sob demanda" não é garantida.
- Uma skill de 90 KB reescrita para 8 KB manteve o comportamento nos três hosts testados.
- A forma de escrever uma instrução de busca mudou a quantidade de tool calls no Claude Code de 14 para 2 ("para cada arquivo, suba os diretórios" vs "ache todos, depois filtre").

## Conceitos que valem a leitura na fonte

- `CONCEPTS.md`: *Host prompt budget*, *Load stub*, *Phase-loaded kernel*, *Model tier*, *Evidence dossier*, *Output contract*, *Case accretion*.
- `skills/ce-compound/references/schema.yaml`: o schema completo das duas trilhas.
- `skills/ce-compound-refresh/references/classify.md`: as regras de cada desfecho.
- `skills/ce-plan/references/agents/learnings-researcher.md`: a estratégia de busca.
- `docs/solutions/skill-design/size-driven-skill-restructure.md` e `pass-paths-not-content-to-subagents.md`: as medições acima.
