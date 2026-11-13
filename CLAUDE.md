# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Escreva toda a documentação, comentários de código e mensagens de commit em **português (pt-BR)**, mantendo em inglês apenas termos técnicos (ex.: reducer, store, web component, bundle, mixin).

## OpenSpec

O projeto usa [OpenSpec](https://github.com/Fission-AI/OpenSpec) (schema `spec-driven`) para mudanças planejadas: specs consolidadas em `openspec/specs/`, mudanças em andamento em `openspec/changes/` e contexto/regras do projeto em `openspec/config.yaml`. Fluxo: `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive` (ou `/opsx:sync` para sincronizar specs sem arquivar).

As regras de idioma dos artefatos, nomenclatura das changes (`<yyyy>-<mm>-<dd>-c<xx>-<nome>`), tarefas obrigatórias (testes unitários, E2E e `docs/api.md`) e pausas durante o apply estão em `openspec/config.yaml` — consulte-o antes de criar ou implementar uma change.

## Commits

- Nunca commitar diretamente: apresentar antes o plano de commits para aprovação do usuário.
- Agrupar os arquivos alterados em commits semanticamente coerentes.
- Mensagens concisas, em pt-BR, no padrão já usado no histórico (`feat:`, `fix:` ...), sem listar arquivos e sem tom de texto gerado por IA.
- Não incluir o assistente como co-autor (sem `Co-Authored-By`).
- Sempre referenciar a issue entre parênteses no final da mensagem, ex.: `feat: emite evento fatalError ao falhar abertura da emenda (#935)`. Se a issue não for conhecida (não informada pelo usuário nem identificável na change ou no branch), perguntar antes de propor o commit.

## Quadro Kanban

O projeto usa o quadro kanban https://github.com/orgs/lexml/projects/2 para acompanhar as issues e o andamento do trabalho.

## Visão geral

`@lexml/lexml-emenda` é uma biblioteca de *web components* (Lit 3 + Redux + Quill 1.3.7 + Shoelace) para edição de textos articulados de normas e proposições legislativas, com foco na elaboração de **emendas** e na geração automática do **comando de emenda**, seguindo a LC 95/1998, o Decreto 9.191/2017 e o padrão LexML.

## Comandos

```bash
npm start                 # compila (tsc) e sobe o web-dev-server abrindo /demo, com tsc --watch
npm run build             # apenas tsc -> out-tsc/
npm run lint              # eslint + prettier --check
npm run format            # eslint --fix + prettier --write
npm test                  # limpa out-tsc, compila e roda o web-test-runner com coverage
npm run test:watch        # testes em modo watch
npm run prepublish        # gera dist/ (rollup.config.dist.js) + tipos + validação do pacote
npm run test:bundle-isolation   # verifica que o Quill privado não vaza do bundle
npm run cy:open:local     # Cypress (e2e) com cypress/config/cypress.env.local.json
```

Executar um único teste (os testes rodam a partir do JS compilado em `out-tsc/`, então é preciso compilar antes):

```bash
npm run test -- out-tsc/test/model/dispositivo/parte.test.js
# ou, após `npx tsc` (sem coverage):
npx wtr out-tsc/test/redux/remove/reducer-remove-artigo.test.js
```

Observações:
- `out-tsc/test/redux/paginacao/reducer-paginacao.test.js` é excluído da execução padrão por ser muito lento; rode-o separadamente.
- Testes usam `@open-wc/testing` (Mocha + Chai) em Chrome headless, com timeout de 120 s.
- O hook de pre-commit (husky + lint-staged) aplica prettier e eslint nos `.ts` alterados. Prettier usa `printWidth: 180`, aspas simples e `arrowParens: avoid`.
- O dev server faz proxy de `/api/` para o ambiente de homologação do Senado (`web-dev-server.config.mjs`).

### Regras de execução de lint e testes

- **Lint apenas nos arquivos alterados**, nunca o projeto inteiro (`npm run lint`):
  ```bash
  npx eslint <arquivos.ts>
  npx prettier --check <arquivos.ts>
  ```
  Os arquivos alterados vêm de `git status --short` (modificados e não rastreados).
- **E2E apenas dos specs relacionados à change atual**, salvo pedido explícito para rodar a suíte completa. Os testes rodam contra o demo local, então `npm start` precisa estar em execução:
  ```bash
  npm run cy:run:local -- --spec "cypress/e2e/<pasta>/<arquivo>.cy.ts"
  ```

## Arquitetura

### Fluxo principal: ação → reducer → eventos de estado → componentes

1. **Ações** (`src/model/lexml/acao/`): cada operação de edição é uma classe que implementa `ElementoAction` e expõe uma constante de tipo (ex.: `REMOVER_ELEMENTO`) e um singleton (ex.: `removerElementoAction`). `execute(...)` devolve o objeto de ação Redux. Essas classes também alimentam menus de contexto (`descricao`, `hotkey`).
2. **Store** (`src/redux/store.ts`): `rootStore` global com `appReducer` e `elementoReducer`.
3. **Reducer** (`src/redux/elemento/reducer/elementoReducer.ts`): faz o `switch` pelo tipo da ação e delega para uma função pura por arquivo (`removeElemento.ts`, `adicionaElemento.ts`, `aplicaAlteracoesEmenda.ts`, ...). Funções auxiliares ficam em `src/redux/elemento/util/` e eventos em `src/redux/elemento/evento/`.
4. **Estado** (`src/redux/state.ts`): além da `articulacao`, o estado guarda listas de `StateEvent` (`past`/`present`/`future`) usadas para undo/redo e `ui.events`, que descrevem *o que mudou* (`ElementoIncluido`, `ElementoRemovido`, `ElementoRenumerado`, ...). Os eventos referenciam `Elemento`s, não dispositivos.
5. **Componentes** conectados (`connect(rootStore)` do `pwa-helpers`) implementam `stateChanged` e processam `ui.events` de forma incremental — o editor (`src/components/editor/editor.component.ts`, método `processarStateEvents`) não re-renderiza a articulação inteira, apenas aplica cada evento sobre os blots do Quill.

Ao criar uma nova operação de edição, normalmente são necessários: a ação em `model/lexml/acao`, o case em `elementoReducer.ts`, a função de reducer, os `StateEvent`s corretos para undo/redo e o tratamento do evento no editor.

### Modelo de domínio

- `src/model/dispositivo/`: interfaces abstratas (`Dispositivo`, `Articulacao`, `Artigo`, situação, tipo, gênero, validação).
- `src/model/lexml/`: implementação concreta. `dispositivo/dispositivoLexmlFactory.ts` monta cada dispositivo por **composição de mixins** (`src/model/lexml/util/mixin.ts`), combinando:
  - `hierarquia/` (pai/filhos, artigo vs. agrupador vs. dispositivo genérico),
  - `numeracao/` (rótulos e numeração por tipo: artigo, parágrafo, inciso, alínea, item, agrupador...),
  - `regras/` (ações permitidas por tipo de dispositivo, conforme a técnica legislativa),
  - `conteudo/`, `situacao/` (original, novo, adicionado, modificado, suprimido) e `alteracao/` (blocos de alteração de norma vigente).
- `src/model/lexml/parser/articulacaoParser.ts`: `ArticulacaoParser.load(json)` cria a articulação a partir do JSON LexML — é o ponto de partida típico nos testes.
- `src/model/elemento/`: `Elemento` é a projeção "plana" de um dispositivo consumida pela UI; a conversão dispositivo → elemento fica em `elementoUtil.ts`.
- `src/model/emenda/`: o modelo `Emenda` exportado publicamente (dados de autoria, destino, comando, anexos etc.).

### Comando de emenda

`src/emenda/` gera o texto do comando de emenda a partir das diferenças entre a articulação original e a emendada: `comando-emenda-builder.ts` orquestra; os arquivos `cmd-emd-*.ts` tratam cada caso (adição, modificação, supressão, substituição de termo, dispositivos de norma vigente, "onde couber"); `citacao-*.ts` produzem as citações; `range-dispositivos.ts`/`sequencia-range-dispositivos.ts` agrupam dispositivos consecutivos na redação.

### Componentes

- `src/components/lexml-emenda.component.ts` (`<lexml-emenda>`) é o componente público e a API da biblioteca (`inicializarEdicao`, `trocarModoEdicao`, `setUsuario`, `getEmenda`...). Ele compõe `<lexml-eta>` (editor de articulação), o editor de texto rico (justificação, emenda de texto livre), autoria, destino, alertas, revisão etc.
- `src/components/editor/` contém o editor de articulação baseado em Quill; os blots customizados estão em `src/util/eta-quill/`.
- `src/index.ts` define a **API pública**: apenas `LexmlEmendaComponent`, `LexmlEmendaParametrosEdicao`, `LexmlEmendaConfig` e `Emenda`. Os demais componentes são importados só para registrar as tags; não os exporte sem necessidade.

### Quill privado

O pacote embute uma cópia privada de `quill@1.3.7` que nunca deve ser compartilhada com a aplicação hospedeira:
- `private-quill.mjs` reescreve imports de `quill` para um módulo ESM privado, tanto no dev server/test runner (plugin `createPrivateQuillDevPlugin`) quanto no bundle de distribuição (`rollup.config.dist.js`).
- O build de distribuição falha se o Quill for externalizado ou exposto em `window.Quill`/`globalThis.Quill`. `lit` e `@shoelace-style/shoelace` são `peerDependencies` e permanecem externos.
- A configuração do Quill é feita por `configurePrivateQuill()` (`src/internal/quill/`).

### Testes

- `test/` espelha `src/`: `test/redux/<operação>/` testa as funções de reducer diretamente (carregando um exemplo com `ArticulacaoParser.load` e chamando, por exemplo, `removeElemento(state, action)`); `test/emenda/` testa a geração do comando de emenda; `test/model/` testa numeração, hierarquia etc.
- `test/doc/` contém as articulações de exemplo em JSON/TS (`EXEMPLO_ARTIGOS`, emendas, textos para colar) reutilizadas pelos testes.
- `cypress/` contém testes e2e executados contra o demo.

### Demo e distribuição

- `demo/` é a aplicação de exemplo servida por `npm start`; `npm run build:demo` gera `prod/`, publicado no branch `gh-pages` pelo workflow `.github/workflows/deploy-demo.yml` (push em `main`).
- A biblioteca publicada fica em `dist/` (gerado por `npm run prepublish`).
