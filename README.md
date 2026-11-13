# lexml-emenda

<p align="center">O <code>@lexml/lexml-emenda</code> é um <i>web component</i> (<code>&lt;lexml-emenda&gt;</code>) especializado na elaboração de emendas a proposições legislativas, com edição estruturada dos dispositivos e geração automática do comando de emenda.</p>

## Motivação

A autoria de normas jurídicas pode se beneficiar de uma solução que codifique as regras de técnica legislativa estabelecidas em normas jurídicas como também as regras convencionadas pela tradição legislativa do Brasil.

Uma norma jurídica se expressa por meio de textos e outros elementos visuais, sendo todos eles manifestados em edições de algum periódico oficial. Além de texto hierárquico e articulado, a norma jurídica pode se manifestar por outros meios, tais como fórmulas, figuras, tabelas, texto corrido não articulado e partitura.

Este projeto visa desenvolver componentes que suportem a edição do texto articulado de uma norma ou proposição legislativa e a elaboração de emendas a esse texto.

Objetivos específicos da solução:

- Implementar uma plataforma tecnológica que possa suportar a redação de textos normativos articulados;
- Desenvolver um ambiente para a autoria legislativa baseado na edição e manipulação de textos estruturados, como a norma e a proposição;
- Permitir a validação da articulação de documentos disponíveis em outros formatos, como o DOCX;
- Especificar formato de documento para atender às necessidades de todos os tipos de documento previstos e que seja sustentável a longo prazo;
- Atender a requisitos de usabilidade e portabilidade, ampliando as possibilidades de uso da ferramenta sem necessidade de treinamento e de plataformas de hardware e ambiente operacional específicos;
- Desenvolver um produto que possa ser distribuído e incorporado em diferentes ambientes e sistemas, e extensível para atender a necessidades de outras instituições;
- Criar um ambiente de colaboração, de modo a facilitar a incorporação de desenvolvedores de outras instituições, empresas ou indivíduos no esforço de desenvolvimento do editor e de outras ferramentas relacionadas.

## Principais funcionalidades

- Apresentar o texto articulado em consonância com padrões previstos em normas vigentes (LC 95 e Decreto 9.191/2017, entre outros);
- Permitir que sejam utilizadas mais de uma instância do editor para a edição de textos articulados;
- Oferecer recursos de navegação com o teclado, de maneira similar ao que ocorre em processadores de texto;
- Permitir a criação e edição do texto articulado em consonância com as normas vigentes (LC 95) e a especificação contida no padrão LexML;
- Oferecer recursos básicos de formatação de dispositivo, quando isso for permitido;
- Numerar automaticamente os dispositivos do texto articulado que estejam em consonância com as normas vigentes;
- Permitir a numeração manual do dispositivo quando se tratar de alteração de norma existente;
- Numerar dispositivos agrupadores (Livros, Partes, Capítulos, Títulos, Seções e Subseções);
- Definir regras de edição do texto articulado;
- Oferecer ações permitidas sobre os dispositivos, segundo as regras previstas e dependentes do contexto;
- Possibilitar a criação de dispositivos automaticamente, à medida que o usuário for digitando, inclusive gerando automaticamente os rótulos de dispositivo:
  - O uso dos dois pontos comanda o desdobramento dos dispositivos em filhos;
  - O uso de ponto e vírgula indica continuação de sequência de dispositivos do mesmo tipo, admitindo-se o uso de " ; e " e "; ou " quando se tratar do penúltimo dispositivo;
  - No caso de artigos e parágrafos não há distinção entre continuação e fim de sequência, pois só é admitido o uso de ponto final;
  - Essas regras não se aplicam a dispositivos agrupadores, pois esses não podem possuir pontuação.
- Bloquear a edição dos rótulos de dispositivo, a menos que se trate de alteração de norma existente;
- Promover mudança estrutural de artigos e dispositivos de artigo, considerando os dispositivos dependentes;
- Suporte a emendamento de proposições, inclusive com geração automática do comando de emenda;
- Emendas de texto livre, de substituição de termo e de adição de artigo "onde couber";
- Manter histórico das modificações efetuadas sobre a articulação, permitindo desfazer e refazer operações efetuadas no documento;
- Marcas de revisão e comentários;
- Validar a situação do dispositivo;
- Permitir a incorporação dos componentes desenvolvidos em página HTML e sua utilização em frameworks JavaScript;
- Permitir a edição de um texto articulado independente do seu tamanho;
- Definir estilos consistentes e protegidos contra alteração não intencional.

## Instalação

```
npm install @lexml/lexml-emenda lit@3.3.3 @shoelace-style/shoelace@2.0.0-beta.73
```

`lit` e `@shoelace-style/shoelace` são *peerDependencies* e devem ser instalados pela aplicação consumidora.

## Uso

```ts
import '@lexml/lexml-emenda';
import { LexmlEmendaParametrosEdicao } from '@lexml/lexml-emenda';

const editor = document.querySelector('lexml-emenda');

const params = new LexmlEmendaParametrosEdicao();
params.modo = 'emenda';
params.projetoNorma = textoDaProposicaoEmJson;
await editor.inicializarEdicao(params);

const emenda = editor.getEmenda();
```

A documentação completa da API (propriedades, métodos, eventos, parâmetros de edição, modelo `Emenda` e serviços HTTP esperados) está em **[docs/api.md](docs/api.md)**.

## Dependência do Quill

O `@lexml/lexml-emenda` incorpora uma cópia privada de `quill@1.3.7` durante o build. A aplicação consumidora não precisa instalar nem fornecer o Quill para usar a biblioteca.

Caso a aplicação também utilize Quill, sua própria instalação permanece independente: o código e o registry do editor LexML não são deduplicados nem compartilhados com ela.

Diferentemente do Quill, `lit` e Shoelace **não** são embutidos no bundle (ver [Instalação](#instalação)).

## Executando o demo localmente

```
git clone https://github.com/lexml/lexml-emenda.git
cd lexml-emenda
npm install
npm start
```

Será aberta uma janela do browser com uma aplicação exemplo (`demo/`) que permite testar o componente.

## Teste

Para executar os testes apenas uma vez:

```
npm run test
```

Para executar os testes em modo de desenvolvimento:

```
npm run test:watch
```

Para executar um teste apenas (os testes rodam sobre o código compilado em `out-tsc/`):

```
npm run test -- out-tsc/test/model/dispositivo/parte.test.js
```

O teste `out-tsc/test/redux/paginacao/reducer-paginacao.test.js` é muito lento e fica fora da execução padrão; execute-o separadamente quando necessário.

Testes e2e (Cypress), executados contra o demo local:

```
npm run cy:open:local
npm run cy:run:local
```

## Linting e formatação

Para varrer o projeto em busca de erros (lint):

```
npm run lint
```

Para corrigir automaticamente o que for possível:

```
npm run format
```

## Build da biblioteca

Para gerar o pacote de distribuição em `dist/` (bundle, tipos TypeScript e validação do pacote):

```
npm run prepublish
```

Para verificar que a cópia privada do Quill não vaza do bundle:

```
npm run test:bundle-isolation
```

## Créditos

Este projeto partiu de muitas ideias do editor [Lexedit](https://legis.senado.leg.br/lexedit/), do projeto LexML, e do [Editor de Articulação](https://silegis-mg.github.io/editor-articulacao/) da Assembleia Legislativa de Minas Gerais, disponível como código aberto no [GitHub](https://github.com/silegis-mg/editor-articulacao). Desse último editor, devemos muito à sua abordagem moderna e amigável de edição.

Este componente segue as recomendações do [open-wc](https://github.com/open-wc/open-wc) e utiliza-se dos seguintes softwares e componentes, entre outros:

- [Lit](https://lit.dev/)
- [Quill](https://quilljs.com/docs/quickstart/)
- [Redux](https://redux.js.org/)
- [Shoelace](https://shoelace.style/)

## Patrocínio

- Câmara dos Deputados
- Senado Federal

## Contribua com o projeto

Toda ajuda é bem-vinda!
