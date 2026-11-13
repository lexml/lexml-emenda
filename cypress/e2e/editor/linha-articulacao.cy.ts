// A linha raiz da articulação (exibida antes da ementa) não pode receber o cursor (#37).

const getQuill = (): Cypress.Chainable<any> => cy.get('lexml-eta-editor').then($editor => ($editor[0] as any).quill);

// Tipo da linha onde está a seleção atual do Quill
const getTipoLinhaDaSelecao = (quill: any): string | undefined => {
  const range = quill.getSelection();
  return range ? quill.getLine(range.index)[0]?.linha?.tipo : undefined;
};

const getIndexConteudo = (quill: any, linha: any): number => quill.getIndex(linha.blotConteudo);

const pressionarSetaParaCima = (quill: any): void => {
  quill.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
};

const checarSelecaoNoInicioDaPrimeiraLinhaDeConteudo = (tipoEsperado: string): void => {
  getQuill().should(quill => {
    const primeiraLinhaDeConteudo = quill.getPrimeiraLinha().next;
    expect(primeiraLinhaDeConteudo.tipo).to.equal(tipoEsperado);
    expect(getTipoLinhaDaSelecao(quill)).to.equal(tipoEsperado);
    expect(quill.getSelection().index).to.equal(getIndexConteudo(quill, primeiraLinhaDeConteudo));
    expect(quill.linhaAtual.tipo).to.equal(tipoEsperado);
  });
  cy.get('div.container__elemento--articulacao').should('not.have.class', 'container__elemento--ativo');
};

const posicionarCursorNaLinhaRaiz = (): void => {
  getQuill().then(quill => {
    quill.setSelection(getIndexConteudo(quill, quill.getPrimeiraLinha()), 0, 'user');
  });
};

const posicionarCursorNoInicioDaPrimeiraLinhaDeConteudo = (): void => {
  getQuill().then(quill => {
    quill.setSelection(getIndexConteudo(quill, quill.getPrimeiraLinha().next), 0, 'user');
  });
};

describe('Linha raiz da articulação', () => {
  describe('Emenda padrão (com ementa)', () => {
    beforeEach(() => {
      cy.novaEmenda({ projetoNormaSelectValue: 'mpv_905_2019', modoEmendaSelectValue: 'emenda' });
      cy.checarEstadoInicialAoCriarNovaEmendaPadrao({ nomeProposicao: 'MPV 905/2019', totalElementos: 563 });
    });

    it('seleção na linha raiz é levada para o início da ementa', () => {
      posicionarCursorNoInicioDaPrimeiraLinhaDeConteudo();
      posicionarCursorNaLinhaRaiz();
      checarSelecaoNoInicioDaPrimeiraLinhaDeConteudo('Ementa');
    });

    it('clique na linha raiz não deixa o cursor nela nem permite texto antes da ementa', () => {
      cy.get('div.container__elemento--articulacao p.texto__dispositivo').click({ force: true });
      getQuill().should(quill => {
        expect(getTipoLinhaDaSelecao(quill)).not.to.equal('Articulacao');
      });
      cy.get('div.container__elemento--articulacao p.texto__dispositivo').invoke('text').should('equal', '');
    });

    it('seta para cima no início da ementa mantém o cursor na ementa', () => {
      posicionarCursorNoInicioDaPrimeiraLinhaDeConteudo();
      getQuill().then(quill => pressionarSetaParaCima(quill));
      checarSelecaoNoInicioDaPrimeiraLinhaDeConteudo('Ementa');
    });
  });

  describe('Emenda "artigo onde couber" (sem ementa)', () => {
    beforeEach(() => {
      cy.novaEmenda({ projetoNormaSelectValue: 'mpv_905_2019', modoEmendaSelectValue: 'emendaArtigoOndeCouber' });
      cy.checarEstadoInicialAoCriarNovaEmendaOndeCouber({ nomeProposicao: 'MPV 905/2019', totalElementos: 2 });
    });

    it('seleção na linha raiz é levada para o início do primeiro dispositivo', () => {
      posicionarCursorNaLinhaRaiz();
      checarSelecaoNoInicioDaPrimeiraLinhaDeConteudo('Artigo');
    });

    it('seta para cima no início do primeiro dispositivo mantém o cursor nele', () => {
      posicionarCursorNoInicioDaPrimeiraLinhaDeConteudo();
      getQuill().then(quill => pressionarSetaParaCima(quill));
      checarSelecaoNoInicioDaPrimeiraLinhaDeConteudo('Artigo');
    });
  });
});
