import { expect, fixture, html } from '@open-wc/testing';
import { EditorTextoRicoComponent, Usuario } from '../../../src';
import { ajustaHtmlFromEditor, ajustaHtmlToEditor } from '../../../src/components/editor-texto-rico/texto-rico-util';
import { rootStore } from '../../../src/redux/store';
import { ativarDesativarRevisaoAction } from '../../../src/model/lexml/acao/ativarDesativarRevisaoAction';
import { atualizarUsuarioAction } from '../../../src/model/lexml/acao/atualizarUsuarioAction';
import { ModoEdicaoEmenda } from '../../../src/model/emenda/emenda';
import { atualizaRevisaoTextoLivre } from '../../../src/redux/elemento/reducer/atualizaRevisaoTextoLivre';
import { Modo } from '../../../src/redux/elemento/enum/enumUtil';
import PrivateQuill from '../../../src/internal/quill/private-quill';
import { configurePrivateQuill } from '../../../src/internal/quill/configure-private-quill';

let editorTextoRico: EditorTextoRicoComponent;

const limparTooltipsRevisao = (): void => {
  document.querySelectorAll('.tooltip-revisao').forEach(el => el.remove());
};

const criarRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);

const definirRect = (el: HTMLElement, rect: DOMRect): void => {
  Object.defineProperty(el, 'getBoundingClientRect', { value: () => rect, configurable: true });
  Object.defineProperty(el, 'getClientRects', { value: () => [rect], configurable: true });
};

const htmlEditor =
  '<p>Parágrafo alinhado à esquerda.</p><p class="ql-align-center">Parágrafo centralizado.</p><p class="ql-align-right">Parágrafo alinhado à direita.</p><p class="ql-align-justify">Parágrafo justificado.</p><table table_id="h2tap0hfojd" border="1"><tr row_id="ghi2y63a2wp"><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="o2xtredkgr"><p>1</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="y3kpm6x0qp8"><p>2</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="mq6yrrboj9n"><p>3</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="0xai4ouu7g8" colspan="2" rowspan="1"><p>4 5</p></td><td cell_id="87sznwm1sm6" row_id="ghi2y63a2wp" table_id="h2tap0hfojd" merge_id="0xai4ouu7g8"><p><br></p></td></tr><tr row_id="u6x50lx471h"><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="u3bfb5o0u1q"><p>6</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="gun68mala0v" colspan="1" rowspan="2"><p>7</p><p>12</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="1347b2f1wgc"><p>8</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="897bot8bdtq"><p>9</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="3wis8gkd39v"><p>10</p></td></tr><tr row_id="tf6pmpb0u8"><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="2zcd2xzlgm4"><p>11</p></td><td cell_id="sij2a8lbxsn" row_id="tf6pmpb0u8" table_id="h2tap0hfojd" merge_id="gun68mala0v"><p><br></p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="gctz0gcm4no"><p>13</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="yvdp5cr7kb"><p>14</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="a34mcja4ld5"><p>15</p></td></tr></table><p>Parágrafo final.</p>';

const htmlEmenda =
  '<p>Parágrafo alinhado à esquerda.</p><p class="align-center">Parágrafo centralizado.</p><p class="align-right">Parágrafo alinhado à direita.</p><p class="align-justify">Parágrafo justificado.</p><table table_id="h2tap0hfojd" border="1"><tbody><tr row_id="ghi2y63a2wp"><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="o2xtredkgr"><p>1</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="y3kpm6x0qp8"><p>2</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="mq6yrrboj9n"><p>3</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="ghi2y63a2wp" cell_id="0xai4ouu7g8" colspan="2" rowspan="1"><p>4 5</p></td></tr><tr row_id="u6x50lx471h"><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="u3bfb5o0u1q"><p>6</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="gun68mala0v" colspan="1" rowspan="2"><p>7</p><p>12</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="1347b2f1wgc"><p>8</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="897bot8bdtq"><p>9</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="u6x50lx471h" cell_id="3wis8gkd39v"><p>10</p></td></tr><tr row_id="tf6pmpb0u8"><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="2zcd2xzlgm4"><p>11</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="gctz0gcm4no"><p>13</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="yvdp5cr7kb"><p>14</p></td><td class="td-q" table_id="h2tap0hfojd" row_id="tf6pmpb0u8" cell_id="a34mcja4ld5"><p>15</p></td></tr></tbody></table><p>Parágrafo final.</p>';

configurePrivateQuill();

describe('Testando funções de conversão de html', () => {
  it('"ajustaHtmlFromEditor" deveria retornar string sem classes de alinhamento iniciando com "ql-" e sem tags td com atributo "merge_id"', () => {
    expect(ajustaHtmlFromEditor(htmlEditor).match(/ql-(indent|align-justify|align-center|align-right)/g)).to.be.null;
    expect(ajustaHtmlFromEditor(htmlEditor).includes('merge_id')).to.be.false;
  });

  it('"ajustaHtmlToEditor" deveria retornar string com classes de alinhamento iniciando com "ql-"', () => {
    expect(ajustaHtmlToEditor(htmlEmenda).match(/ql-(indent|align-justify|align-center|align-right)/g)).not.to.be.null;
  });
});

describe('Testando lexml-emenda-editor-texto-rico (EditorTextoRicoComponent)', () => {
  beforeEach(async function () {
    // const projetoNorma = buildProjetoNormaFromJsonix(MPV_905_2019, true);
    // state = elementoReducer(undefined, { type: ABRIR_ARTICULACAO, articulacao: projetoNorma.articulacao!, classificacao: ModoEdicaoEmenda.EMENDA_TEXTO_LIVRE });
    editorTextoRico = await fixture<EditorTextoRicoComponent>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

    rootStore.getState().elementoReducer = {
      articulacao: undefined,
      modo: ModoEdicaoEmenda.EMENDA_TEXTO_LIVRE,
      past: [],
      present: [],
      future: [],
      ui: {
        events: [],
        alertas: [],
      },
      revisoes: [],
      emRevisao: undefined,
      numEventosPassadosAntesDaRevisao: 0,
    };

    const usuario = new Usuario();
    usuario.nome = 'Teste';
    rootStore.dispatch(atualizarUsuarioAction.execute(usuario));
  });

  afterEach(function () {
    limparTooltipsRevisao();
  });

  it('Deveria exibir o editor', () => {
    expect(editorTextoRico).to.not.be.null;
    expect(editorTextoRico).to.not.be.undefined;
    expect(editorTextoRico).to.be.an.instanceOf(EditorTextoRicoComponent);
  });

  it('Deveria exibir o botão de adicionar comentário desabilitado quando não houver seleção', () => {
    const botaoComentario = editorTextoRico.querySelector('button.ql-lexml-emenda-comentario') as HTMLButtonElement;

    expect(botaoComentario).to.not.be.null;
    expect(botaoComentario.disabled).to.be.true;
  });

  it('Deveria habilitar o botão de adicionar comentário e emitir evento quando houver seleção', async () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.onSelectionChange(editorTextoRico.quill?.getSelection());

    await new Promise(resolve => setTimeout(resolve, 0));

    const botaoComentario = editorTextoRico.querySelector('button.ql-lexml-emenda-comentario') as HTMLButtonElement;
    let eventDetail: any;
    editorTextoRico.addEventListener('abrir-modal-comentario', (ev: Event) => {
      eventDetail = (ev as CustomEvent).detail;
    });

    botaoComentario.click();

    expect(botaoComentario.disabled).to.be.false;
    expect(eventDetail?.range?.index).to.be.equal(0);
    expect(eventDetail?.range?.length).to.be.equal(5);
  });

  it('Deveria emitir evento para abrir a lista de comentarios pelo botao mobile', () => {
    const botaoListaComentarios = editorTextoRico.querySelector('.comentarios-mobile-button') as HTMLButtonElement;
    let eventDetail: any;
    editorTextoRico.addEventListener('abrir-modal-lista-comentarios', (ev: Event) => {
      eventDetail = (ev as CustomEvent).detail;
    });

    expect(botaoListaComentarios).to.not.be.null;
    botaoListaComentarios.click();
    expect(eventDetail?.modo).to.equal(editorTextoRico.modo);
  });

  it('Deveria marcar a seleção com tag de comentário', () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);

    const comentarioAdicionado = editorTextoRico.adicionarComentario('sc123');

    expect(comentarioAdicionado).to.be.true;
    expect(editorTextoRico.texto).to.include('<comentario id-sequencia-comentario="sc123">Texto</comentario>');
  });

  it('Deveria remover comentário do trecho marcado', () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.adicionarComentario('sc123');

    const comentarioRemovido = editorTextoRico.removerComentario('sc123');

    expect(comentarioRemovido).to.be.true;
    expect(editorTextoRico.texto).to.not.include('<comentario');
    expect(editorTextoRico.getTextoComentario('sc123')).to.equal('');
  });

  it('Deveria indicar que comentário não existe quando o trecho marcado for apagado', () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.adicionarComentario('sc123');

    expect(editorTextoRico.possuiComentario('sc123')).to.be.true;

    editorTextoRico.quill?.deleteText(0, 5, 'user');

    expect(editorTextoRico.possuiComentario('sc123')).to.be.false;
  });

  it('Deveria preservar espaços do trecho comentado', () => {
    editorTextoRico.setContent('<p>AB</p>');
    editorTextoRico.quill?.insertText(1, '   ', 'api');
    editorTextoRico.quill?.setSelection(1, 3);

    editorTextoRico.adicionarComentario('sc123');

    expect(editorTextoRico.getTextoComentario('sc123')).to.equal('   ');
  });

  it('Deveria informar a posição inicial do comentário no texto', () => {
    editorTextoRico.setContent('<p>Antes texto depois.</p>');
    editorTextoRico.quill?.setSelection(6, 5);

    editorTextoRico.adicionarComentario('sc123');

    expect(editorTextoRico.getIndiceComentario('sc123')).to.equal(6);
  });

  it('Deveria posicionar o cursor no início do comentário', () => {
    editorTextoRico.setContent('<p>Antes texto depois.</p>');
    editorTextoRico.quill?.setSelection(6, 5);
    editorTextoRico.adicionarComentario('sc123');
    editorTextoRico.quill?.setSelection(0, 0);

    const cursorPosicionado = editorTextoRico.posicionarCursorComentario('sc123');

    expect(cursorPosicionado).to.be.true;
    expect(editorTextoRico.quill?.getSelection()?.index).to.equal(6);
    expect(editorTextoRico.quill?.getSelection()?.length).to.equal(0);
    expect(editorTextoRico.quill!.root.querySelector('comentario')?.classList.contains('comentario-selecionado')).to.be.true;
  });

  it('Deveria centralizar o comentário no editor ao posicionar o cursor', () => {
    editorTextoRico.setContent('<p>Antes texto depois.</p>');
    editorTextoRico.quill?.setSelection(6, 5);
    editorTextoRico.adicionarComentario('sc123');

    const root = editorTextoRico.quill!.root as HTMLElement;
    const comentario = root.querySelector('comentario') as HTMLElement;
    let scrollTopCentralizado = 0;
    definirRect(root, criarRect(0, 0, 500, 200));
    definirRect(comentario, criarRect(0, 300, 120, 20));
    Object.defineProperty(root, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(root, 'scrollTop', { value: 100, writable: true, configurable: true });
    Object.defineProperty(root, 'scrollTo', {
      value: (options: ScrollToOptions): void => {
        scrollTopCentralizado = Number(options.top);
      },
      configurable: true,
    });
    (editorTextoRico.quill as any).scrollingContainer = root;

    editorTextoRico.posicionarCursorComentario('sc123');

    expect(scrollTopCentralizado).to.equal(310);
  });

  it('Não deveria limpar comentário selecionado quando o editor perder foco', async () => {
    editorTextoRico.setContent('<p>Antes texto depois.</p>');
    editorTextoRico.quill?.setSelection(6, 5);
    editorTextoRico.adicionarComentario('sc123');
    await new Promise(resolve => setTimeout(resolve, 0));

    const comentario = editorTextoRico.quill!.root.querySelector('comentario') as HTMLElement;
    comentario.classList.add('comentario-selecionado');
    let eventoDisparado = false;
    editorTextoRico.addEventListener('comentario-selecionado', () => {
      eventoDisparado = true;
    });

    editorTextoRico.onSelectionChange(null);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(eventoDisparado).to.be.false;
    expect(comentario.classList.contains('comentario-selecionado')).to.be.true;
  });

  it('Deveria emitir evento com a sequência de comentário sob o cursor', async () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.adicionarComentario('sc123');
    let detalheEvento: any;
    editorTextoRico.addEventListener('comentario-selecionado', (ev: Event) => {
      detalheEvento = (ev as CustomEvent).detail;
    });

    editorTextoRico.quill?.setSelection(2, 0);
    editorTextoRico.onSelectionChange(editorTextoRico.quill?.getSelection());

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(detalheEvento?.idSequenciaComentario).to.equal('sc123');
    expect(detalheEvento?.modo).to.equal(editorTextoRico.modo);
  });

  it('Deveria destacar comentario quando o cursor estiver no inicio do trecho comentado', async () => {
    editorTextoRico.setContent('<p>Antes texto depois.</p>');
    editorTextoRico.quill?.setSelection(6, 5);
    editorTextoRico.adicionarComentario('sc123');
    let detalheEvento: any;
    editorTextoRico.addEventListener('comentario-selecionado', (ev: Event) => {
      detalheEvento = (ev as CustomEvent).detail;
    });

    editorTextoRico.quill?.setSelection(6, 0);
    editorTextoRico.onSelectionChange(editorTextoRico.quill?.getSelection());

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(detalheEvento?.idSequenciaComentario).to.equal('sc123');
    expect(editorTextoRico.quill!.root.querySelector('comentario')?.classList.contains('comentario-selecionado')).to.be.true;
  });

  it('Deveria preservar marcação de comentário ao carregar conteúdo no editor', () => {
    editorTextoRico.setContent('<p><comentario id-sequencia-comentario="sc123">Texto comentado</comentario></p>');

    expect(editorTextoRico.possuiComentario('sc123')).to.be.true;
    expect(editorTextoRico.getTextoComentario('sc123')).to.equal('Texto comentado');
  });

  it('Não deveria colar marcação de comentário copiada do editor', async () => {
    editorTextoRico.setContent('<p>Início fim.</p>');
    editorTextoRico.quill?.setSelection(7, 0);

    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<p><comentario id-sequencia-comentario="sc123">texto comentado</comentario></p>');
    clipboardData.setData('text/plain', 'texto comentado');
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData,
    });

    editorTextoRico.quill?.root.dispatchEvent(pasteEvent);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(editorTextoRico.texto).to.include('texto comentado');
    expect(editorTextoRico.texto).to.not.include('<comentario');
    expect(editorTextoRico.possuiComentario('sc123')).to.be.false;
  });

  it('Deveria desabilitar o botão de adicionar comentário quando a seleção já possuir comentário', async () => {
    editorTextoRico.setContent('<p>Texto para comentário.</p>');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.adicionarComentario('sc123');
    editorTextoRico.quill?.setSelection(0, 5);
    editorTextoRico.onSelectionChange(editorTextoRico.quill?.getSelection());

    await new Promise(resolve => setTimeout(resolve, 0));

    const botaoComentario = editorTextoRico.querySelector('button.ql-lexml-emenda-comentario') as HTMLButtonElement;

    expect(botaoComentario.disabled).to.be.true;
  });

  it('Deveria manter comentario quando trecho comentado for marcado como excluido em revisao', async () => {
    editorTextoRico.setContent('<p>Texto comentado normal.</p>');
    editorTextoRico.quill?.setSelection(0, 15);
    editorTextoRico.adicionarComentario('sc123');
    (editorTextoRico.quill as any)?.revisao?.setEmRevisao(true);

    editorTextoRico.quill?.deleteText(6, 16, 'user');

    await new Promise(resolve => setTimeout(resolve, 0));

    const ops = editorTextoRico.quill?.getContents(6, 16).ops || [];

    expect(ops.some((op: any) => op.attributes?.comentario === 'sc123' && op.attributes?.removed)).to.be.true;
    expect(ops.some((op: any) => !op.attributes?.comentario && op.attributes?.removed)).to.be.true;
    expect(editorTextoRico.getTextoComentario('sc123')).to.be.equal('Texto comentado');
  });

  it('Deveria remontar trecho comentado sem espacos artificiais quando palavra for dividida por revisao', async () => {
    const texto = 'malasessadaasdasdsdasduada';
    editorTextoRico.setContent(`<p>${texto}</p>`);
    editorTextoRico.quill?.setSelection(0, texto.length);
    editorTextoRico.adicionarComentario('sc123');
    (editorTextoRico.quill as any)?.revisao?.setEmRevisao(true);

    editorTextoRico.quill?.deleteText(10, 4, 'user');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(editorTextoRico.getTextoComentario('sc123')).to.be.equal(texto);
  });

  it('Deveria preservar comentario ao aceitar insercao dentro de trecho comentado', async () => {
    editorTextoRico.setContent('<p>Texto base.</p>');
    editorTextoRico.quill?.setSelection(0, 10);
    editorTextoRico.adicionarComentario('sc123');
    (editorTextoRico.quill as any)?.revisao?.setEmRevisao(true);

    editorTextoRico.quill?.insertText(6, 'novo ', 'user');

    await new Promise(resolve => setTimeout(resolve, 0));

    const ins = editorTextoRico.quill?.root.querySelector('ins') as HTMLElement;
    (editorTextoRico.quill as any)?.revisao?.revisar([ins], true);

    expect(editorTextoRico.quill?.root.querySelector('ins')).to.be.null;
    expect(editorTextoRico.getTextoComentario('sc123')).to.be.equal('Texto novo base');
  });

  it('Deveria preservar comentario ao rejeitar exclusao dentro de trecho comentado', async () => {
    editorTextoRico.setContent('<p>Texto base.</p>');
    editorTextoRico.quill?.setSelection(0, 10);
    editorTextoRico.adicionarComentario('sc123');
    (editorTextoRico.quill as any)?.revisao?.setEmRevisao(true);

    editorTextoRico.quill?.deleteText(6, 4, 'user');

    await new Promise(resolve => setTimeout(resolve, 0));

    const del = editorTextoRico.quill?.root.querySelector('del') as HTMLElement;
    (editorTextoRico.quill as any)?.revisao?.revisar([del], false);

    expect(editorTextoRico.quill?.root.querySelector('del')).to.be.null;
    expect(editorTextoRico.getTextoComentario('sc123')).to.be.equal('Texto base');
  });

  it('Deveria permitir adicionar comentario a partir do tooltip de revisao', () => {
    editorTextoRico.modo = Modo.JUSTIFICATIVA;
    editorTextoRico.setContent('<p>Texto <del usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">excluido</del> normal.</p>');

    const del = editorTextoRico.quill?.root.querySelector('del') as HTMLElement;
    let eventDetail: any;
    editorTextoRico.addEventListener('abrir-modal-comentario', (ev: Event) => {
      eventDetail = (ev as CustomEvent).detail;
    });

    del.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const botaoComentarioRevisao = document.body.querySelector('#button-adicionar-comentario-revisao') as HTMLButtonElement;

    expect(botaoComentarioRevisao).to.not.be.null;
    expect(botaoComentarioRevisao.querySelector('#comentario-plus')).to.not.be.null;
    botaoComentarioRevisao.click();
    expect(eventDetail?.modo).to.be.equal(Modo.JUSTIFICATIVA);
    expect(eventDetail?.range?.index).to.be.equal(6);
    expect(eventDetail?.range?.length).to.be.equal(del.textContent?.length);
    expect(editorTextoRico.quill?.getSelection()?.index).to.be.equal(eventDetail.range.index);
    expect(editorTextoRico.quill?.getSelection()?.length).to.be.equal(eventDetail.range.length);
  });

  it('Nao deveria selecionar texto normal entre fragmentos de uma mesma revisao ao adicionar comentario pelo tooltip', () => {
    editorTextoRico.modo = Modo.JUSTIFICATIVA;
    editorTextoRico.setContent(
      '<p><del usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">primeiro</del> normal <del usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">segundo</del></p>'
    );

    const del = editorTextoRico.quill?.root.querySelector('del') as HTMLElement;
    let eventDetail: any;
    editorTextoRico.addEventListener('abrir-modal-comentario', (ev: Event) => {
      eventDetail = (ev as CustomEvent).detail;
    });

    del.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const botaoComentarioRevisao = document.body.querySelector('#button-adicionar-comentario-revisao') as HTMLButtonElement;
    botaoComentarioRevisao.click();

    expect(eventDetail?.range?.index).to.be.equal(0);
    expect(eventDetail?.range?.length).to.be.equal('primeiro'.length);
    expect(eventDetail?.texto).to.be.equal('primeiro');
  });

  it('Deveria marcar fragmentos continuos da mesma revisao para remover moldura interna', async () => {
    editorTextoRico.modo = Modo.JUSTIFICATIVA;
    editorTextoRico.setContent(
      '<p>Mauris ege<comentario id-sequencia-comentario="sc123">t euismod <ins usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">12</ins></comentario><ins usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">3456</ins>ma</p>'
    );

    const fragmentos = Array.from(editorTextoRico.quill?.root.querySelectorAll('ins') || []) as HTMLElement[];
    const blotPrimeiroFragmento = PrivateQuill.find(fragmentos[0]);
    const indexDentroPrimeiroFragmento = editorTextoRico.quill!.getIndex(blotPrimeiroFragmento) + 1;
    editorTextoRico.quill?.setSelection(indexDentroPrimeiroFragmento, 0);
    editorTextoRico.onSelectionChange({ index: indexDentroPrimeiroFragmento, length: 0 });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fragmentos[0].classList.contains('revisao-fragmento-continua-proximo')).to.be.true;
    expect(fragmentos[1].classList.contains('revisao-fragmento-continua-anterior')).to.be.true;
  });

  it('Deveria centralizar tooltip sobre fragmentos continuos da mesma revisao na mesma linha', () => {
    editorTextoRico.modo = Modo.JUSTIFICATIVA;
    editorTextoRico.setContent(
      '<p>Mauris ege<comentario id-sequencia-comentario="sc123">t euismod <ins usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">12</ins></comentario><ins usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">3456</ins>ma</p>'
    );

    const fragmentos = Array.from(editorTextoRico.quill?.root.querySelectorAll('ins') || []) as HTMLElement[];
    definirRect(fragmentos[0], criarRect(300, 50, 20, 16));
    definirRect(fragmentos[1], criarRect(320, 50, 60, 16));

    fragmentos[0].dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: 58 }));

    const tooltip = document.body.querySelector('.tooltip-revisao') as HTMLElement;
    const centroTooltip = Number.parseFloat(tooltip.style.left) - window.scrollX + tooltip.clientWidth / 2;

    expect(centroTooltip).to.be.closeTo(340, 1);
  });

  it('Nao deveria exibir botao de adicionar comentario no tooltip quando revisao ja possuir comentario', () => {
    editorTextoRico.setContent('<p>Texto <del usuario="Teste" date="2026-05-19 13:00:00" id-revisao="rev1">excluido</del> normal.</p>');
    editorTextoRico.quill?.setSelection(6, 4);
    editorTextoRico.adicionarComentario('sc123');

    const del = editorTextoRico.quill?.root.querySelector('del') as HTMLElement;

    del.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.body.querySelector('#button-adicionar-comentario-revisao')).to.be.null;
  });

  it('Deveria simular o click no botão de inserir tabela', async () => {
    const tabela = editorTextoRico.querySelector('.ql-table .ql-picker-label');
    tabela?.dispatchEvent(new Event('mousedown'));
    expect(tabela).to.not.be.null;
  });

  describe('Testando inicialização de texto no editor', () => {
    beforeEach(function () {
      editorTextoRico.setContent(htmlEmenda);
    });

    it('HTML deveria possuir classes de alinhamento iniciando com "ql-"', () => {
      const html = editorTextoRico.quill?.root.innerHTML || '';
      expect(html.includes('ql-align-center')).to.be.true;
      expect(html.includes('ql-align-justify')).to.be.true;
      expect(html.includes('ql-align-right')).to.be.true;
    });

    it('HTML deveria possuir 1 tabela', () => {
      expect(editorTextoRico.quill?.root.innerHTML.match(/<table/g)?.length).to.be.equal(1);
    });

    it('HTML deveria possuir 2 tags td com atributo "merge_id"', () => {
      expect(editorTextoRico.quill?.root.innerHTML.match(/<td[^>]*\smerge_id="[^"]*"[^>]*>/g)?.length).to.be.equal(2);
    });

    it('Deveria possuir html "ajustado" igual a htmlEmenda', () => {
      expect(ajustaHtmlFromEditor(editorTextoRico.quill?.root.innerHTML)).to.be.equal(htmlEmenda);
    });
  });

  describe('Testando atributos das marcas de revisao no texto rico', () => {
    const textoComRevisao = '<p>Texto <del usuario="Teste" date="2026-05-13 10:00:00" id-revisao="1">Contratto</del></p>';

    const validarSpellcheckDoTextoExcluido = (): void => {
      const del = editorTextoRico.quill?.root.querySelector('del');
      expect(del?.getAttribute('spellcheck')).to.be.equal('false');

      editorTextoRico.updateApenasTexto();

      expect(editorTextoRico.texto).to.not.include('spellcheck');
    };

    it('Texto excluido da justificativa deveria desabilitar spellcheck apenas no DOM do editor', () => {
      editorTextoRico.modo = Modo.JUSTIFICATIVA;
      editorTextoRico.setContent(textoComRevisao);

      validarSpellcheckDoTextoExcluido();
    });

    it('Texto excluido do texto livre deveria desabilitar spellcheck apenas no DOM do editor', () => {
      editorTextoRico.modo = Modo.TEXTO_LIVRE;
      editorTextoRico.setContent(textoComRevisao);

      validarSpellcheckDoTextoExcluido();
    });
  });

  describe('Testando inclusão de tabela com 2 linhas e 2 colunas', () => {
    beforeEach(function () {
      const el = editorTextoRico.querySelector('span.ql-table span[data-value="newtable_2_2"]')! as any;
      el.click();
    });

    it('Deveria possuir tabela com 2 linhas e 2 colunas', () => {
      const html = editorTextoRico.quill?.root.innerHTML;
      const nTables = html?.match(/<table/g)?.length;
      const nRows = html?.match(/<tr/g)?.length;
      const nCols = html?.match(/<td/g)?.length;
      expect(nTables).to.be.equal(1);
      expect(nRows).to.be.equal(2);
      expect(nCols).to.be.equal(4);
    });
  });

  describe('Testando revisão de texto', () => {
    describe('Inicializando texto no editor', () => {
      beforeEach(function () {
        editorTextoRico.setContent('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
        rootStore.dispatch(ativarDesativarRevisaoAction.execute());
      });

      afterEach(function () {
        atualizaRevisaoTextoLivre(rootStore.getState().elementoReducer, true);
        rootStore.dispatch(ativarDesativarRevisaoAction.execute());
        expect(rootStore.getState().elementoReducer.emRevisao).to.be.false;
        expect(editorTextoRico.textoAntesRevisao).to.be.undefined;
      });

      it('Deveria apresentar atributo texto com valor "<p>Parágrafo 1</p><p>Parágrafo 2</p>"', () => {
        expect(editorTextoRico.texto).to.be.equal('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
      });

      it('Deveria apresentar atributo textoAntesRevisao igual a undefined', () => {
        expect(editorTextoRico.textoAntesRevisao).to.be.undefined;
      });

      it('Atributo "emRevisao" deveria ser true', () => {
        expect(rootStore.getState().elementoReducer.emRevisao).to.be.true;
      });

      describe('Ativando revisão e alterando texto', () => {
        it('Deveria estar em modo de revisão e apresentar textoAntesRevisao igual a "<p>Parágrafo 1</p><p>Parágrafo 2</p>" *', () => {
          editorTextoRico.quill?.insertText(0, 'TESTE');
          expect(editorTextoRico.texto).to.be.equal('<p>TESTEParágrafo 1</p><p>Parágrafo 2</p>');
          // expect(editorTextoRico.textoAntesRevisao).to.be.equal('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
        });
      });

      describe('Ativando revisão, alterando texto e desfazendo alteração', () => {
        it('Deveria estar em modo de revisão e apresentar textoAntesRevisao igual a "<p>Parágrafo 1</p><p>Parágrafo 2</p>" **', () => {
          editorTextoRico.quill?.insertText(0, 'TESTE');
          expect(editorTextoRico.texto).to.be.equal('<p>TESTEParágrafo 1</p><p>Parágrafo 2</p>');
          // expect(editorTextoRico.textoAntesRevisao).to.be.equal('<p>Parágrafo 1</p><p>Parágrafo 2</p>');

          editorTextoRico.quill?.deleteText(0, 5);
          // expect(editorTextoRico.textoAntesRevisao).to.be.equal('<p>Parágrafo 1</p><p>Parágrafo 2</p>'); // Continua igual porque as revisões ainda não foram aceitas
          expect(editorTextoRico.texto).to.be.equal('<p>Parágrafo 1</p><p>Parágrafo 2</p>');
        });
      });
    });
  });
});
