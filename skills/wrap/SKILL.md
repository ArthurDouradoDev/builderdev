---
name: wrap
description: Fim de sessão. Decide se algo desta sessão merece virar entrada em .dev/memory ou .dev/errors pelo critério de durabilidade e registra no máximo uma entrada, validada por builderdev lint. "Nada a registrar" é um resultado válido.
disable-model-invocation: true
argument-hint: "[aprendizado a considerar]"
---

# Wrap

Feche a sessão registrando o aprendizado que vale guardar, se houver um. Indicação do usuário (pode estar vazia): $ARGUMENTS

Siga os cinco passos abaixo, nesta ordem. A decisão e a redação são suas; formato, tamanho e índices são validados por script.

## 1. Aplique o critério de durabilidade

Revise o que aconteceu nesta sessão (erros resolvidos, decisões tomadas, armadilhas encontradas) e teste cada candidato com uma pergunta:

> Se esta entrada sumisse, alguém lendo o código final repetiria o erro ou refaria uma investigação grande?

Passa no critério:

- causa de um erro que não é óbvia lendo o código (ordem de inicialização, limitação de biblioteca, ambiente);
- decisão cujo motivo não aparece no código e que alguém desfaria por engano;
- convenção que o código segue mas não explica, e que um novo trecho quebraria.

Não passa, nunca: narrativa da sessão, lista do que foi mudado (o git já registra), o que o próprio código ou um comentário nele já deixa claro, e passos de rotina.

Se nada passa, responda "nada a registrar" com o motivo em uma linha e termine aqui. Esse é um resultado válido, não uma falha.

## 2. Procure se já existe

Rode a busca com 2 a 5 termos do aprendizado (module, componente, mensagem de erro):

```bash
builderdev recall <termos...>
```

Abra com Read a entrada que tratar do mesmo assunto. Se for **o mesmo erro**, atualize essa entrada em vez de criar outra: incremente `occurrences`, ponha a data de hoje em `updated` e acrescente o que mudou (novo sintoma, causa mais precisa). Se for o mesmo conhecimento, corrija ou complete a entrada existente. Em ambos os casos, pule para o passo 4.

## 3. Crie no máximo uma entrada

Registre no máximo uma entrada por sessão: a de maior valor pelo critério do passo 1. Escolha a trilha:

- `bug`: um erro que aconteceu e foi resolvido. Tipos: `build | teste | runtime | performance | dados | seguranca | ui | integracao | logica`.
- `conhecimento`: convenção, decisão ou padrão. Tipos: `convencao | decisao | padrao | ferramenta | fluxo | pratica`.

```bash
builderdev entry new --track <bug|conhecimento> --slug <assunto-em-minusculas-com-hifen>
```

O slug descreve o assunto, sem data. Preencha o arquivo criado:

- `module` e `tags`: reuse os valores que os índices `.dev/memory/index.md` e `.dev/errors/index.md` já usam;
- `summary`: uma linha de até 120 caracteres que permite decidir, só pelo índice, se vale abrir a entrada;
- trilha `bug`: `symptoms` como o erro aparece (mensagem, comportamento), `root_cause` e `resolution` em uma ou duas frases, `occurrences: 1`;
- corpo: um título `# ...` e só o que o frontmatter não cobre (exemplo mínimo, comando que reproduz, onde fica no código), em até 40 linhas. Cite arquivos e funções pelo nome, para a entrada poder ser conferida contra o código depois.

## 4. Valide e regenere os índices

```bash
builderdev lint
builderdev reindex
```

Corrija o que o `lint` apontar na entrada e rode de novo até sair sem erro. Avisos de `corpus-module` ou `corpus-tag` sugerem um valor já usado: troque por ele.

## 5. Reporte em 2 a 3 linhas

Escreva o que foi registrado (criado ou atualizado), o caminho da entrada e por que passou no critério de durabilidade. Se nada foi registrado, a resposta do passo 1 já é o relatório.
