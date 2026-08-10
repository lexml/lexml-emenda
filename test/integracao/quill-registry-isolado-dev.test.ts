import { expect, fixture, html } from '@open-wc/testing';
import 'quill/dist/quill';
import PrivateQuill from '../../src/internal/quill/private-quill';
import { QuillRuntime } from '../../src/internal/quill/quill-types';

const Quill = (window as unknown as { Quill: typeof QuillRuntime }).Quill;

describe('Isolamento do registry do Quill em desenvolvimento e testes', () => {
  it('a aplicação e a biblioteca usam registries distintos', async () => {
    class ModuloDaAplicacao {}

    Quill.register('modules/modulo-da-aplicacao-caracterizacao', ModuloDaAplicacao, true);
    const registryDaAplicacao = (Quill as any).imports;
    const modulosDaAplicacaoAntes = Object.keys(registryDaAplicacao);

    await import('../../src/index');

    expect(PrivateQuill).to.not.equal(Quill);
    expect((PrivateQuill as any).imports).to.not.equal(registryDaAplicacao);
    expect((Quill as any).imports).to.equal(registryDaAplicacao);
    expect(Quill.import('modules/modulo-da-aplicacao-caracterizacao')).to.equal(ModuloDaAplicacao);
    expect(Object.keys(registryDaAplicacao)).to.deep.equal(modulosDaAplicacaoAntes);
    expect((Quill as any).imports['modules/aspasCurvas']).to.be.undefined;
    expect(PrivateQuill.import('modules/aspasCurvas')).to.exist;
    expect(PrivateQuill.import('modules/revisao')).to.exist;
    expect(PrivateQuill.import('modules/notaRodape')).to.exist;
  });

  it('a inicialização do editor não sobrescreve o keyboard registrado pela aplicação', async () => {
    class KeyboardDaAplicacao {}

    const keyboardOriginalDaAplicacao = Quill.import('modules/keyboard');

    try {
      Quill.register('modules/keyboard', KeyboardDaAplicacao, true);
      expect(Quill.import('modules/keyboard')).to.equal(KeyboardDaAplicacao);

      await import('../../src/index');
      const editor = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

      expect(editor.quill).to.exist;
      expect(editor.quill.constructor).to.equal(PrivateQuill);
      expect(Quill.import('modules/keyboard')).to.equal(KeyboardDaAplicacao);
      expect(PrivateQuill.import('modules/keyboard')).to.not.equal(KeyboardDaAplicacao);
    } finally {
      Quill.register('modules/keyboard', keyboardOriginalDaAplicacao, true);
    }
  });

  it('permite criar, editar, destruir e recriar o editor com o comportamento atual', async () => {
    await import('../../src/index');

    const primeiroEditor = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);
    expect(primeiroEditor.quill).to.exist;

    primeiroEditor.quill.setText('Texto de caracterização');
    expect(primeiroEditor.quill.getText()).to.equal('Texto de caracterização\n');

    primeiroEditor.remove();
    expect(primeiroEditor.isConnected).to.be.false;

    const segundoEditor = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);
    expect(segundoEditor.quill).to.exist;
    segundoEditor.quill.setText('Editor recriado');
    expect(segundoEditor.quill.getText()).to.equal('Editor recriado\n');
  });

  it('mantém o editor da aplicação e o editor rico da biblioteca funcionais simultaneamente', async () => {
    await import('../../src/index');

    const containerDaAplicacao = document.createElement('div');
    document.body.appendChild(containerDaAplicacao);

    try {
      const editorDaAplicacao = new Quill(containerDaAplicacao, {});
      const editorDaBiblioteca = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

      editorDaAplicacao.setText('Texto da aplicação');
      editorDaBiblioteca.quill.setText('Texto da biblioteca');

      expect(editorDaAplicacao.constructor).to.equal(Quill);
      expect(editorDaBiblioteca.quill.constructor).to.equal(PrivateQuill);
      expect(editorDaAplicacao.getText()).to.equal('Texto da aplicação\n');
      expect(editorDaBiblioteca.quill.getText()).to.equal('Texto da biblioteca\n');
      expect(PrivateQuill.import('modules/table')).to.exist;
      expect((PrivateQuill as any).imports['formats/table']).to.exist;
      expect((PrivateQuill as any).imports['formats/tr']).to.exist;
      expect((PrivateQuill as any).imports['formats/td']).to.exist;
      expect((Quill as any).imports['modules/table']).to.be.undefined;
      expect((Quill as any).imports['formats/table']).to.be.undefined;
      expect((Quill as any).imports['formats/tr']).to.be.undefined;
      expect((Quill as any).imports['formats/td']).to.be.undefined;
    } finally {
      containerDaAplicacao.remove();
    }
  });
});
