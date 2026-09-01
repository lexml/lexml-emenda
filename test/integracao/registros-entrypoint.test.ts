import { expect } from '@open-wc/testing';

const tagsRegistradas = [
  'emenda-dividida-modal',
  'lexml-emenda',
  'lexml-emenda-ajuda',
  'lexml-emenda-ajuda-modal',
  'lexml-emenda-alertas',
  'lexml-emenda-alterar-largura-imagem-modal',
  'lexml-emenda-alterar-largura-tabela-coluna-modal',
  'lexml-emenda-articulacao',
  'lexml-emenda-atalhos',
  'lexml-emenda-atalhos-modal',
  'lexml-emenda-autocomplete',
  'lexml-emenda-autocomplete-async',
  'lexml-emenda-autocomplete-norma',
  'lexml-emenda-autoria',
  'lexml-emenda-comando',
  'lexml-emenda-comando-modal',
  'lexml-emenda-data',
  'lexml-emenda-destino',
  'lexml-emenda-editor-texto-rico',
  'lexml-emenda-elemento',
  'lexml-emenda-eta',
  'lexml-emenda-opcoes-impressao',
  'lexml-emenda-substituicao-termo',
  'lexml-emenda-sufixos-modal',
  'lexml-emenda-switch-revisao',
  'lexml-eta-editor',
];

describe('Registros do entrypoint público', () => {
  it('mantém registrados todos os Web Components necessários', async () => {
    await import('../../src/index');

    tagsRegistradas.forEach(tag => expect(customElements.get(tag), `Componente <${tag}> não registrado`).to.be.a('function'));
  });
});
