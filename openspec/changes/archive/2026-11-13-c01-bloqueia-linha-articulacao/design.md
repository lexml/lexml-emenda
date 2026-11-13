# Design

## Context

O editor carrega a articulação como uma sequência de linhas Quill (`EtaContainerTable`), e a primeira é sempre o elemento raiz `Articulacao` (`getElementos` em `src/model/elemento/elementoUtil.ts`). Essa linha já tem `editavel: false`, que gera `contenteditable="false"` no `<p>`, e quase não aparece na tela (`min-height: 1px; line-height: 0.42`). Mesmo assim o cursor chega nela:

- `onTeclaArrowUp` (`eta-keyboard.ts`) leva o cursor para `linha.prev` sem conferir o tipo dessa linha. Na primeira linha de conteúdo, `prev` é a `Articulacao`.
- `verificarMudouLinha` (`eta-quill.ts`) só corrige o caso `range.index === 0`. Como o conteúdo da `Articulacao` não fica no índice 0, um clique ou uma seta ↑ escapa dessa correção.
- `marcarLinhaAtual` ignora a `Articulacao`, então `linhaAtual` continua apontando para a linha anterior (normalmente a ementa). Assim, o teclado, a colagem e as validações agem sobre a ementa enquanto o caret está na linha raiz.

A linha raiz também é usada como âncora estrutural e por isso não pode sair (ver proposal.md):

- `inserirNovoElementoNoQuill` usa `getLinha(... || referencia?.uuid || 0)`.
- `atualizaPaginacao.ts:176` usa a raiz como `elementoAnteriorNaSequenciaDeLeitura`.
- A paginação sempre renderiza a raiz.
- `getLinha`/`getLinhaByUuid2` começam a busca em `getPrimeiraLinha()`.
- Ctrl+Home vai para `getPrimeiraLinha().next`.

## Goals / Non-Goals

**Goals:**
- O cursor nunca fica na linha `Articulacao`, qualquer que seja a origem da seleção (teclado, mouse ou programática).
- A seta ↑ no início da primeira linha de conteúdo não sai dessa linha.

**Non-Goals:**
- Remover a linha raiz ou mudar seu papel de âncora (opção B, descartada na exploração).
- Mudar o modelo, os reducers, os eventos de estado ou a paginação.
- Revisar outras linhas não editáveis (dispositivos suprimidos ou bloqueados), que já têm tratamento próprio no teclado.

## Decisions

### 1. Guarda central em `verificarMudouLinha`

Ao receber uma seleção, se `blotCursor.linha.tipo === 'Articulacao'`, o editor reposiciona a seleção com `setSelection(getIndex(linha.next.blotConteudo), 0, SILENT)` e segue o fluxo com `linhaCursor = linha.next`. Assim a linha seguinte é marcada como atual e o `elementoSelecionado` é notificado.

- O tratamento fica no mesmo ponto que já redireciona a seleção quando ela cai em rótulo, menu ou aspas, e segue esse mesmo padrão.
- Cobre clique, teclado e `setSelection` programático de uma vez, sem depender de cada tecla.
- O destino é sempre o início da linha seguinte, e não o `oldRange`: o comportamento fica previsível, também quando não existe `oldRange` (foco inicial ou primeiro clique). A correção atual de `range.index === 0`, que volta para o `oldRange`, continua como está e roda antes.
- Alternativas descartadas: (a) só CSS `pointer-events: none` / `user-select: none` na linha raiz, que não cobre o teclado nem `setSelection`, e o clique ainda pode cair na posição mais próxima dentro da linha; (b) bloquear teclas quando o caret está na raiz, que exigiria detectar o caret fora de `linhaAtual` em cada handler.

### 2. Seta ↑ não sobe para a raiz

Em `onTeclaArrowUp`, quando `blotCursor.linha.prev` for a `Articulacao`, o evento é cancelado e o cursor não se move. Assim o cursor não chega a entrar na linha raiz para depois ser devolvido, o que evitaria um `selection-change` intermediário e uma rolagem desnecessária. A guarda da decisão 1 continua sendo a rede de segurança.

### 3. CSS impede que o clique posicione o cursor na raiz

Na validação manual, o clique ainda punha o caret na linha raiz por um instante, até a guarda da decisão 1 movê-lo. A classe `.container__elemento--articulacao` (`src/assets/css/editor.css.ts`) recebe `pointer-events: none` e `user-select: none`, para que o browser não use a linha como alvo de clique nem de posicionamento do caret, e `caret-color: transparent`, para que o caret não apareça se cair ali por outro caminho. O CSS complementa a guarda da decisão 1 e não a substitui: teclado e `setSelection` continuam cobertos por ela.

### 4. Sem `linha.next`

Se a raiz não tiver linha seguinte (articulação vazia, situação que hoje não ocorre no fluxo normal), a guarda não reposiciona nada e só retorna `false`. Isso evita exceções no Quill.

## Risks / Trade-offs

- [Seleção com Shift que começa abaixo e se estende até a raiz] → o redirecionamento usa comprimento 0 e desfaz a seleção estendida. O caso é raro: seleções entre linhas já não são suportadas pelo editor, e Ctrl+A tem tratamento próprio.
- [Mudança de página na paginação reposiciona a seleção] → `carregarArticulacao` já seleciona `primeiraLinhaDaPagina`, que nunca é a raiz, então a guarda não é acionada.
- [Correção do índice 0 e guarda nova com destinos diferentes] → a correção existente executa antes e retorna cedo, sem alterar o comportamento já validado.
