# Taste Skill

**Fonte:** [Leonxlnx/taste-skill @ a6153b39e4](https://github.com/Leonxlnx/taste-skill/tree/a6153b39e4/skills) · MIT · lido em 22/09/2026

## O que é

Coleção de 13 skills de frontend "anti-slop": uma principal (v2, 88 KB), variantes de estética (minimalista, brutalista, "soft"), redesign, uma skill para o Google Stitch e skills só de geração de imagem (páginas, telas mobile, brand kits). O foco é landing pages e portfólios; a própria skill diz que não serve para dashboards e formulários de várias etapas.

## Trazer

| Ideia | Como funciona | Destino no BuilderDev |
|---|---|---|
| **Formato de `DESIGN.md` para o Stitch** | Documento em linguagem descritiva que o Stitch interpreta, com valores exatos entre parênteses. Seções: (1) atmosfera visual, (2) paleta com **nome descritivo + hex + papel** de cada cor, (3) regras de tipografia, (4) componentes com estados, (5) layout, (6) movimento pretendido (o Stitch gera telas estáticas; esta seção orienta quem implementa), (7) padrões proibidos. | `/stitch` |
| **Três dials** | Variância de layout, intensidade de movimento e densidade visual, de 1 a 10, inferidos do brief e declarados. Na skill do Stitch há um quarto: criatividade. | Registrados no `DESIGN.md` |
| **"Design read" de uma linha** | Antes de gerar: "estou lendo isto como <tipo de página> para <público>, com linguagem <tom>, puxando para <sistema ou estética>". Uma pergunta só, e apenas se a leitura for genuinamente ambígua. | Abertura do `/identidade-visual` |
| **Sistema real quando existe** | Se o brief é Material, Fluent, Carbon, GOV.UK etc., usar o pacote oficial, não recriar o CSS à mão; um sistema por projeto. | `/identidade-visual` |
| **O que nunca muda em silêncio** | No redesign: estrutura de URLs, rótulos de navegação, nomes e ordem de campos de formulário (quebram analytics e preenchimento automático), logo e marca, textos legais e de consentimento. | `/setup` no modo existente |
| **Redesign por alavancas** | Classificar o modo (novo / preservar / reformular); auditar antes de mexer; aplicar em ordem de menor risco: tipografia → espaçamento → cor → movimento → recomposição de seções → troca de blocos. | `/setup` no modo existente |
| **Checagens mecânicas do pre-flight** | Várias regras são contáveis por script: travessões na página, número de "eyebrows" (rótulos em caixa alta acima de títulos) versus número de seções, CTAs com a mesma intenção e rótulos diferentes, `h-screen` em vez de `min-h-[100dvh]`, `window.addEventListener('scroll')`, contraste de botões. | Auditor de design em script ("script coleta, modelo julga") |
| **Estados completos** | Carregando (skeleton no formato do layout), vazio (orienta o próximo passo), erro (inline, com ação de recuperação). | Checklist do auditor de design |

## Não trazer

- **O SKILL.md principal (88 KB, ~22k tokens).** É exatamente o problema que o BuilderDev combate.
- **As proibições que contradizem o Refero.** O taste proíbe Inter como padrão; o Refero o recomenda como preset seguro. O taste desaconselha Lucide; o Refero o recomenda para SaaS. O `stitch-skill` pede micro-animação em loop em todo componente ativo; o Refero e a própria v2 do taste tratam loops infinitos como distração. Gosto é opinião: vale uma autoridade só, e a escolhida é o método do Refero.
- **Listas de proibição que crescem a cada rodada de teste.** A v2 acumula dezenas de "banned" específicos (eyebrows numerados, faixas de cidade e clima, créditos de foto decorativos…). Cada item é razoável, mas a lista sem uma regra que decida quais entram não converge. O compound chama isso de *case accretion*.
- **A pasta `research/`.** Apresenta como fatos afirmações sem fonte verificável ("gorjeta de US$200 dá +45%", "o modelo fica preguiçoso em dezembro", taxas de acionamento de skills de 68% e 90%). Não citar.
- **As skills só de imagem** (`imagegen-*`, `brandkit`, `image-to-code`). Fora do escopo do plugin.
- **Os presets de estética** (soft, minimalist, brutalist). Paletas e fontes fixas contrariam o método por evidência.

## Onde olhar na fonte

- `skills/stitch-skill/SKILL.md` e `skills/stitch-skill/DESIGN.md`: formato e exemplo completo do `DESIGN.md`.
- `skills/taste-skill/SKILL.md`, seções 0, 1, 2, 11 e 14: brief, dials, mapa de sistemas, redesign e pre-flight.
- `skills/redesign-skill/SKILL.md`: auditoria de redesign por categoria.
