/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from '@open-wc/testing';
import { render } from 'lit';
import { EditorComponent } from '../../../src/components/editor/editor.component';
import { StateType } from '../../../src/redux/state';

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

  it('Deveria ressincronizar o indicador de comentario ao remover o container de revisao', () => {
    const component = new EditorComponent() as any;
    const uuid = 987654;
    const idDispositivo = 'art1_cpt_inc1';
    const containerRevisao = document.createElement('div');
    const etapas: string[] = [];
    const linha: any = {
      lexmlId: idDispositivo,
      tipo: 'Inciso',
      containerRevisao: {
        remove: (): void => {
          etapas.push('removeu-revisao');
          linha.containerRevisao = undefined;
        },
      },
    };

    containerRevisao.id = `container__revisao${uuid}`;
    document.body.appendChild(containerRevisao);
    component._quill = { getLinha: (): any => linha };
    component.idsDispositivosComentadosSet = new Set([idDispositivo]);
    component.atualizarIndicadorComentarioLinha = (linhaRecebida: any, possuiComentario: boolean): void => {
      expect(linhaRecebida).to.equal(linha);
      expect(possuiComentario).to.be.true;
      etapas.push('sincronizou-comentario');
    };

    component.indicadorMarcaRevisao([
      {
        stateType: StateType.RevisaoAceita,
        elementos: [{ uuid, lexmlId: idDispositivo }],
      },
    ]);

    expect(etapas).to.deep.equal(['removeu-revisao', 'sincronizou-comentario']);
    containerRevisao.remove();
  });
});
