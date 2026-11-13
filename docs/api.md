# API do `@lexml/lexml-emenda`

Este documento descreve a API pública da biblioteca para desenvolvedores que vão incorporar o editor de emendas em uma aplicação.

## Sumário

- [Instalação](#instalação)
- [Uso básico](#uso-básico)
- [Exportações públicas](#exportações-públicas)
- [Componente `<lexml-emenda>`](#componente-lexml-emenda)
  - [Propriedades](#propriedades)
  - [Métodos](#métodos)
  - [Eventos](#eventos)
- [`LexmlEmendaConfig`](#lexmlemendaconfig)
- [`LexmlEmendaParametrosEdicao`](#lexmlemendaparametrosedicao)
- [Modos de edição](#modos-de-edição)
- [Modelo `Emenda`](#modelo-emenda)
- [Serviços HTTP esperados](#serviços-http-esperados)
- [Fluxos comuns](#fluxos-comuns)

## Instalação

```bash
npm install @lexml/lexml-emenda lit@3.3.3 @shoelace-style/shoelace@2.0.0-beta.73
```

`lit` e `@shoelace-style/shoelace` são *peerDependencies* e devem ser fornecidos pela aplicação. O Quill **não** precisa ser instalado: a biblioteca embute uma cópia privada de `quill@1.3.7`, isolada de qualquer outra instalação de Quill que a aplicação possua.

## Uso básico

```ts
import '@lexml/lexml-emenda'; // registra <lexml-emenda> e os componentes internos
import { LexmlEmendaComponent, LexmlEmendaConfig, LexmlEmendaParametrosEdicao } from '@lexml/lexml-emenda';

const config = new LexmlEmendaConfig();
config.urlConsultaParlamentares = '/api/parlamentares';
config.urlComissoes = '/api/comissoes';

const editor = document.querySelector('lexml-emenda') as LexmlEmendaComponent;
editor.lexmlEmendaConfig = config;

const params = new LexmlEmendaParametrosEdicao();
params.modo = 'emenda';
params.projetoNorma = textoDaProposicaoEmJson; // JSON LexML da proposição

await editor.inicializarEdicao(params);

// ... após a edição pelo usuário
const emenda = editor.getEmenda();
```

```html
<lexml-emenda></lexml-emenda>
```

O componente renderiza no *light DOM* (não usa *shadow DOM*) e ocupa a altura disponível do contêiner; defina dimensões para o elemento `lexml-emenda` no CSS da aplicação.

> A configuração (`lexmlEmendaConfig`) deve ser atribuída **antes** de chamar `inicializarEdicao`, pois a lista de parlamentares e a opção `anexoParecer` são lidas durante a inicialização.

## Exportações públicas

| Exportação | Tipo | Descrição |
|---|---|---|
| `LexmlEmendaComponent` | classe (custom element `lexml-emenda`) | Componente principal do editor |
| `LexmlEmendaParametrosEdicao` | classe | Parâmetros passados a `inicializarEdicao` |
| `LexmlEmendaConfig` | classe | Configuração de URLs de serviços e limites |
| `Emenda` | classe | Modelo da emenda produzida/consumida pelo editor |

Os demais componentes registrados (`lexml-eta`, `lexml-emenda-autoria`, etc.) são internos e não fazem parte da API pública.

## Componente `<lexml-emenda>`

### Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `lexmlEmendaConfig` | `LexmlEmendaConfig` | `new LexmlEmendaConfig()` | Configuração do editor (ver [`LexmlEmendaConfig`](#lexmlemendaconfig)) |
| `parlamentares` | `Parlamentar[]` | `[]` | Lista de parlamentares para seleção de autoria. Preenchida automaticamente em `inicializarEdicao` a partir de `urlConsultaParlamentares` |
| `comissoes` | `Comissao[]` | `[]` | Lista de comissões para o destino da emenda. Preenchida automaticamente a partir de `urlComissoes` |

### Métodos

#### `inicializarEdicao(params: LexmlEmendaParametrosEdicao): Promise<void>`

Inicializa (ou reinicializa) o editor. Pode ser usado para iniciar uma emenda nova ou para abrir uma emenda existente (`params.emenda`). Em caso de erro, o erro é registrado no console e o evento [`fatalError`](#eventos) é disparado; a promise não é rejeitada.

#### `getEmenda(): Emenda`

Retorna a emenda no estado atual da edição: dispositivos emendados, comando de emenda gerado, justificação, autoria, destino, data, opções de impressão, anexos, notas de rodapé, comentários e marcas de revisão. O campo `pendenciasPreenchimento` lista as pendências que impedem a emenda de estar completa (por exemplo, ausência de modificação no texto ou de justificação).

Se chamado antes de `inicializarEdicao`, retorna uma `Emenda` vazia.

#### `trocarModoEdicao(modo: string, motivo = ''): void`

Troca o [modo de edição](#modos-de-edição) sem recarregar a proposição. O conteúdo emendado no modo anterior é descartado.

Lança exceção (string) quando:
- `modo === 'emenda'` e não há `projetoNorma` carregado;
- `modo === 'emendaTextoLivre'` e `motivo` não foi informado.

#### `setUsuario(usuario?): void`

Define o usuário corrente, usado nas marcas de revisão e nos comentários. O objeto tem o formato `{ nome: string; id: any; sigla?: string }`. Sem argumento, o usuário passa a ser "Anônimo".

#### `getEmentaFromProjetoNorma(projetoNorma): string`

Utilitário que extrai a ementa (texto) de um `projetoNorma` em JSON LexML.

### Eventos

Todos os eventos são `CustomEvent` com `bubbles: true` e `composed: true`.

| Evento | `detail` | Quando ocorre |
|---|---|---|
| `onchange` | `{ origemEvento: string }` | Qualquer alteração no conteúdo da emenda (texto, justificação, autoria, destino, data, opções de impressão, anexos, substituição de termo). Útil para marcar a emenda como "não salva" ou implementar salvamento automático |
| `onrevisao` | `{ emRevisao: boolean }` | Ativação ou desativação do modo de marcas de revisão |
| `fatalError` | `{ err: any }` | Falha durante `inicializarEdicao` |

```ts
editor.addEventListener('onchange', (ev: CustomEvent) => {
  console.log('Alteração em', ev.detail.origemEvento);
});
```

## `LexmlEmendaConfig`

| Campo | Tipo | Padrão | Descrição |
|---|---|---|---|
| `urlConsultaParlamentares` | `string` | `'api/parlamentares'` | Serviço que retorna a lista de parlamentares |
| `urlComissoes` | `string \| undefined` | `undefined` | Serviço que retorna as comissões. Se não informado, a lista de comissões fica vazia |
| `urlAutocomplete` | `string` | `'api/autocomplete-norma'` | Serviço de busca de normas, usado ao informar a norma alterada por um dispositivo |
| `tamanhoMaximoAnexo` | `number` (KB) | `5120` (5 MB) | Tamanho máximo de arquivos anexados |
| `tamanhoMaximoImagem` | `number` (KB) | `2048` (2 MB) | Tamanho máximo de imagens inseridas nos editores de texto rico |
| `anexoParecer` | `boolean` | `false` | Ativa o modo "anexo de parecer": oculta justificação, autoria, data e local, que também são removidos da `Emenda` retornada por `getEmenda()` |

O formato esperado das respostas está em [Serviços HTTP esperados](#serviços-http-esperados).

## `LexmlEmendaParametrosEdicao`

| Campo | Tipo | Padrão | Descrição |
|---|---|---|---|
| `modo` | `string` | `'emenda'` | [Modo de edição](#modos-de-edição) |
| `projetoNorma` | `object` | — | Texto da proposição em JSON LexML. **Obrigatório** nos modos `emenda` e `emendaArtigoOndeCouber` |
| `emenda` | `Emenda` | — | Emenda existente a ser aberta para edição |
| `proposicao` | `{ sigla, numero, ano, ementa }` | — | Identificação da proposição emendada. Opcional se `emenda` ou `projetoNorma` forem informados; quando informada, tem precedência sobre eles |
| `ementa` | `string` | `''` | Ementa da proposição. Preenchida automaticamente a partir de `emenda` ou `projetoNorma` |
| `motivo` | `string` | `''` | Motivo da emenda de texto livre. Preenchido automaticamente a partir de `emenda` |
| `usuario` | `{ nome, id, sigla? }` | — | Usuário para marcas de revisão e comentários (equivale a chamar `setUsuario`) |
| `dispositivosBloqueados` | `(string \| DispositivoBloqueado)[]` | — | IDs LexML de dispositivos que não podem ser editados. **Não é salvo na emenda**: deve ser informado novamente ao reabrir uma emenda |
| `isMateriaOrcamentaria` | `boolean` | `false` | Indica matéria orçamentária; influencia o destino de emendas a MP. Considerado `true` automaticamente se a emenda aberta tiver destino `CMO` |
| `casaLegislativa` | `'SF' \| 'CD' \| 'CN'` | — | Casa responsável pela apreciação. Para MPV, PDN e PRN é sempre `CN`; se omitido, usa o valor da emenda aberta ou `CN` |
| `emendarTextoSubstitutivo` | `boolean` | `false` | Indica que o texto emendado é um substitutivo (afeta a epígrafe e a identificação do texto) |
| `autoriaPadrao` | `{ identificacao, siglaCasaLegislativa: 'SF' \| 'CD' }` | — | Parlamentar pré-selecionado como autor em emendas novas (deve existir na lista de parlamentares) |
| `opcoesImpressaoPadrao` | `{ imprimirBrasao, textoCabecalho, tamanhoFonte }` | — | Opções de impressão iniciais de emendas novas |
| `configuracaoPaginacao` | `{ maxItensPorPagina?: number; rangeArtigos?: { numInicial, numFinal }[] }` | — | Paginação da articulação durante a edição, útil para proposições extensas |

`DispositivoBloqueado`:

```ts
{
  lexmlId: string;          // ID LexML do dispositivo
  bloquearFilhos: boolean;  // também bloqueia os dispositivos subordinados
  motivoBloqueio?: string;  // texto exibido ao usuário
}
```

## Modos de edição

| Modo | Descrição |
|---|---|
| `emenda` | Emenda padrão: o usuário altera, adiciona ou suprime dispositivos no texto da proposição e o comando de emenda é gerado automaticamente |
| `emendaArtigoOndeCouber` | Adição de artigo(s) "onde couber", sem posição definida no texto |
| `emendaTextoLivre` | Emenda redigida livremente em editor de texto rico (exige `motivo`) |
| `emendaSubstituicaoTermo` | Substituição de um termo (expressão, palavra ou número) em todo o texto |

## Modelo `Emenda`

Principais campos (todas as classes estão em `src/model/emenda/emenda.ts`):

| Campo | Descrição |
|---|---|
| `modoEdicao` | Modo de edição em que a emenda foi criada |
| `proposicao` | `{ urn, sigla, numero, ano, ementa, identificacaoTexto, emendarTextoSubstitutivo }` |
| `epigrafe` | `{ texto, complemento }` — ex.: `EMENDA Nº - CCJ` / `(ao PL 123/2024)` |
| `componentes[0].dispositivos` | Dispositivos `dispositivosSuprimidos`, `dispositivosModificados` e `dispositivosAdicionados` (este último com `idPai`, `idIrmaoAnterior`, `filhos` etc.) |
| `comandoEmenda` | `{ cabecalhoComum?, comandos: { cabecalho, citacao?, rotulo?, complemento? }[] }` — comando gerado automaticamente |
| `comandoEmendaTextoLivre` | `{ motivo?, texto?, textoAntesRevisao? }` — usado no modo `emendaTextoLivre` (HTML) |
| `substituicaoTermo` | `{ tipo, termo, novoTermo, flexaoGenero, flexaoNumero }` — usado no modo `emendaSubstituicaoTermo` |
| `justificativa` | Justificação em HTML |
| `notasRodape` | Notas de rodapé da justificação |
| `autoria` | Tipo de autoria, parlamentares autores, assinaturas adicionais, colegiado |
| `colegiadoApreciador` | `{ siglaCasaLegislativa, tipoColegiado: 'Plenário' \| 'Comissão' \| 'Plenário via Comissão', siglaComissao? }` |
| `local`, `data` | Local (derivado do colegiado) e data no formato `YYYY-MM-DD` |
| `opcoesImpressao` | `{ imprimirBrasao, textoCabecalho, reduzirEspacoEntreLinhas, tamanhoFonte }` |
| `anexos` | `{ nomeArquivo, base64 }[]` |
| `revisoes` | Marcas de revisão pendentes |
| `sequenciasComentario` | Comentários, associados ao texto (`idDispositivo`) ou à justificação |
| `pendenciasPreenchimento` | Mensagens de pendências calculadas por `getEmenda()` |
| `aplicacao`, `versaoAplicacao`, `metadados` | Livres para a aplicação hospedeira registrar sua identificação e metadados próprios |

A `Emenda` é serializável em JSON: a aplicação pode persistir o resultado de `getEmenda()` e, depois, reabri-la passando-a em `params.emenda`.

## Serviços HTTP esperados

As requisições são feitas com `fetch` (GET) a partir do navegador, portanto as URLs devem ser acessíveis pela aplicação (mesma origem ou CORS habilitado).

**Parlamentares** — `GET {urlConsultaParlamentares}`

```json
[{ "id": 123, "nome": "Fulano", "sexo": "M", "siglaPartido": "XYZ", "siglaUF": "DF", "siglaCasa": "SF" }]
```

A lista é filtrada pela casa legislativa da emenda (exceto quando a casa é `CN`).

**Comissões** — `GET {urlComissoes}?siglaCasaLegislativa=SF`

```json
[{ "siglaCasaLegislativa": "SF", "sigla": "CCJ", "nome": "Comissão de Constituição, Justiça e Cidadania" }]
```

**Normas (autocomplete)** — `GET {urlAutocomplete}?query=lei 8666`

```json
[{ "urn": "urn:lex:br:federal:lei:1993-06-21;8666", "nomePreferido": "Lei nº 8.666, de 1993", "nomePorExtenso": "...", "nomes": [], "nomesAlternativos": [], "ementa": "..." }]
```

## Fluxos comuns

**Nova emenda a uma proposição**

```ts
const params = new LexmlEmendaParametrosEdicao();
params.modo = 'emenda';
params.projetoNorma = projetoNorma;
params.usuario = { nome: 'Fulano', id: 123 };
await editor.inicializarEdicao(params);
```

**Nova emenda de texto livre (sem texto estruturado)**

```ts
const params = new LexmlEmendaParametrosEdicao();
params.modo = 'emendaTextoLivre';
params.proposicao = { sigla: 'PL', numero: '123', ano: '2024', ementa: 'Dispõe sobre...' };
params.motivo = 'Texto da proposição não disponível em formato estruturado';
await editor.inicializarEdicao(params);
```

**Abrir uma emenda salva**

```ts
const params = new LexmlEmendaParametrosEdicao();
params.modo = emendaSalva.modoEdicao;
params.projetoNorma = projetoNorma;          // necessário nos modos estruturados
params.emenda = emendaSalva;
params.dispositivosBloqueados = bloqueados;  // não é persistido na emenda
await editor.inicializarEdicao(params);
```

**Salvar**

```ts
const emenda = editor.getEmenda();
if (emenda.pendenciasPreenchimento.length) {
  // exibir pendências ao usuário antes de concluir
}
await salvar(JSON.stringify(emenda));
```

Uma aplicação de exemplo completa está em `demo/components/demoview.ts`.
