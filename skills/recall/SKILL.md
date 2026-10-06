---
name: recall
description: Busca aprendizados registrados do projeto (convenções, decisões e bugs já resolvidos em .dev/memory e .dev/errors) pelo frontmatter, e lê por completo só os relevantes. Use antes de implementar ou depurar uma área que pode ter regra ou erro já documentado, ou quando um erro parece já ter acontecido.
argument-hint: "<tema ou termos>"
---

# Recall

Encontre as entradas de memória que se aplicam ao tema e use-as conferindo o código atual. Tema pedido (pode estar vazio): $ARGUMENTS

Siga os quatro passos abaixo, nesta ordem.

## 1. Escolha de 2 a 5 termos

Tire os termos do tema e do que está em jogo agora: o `module` e as tags que os índices `.dev/memory/index.md` e `.dev/errors/index.md` já usam (se estiverem no contexto, prefira essas palavras exatas), o nome do componente, a mensagem de erro. Termos curtos e específicos funcionam melhor que frases.

## 2. Rode a busca

```bash
betterdev recall <termo1> <termo2> ...
```

A saída lista até 5 entradas com caminho, `summary` e os campos que coincidiram (`tags`, `module`, `applies_when`, `summary`, título, `symptoms`, do mais forte para o mais fraco). Se vier `nenhuma entrada coincide`, tente uma vez com sinônimos ou com tags vistas no índice. Se continuar vazio, responda que não há nada registrado sobre o tema e siga o trabalho.

## 3. Leia por completo só o que é relevante

Decida pelo `summary` e pelos campos coincidentes. Abra com Read no máximo 3 entradas, só as que tratam do problema atual; as demais ficam de fora. Para ler as 3 primeiras de uma vez, use `betterdev recall <termos> --full`.

## 4. Confira a entrada contra o código atual

Antes de aplicar o que a entrada diz, verifique no código os arquivos, funções ou comandos que ela cita (Grep ou Read pontual). Então:

- **A entrada confere com o código:** aplique-a e cite o caminho da entrada.
- **A entrada contradiz o código** (função renomeada, decisão revertida, correção que não está mais lá): sinalize em vez de repetir. Escreva: "A entrada `<caminho>` diz X, mas o código atual faz Y (`arquivo:linha`)." Siga o código atual e sugira atualizar a entrada.
- **Não dá para verificar** (o código citado não existe mais, ou a entrada não cita código): diga isso ao usar a entrada.

Termine com as entradas usadas (caminho e uma linha do que se aplica) e as contradições encontradas, se houver.
