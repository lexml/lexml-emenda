# Proposal

## Why

O editor de articulação renderiza, antes da ementa, uma linha que representa o elemento raiz (`Articulacao`). Ela não deveria ser editável, mas o cursor consegue entrar nela, por exemplo com seta ↑ no início da ementa ou com um clique no topo do editor. Com o cursor ali, o usuário digita um texto que aparece na tela e não é persistido. Pior: as teclas passam a ser tratadas como se o cursor estivesse na ementa (Enter, Backspace, validações). Issue #37.

## What Changes

- A linha da `Articulacao` deixa de receber o cursor: qualquer seleção que cair nela (teclado, mouse ou programática) é redirecionada para o início da primeira linha de conteúdo seguinte (ementa ou primeiro dispositivo).
- A seta ↑ no início da primeira linha de conteúdo mantém o cursor nessa linha, em vez de subir para a linha da `Articulacao`.
- A linha da `Articulacao` **não é removida**. Ela continua sendo a âncora estrutural usada para inserir o primeiro elemento, para a paginação e para o undo/redo, e é o ponto de partida da busca de linhas no editor.
- Sem mudança no modelo, nos reducers, na `Emenda` persistida ou na API pública.

## Capabilities

### New Capabilities

- `cursor-editor-articulacao`: regras de posicionamento e navegação do cursor no editor de articulação, incluindo as linhas que não podem receber o cursor.

### Modified Capabilities

<!-- Nenhuma: não há specs consolidadas que tratem do cursor no editor. -->

## Impact

- Código: `src/util/eta-quill/eta-quill.ts` (tratamento de `selection-change`) e `src/util/eta-quill/eta-keyboard.ts` (seta ↑).
- Testes: novo E2E em `cypress/e2e/` contra o demo (MPV 905/2019 com ementa; modo "artigo onde couber" sem ementa).
- API pública, modelo `Emenda` e `docs/api.md`: sem alteração.
