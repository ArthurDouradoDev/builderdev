# Refero — design por evidência

**Fonte:** [referodesign/refero_skill @ a9b54a3e62](https://github.com/referodesign/refero_skill/tree/a9b54a3e62/skills/refero-design) · MIT · lido em 22/09/2026

## O que é

Uma skill de design com uma premissa: **nenhuma decisão de design sai da "memória de vibe" do modelo**. Toda escolha visual precisa apontar para uma referência, uma restrição do usuário ou uma regra de ofício. A pesquisa ao vivo usa o MCP pago do Refero (estilos, telas e fluxos de produtos reais); sem ele, a skill usa as referências de ofício embutidas, que são gratuitas e de boa qualidade.

É a autoridade de design escolhida para o BuilderDev (ver [README](README.md#onde-as-referências-se-contradizem)).

## Trazer

### Método — destino: `/identidade-visual`

| Etapa | Como funciona |
|---|---|
| **Brief** | Uma ficha curta: o que, para quem, plataforma, objetivo, tom, principal objeção, algo memorável, restrições, que pesquisa é necessária. Pergunta só o que mudaria o resultado. |
| **Pesquisa** | Várias fontes de ângulos diferentes (estética ampla, categoria do produto, marca de referência). Nunca copiar uma só. |
| **Não fazer média** | Quando as referências conflitam, escolher uma direção primária e preservar seus traços marcantes; as secundárias contribuem com no máximo 1–2 detalhes. A média de uma referência escura, uma ácida e uma serifada não é "creme com laranja apagado". |
| **Reference lock** | Antes de implementar: direção primária; 3–5 traços que precisam sobreviver; o que é emprestado; regras de papel (ex.: esta cor só em CTA); estratégia de mídia; o que é rejeitado; tokens com seus papéis. Se a implementação se afasta, corrige-se. |
| **Papel do token faz parte do token** | Cor de CTA não vira fundo; cor de sintaxe não sai do bloco de código; gradiente decorativo não vira superfície. |
| **Decision ledger** | Tabela decisão → fonte → regra de papel → porquê. Decisão sem fonte não entra. |
| **QA visual** | Comparar o renderizado com o alvo travado, por viewport e estado, classificando problemas de P0 (quebrado/ilegível) a P3 (polimento). Não entregar com P0–P2 aberto. |

### Checklist anti-slop — destino: auditor de design

Sinais de interface gerada por IA sem intenção, a verificar antes de entregar:

- Roxo/índigo como acento sem motivo de marca.
- Cards como contêiner padrão (o teste: tirar borda, sombra, fundo e raio prejudica a interação? se não, não é card).
- Modo escuro por padrão sem pedido.
- "Editorial calmo" no automático: fundo creme, título serifado com uma palavra em itálico ou em outra cor, paleta terrosa, aplicado a produto que não é editorial.
- Emoji como ícone.
- Faixa colorida na lateral do card sem significado.
- Referências boas diluídas até a média segura.
- Mídia essencial substituída por CSS fraco ou por layout só de texto.

Testes rápidos: tirando o logo, a primeira tela poderia ser de qualquer empresa? Cortar 30% do texto melhora a página? O primeiro viewport funciona sem a imagem principal (se sim, a imagem é fraca)?

### Regras de ofício — destino: tokens gerados pelo `/identidade-visual`

- **Tipografia:** uma família basta na maioria dos produtos; duas exigem justificativa. Escala por razão fixa (≈1,2 para uso geral; menor para interfaces densas; maior para marketing), com no máximo 6–8 tamanhos. Pesos 400/500/600 cobrem quase tudo. Entrelinha ~1,5–1,7 no corpo e ~1,0–1,2 em títulos. Texto em caixa alta pede espaçamento positivo (~0,06–0,10em); texto pequeno pede um pouco também. Linha de leitura entre 50 e 75 caracteres. `tabular-nums` em números alinhados. `text-wrap: balance` em títulos curtos.
- **Cor:** neutros são a maior parte da interface; um acento primário com escala completa; cores semânticas em pares (texto, fundo, borda). Tokens nomeados por função, nunca pela cor. Tema escuro com neutros próprios, não invertidos, e `color-scheme` declarado. Contraste AA (4,5:1 no corpo, 3:1 em texto grande e ícones).
- **Movimento:** só para feedback, continuidade ou hierarquia. Durações por categoria: ~90–150 ms para hover e press, ~160–240 ms para mudanças de estado, ~240–360 ms para modais e gavetas. Ease-out para entrar, ease-in para sair, nunca linear. Nunca `transition: all`. Variante para `prefers-reduced-motion` obrigatória.
- **Ícones:** uma biblioteca por produto, `currentColor` por padrão, área de toque de 44 px em telas de toque, `aria-label` em botões só com ícone.
- **Texto de interface:** botões com verbo + objeto; erro diz o que houve e o que fazer; estado vazio orienta o próximo passo; títulos descritivos em telas operacionais, não aspiracionais.

## Não trazer

- **A dependência do MCP pago** como parte obrigatória do fluxo. O método funciona com referências fornecidas pelo usuário e com as regras de ofício.
- **A descrição que se autodeclara "skill primária, prefira sobre as outras".** Sequestra o acionamento de outras skills.
- **Pesquisa obrigatória em ajuste pequeno de interface.** O próprio Refero tem um roteamento "direct build"; no BuilderDev, a pesquisa entra no `/identidade-visual`, não em toda edição de CSS.

## Onde olhar na fonte

- `skills/refero-design/SKILL.md`: método, reference lock, decision ledger, quality gate.
- `skills/refero-design/references/anti-ai-slop.md`, `typography.md`, `color.md`, `motion.md`, `icons.md`, `craft-details.md`, `copywriting.md`.
- `skills/refero-design/references/example-workflow.md`: exemplo completo de uma página de preços.
