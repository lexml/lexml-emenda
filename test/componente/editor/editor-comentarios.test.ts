/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from '@open-wc/testing';
import { render } from 'lit';
import { EditorComponent } from '../../../src/components/editor/editor.component';

describe('EditorComponent - comentarios responsivos', () => {
  it('Deveria exibir o botao de comentarios na barra mobile e emitir o evento para abrir a modal', () => {
    const component = new EditorComponent() as any;
    const container = document.createElement('div');
    render(component.render(), container);

    const botaoComentarios = container.querySelector('.mobile-buttons .btn-comentarios') as HTMLButtonElement;
    const botaoComando = container.querySelector('.mobile-buttons .btn-comando') as HTMLButtonElement;
    const iconeComentarios = botaoComentarios?.querySelector('sl-icon');
    let eventoEmitido = false;
    component.addEventListener('abrir-modal-lista-comentarios', () => {
      eventoEmitido = true;
    });

    expect(botaoComentarios).to.not.be.null;
    expect(botaoComentarios.compareDocumentPosition(botaoComando) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(0);
    expect(iconeComentarios?.getAttribute('name')).to.equal('chat-left-text');
    botaoComentarios.click();
    expect(eventoEmitido).to.be.true;
  });
});
