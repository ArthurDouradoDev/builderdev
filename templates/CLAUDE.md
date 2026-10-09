# <Nome do projeto>

<Uma ou duas linhas: o que o projeto faz e a stack principal.>

## Comandos

<!-- Os comandos para preparar o ambiente, rodar, testar e construir. Um por linha. -->
- Testes: `<comando>`
- Build: `<comando>`

## Contexto do projeto

<!-- Arquitetura, convenções e restrições que valem para qualquer tarefa neste repositório.
     O que vale só para uma área ou um erro específico vira entrada em .dev/memory/ ou .dev/errors/. -->

## Como trabalhar

- **Pense antes de codar.** Declare as suposições; se o pedido admite leituras diferentes, apresente-as em vez de escolher uma em silêncio.
- **Simplicidade primeiro.** Faça só o que foi pedido: nenhuma abstração de uso único, nenhuma configuração que ninguém pediu.
- **Mudanças cirúrgicas.** Siga o estilo do código ao redor, deixe o código vizinho como está e remova só o que a sua mudança deixou órfão. Cada linha alterada deve rastrear até o pedido.
- **Verifique pelo objetivo.** Transforme a tarefa num critério verificável (um teste que reproduz o erro e depois passa) e rode a verificação antes de dizer que terminou.

## Memória do projeto

- `.dev/memory/` e `.dev/errors/`: aprendizados do projeto com frontmatter (module, tags); relevantes ao implementar ou depurar áreas documentadas. `builderdev recall <termos>` busca neles.
- `.dev/plans/`: planos por fase, com o status derivado dos commits. `builderdev brief` mostra a fase ativa.

## Ao compactar

Preserve no resumo: a fase ativa (plano e id), os arquivos modificados nesta sessão, os comandos de teste e de verificação da fase e os erros ainda não resolvidos.
