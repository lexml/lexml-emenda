import { expect, fixture, html } from '@open-wc/testing';
import 'quill/dist/quill';
import PrivateQuill from '../../src/internal/quill/private-quill';
import { QuillRuntime } from '../../src/internal/quill/quill-types';
import { EtaQuill } from '../../src/util/eta-quill/eta-quill';

const AppQuill = (window as unknown as { Quill: typeof QuillRuntime }).Quill;

interface AppQuillSnapshot {
  imports: Record<string, any>;
  importEntries: Map<string, unknown>;
  icons: Record<string, any>;
  iconEntries: Map<string, unknown>;
  parchment: Record<string, any>;
  parchmentKeys: string[];
}

const snapshotAppQuill = (quill: typeof QuillRuntime): AppQuillSnapshot => {
  const imports = (quill as any).imports;
  const icons = quill.import('ui/icons');
  const parchment = quill.import('parchment');

  return {
    imports,
    importEntries: new Map(Object.entries(imports)),
    icons,
    iconEntries: new Map(Object.entries(icons)),
    parchment,
    parchmentKeys: Object.keys(parchment),
  };
};

const expectAppQuillUnchanged = (snapshot: ReturnType<typeof snapshotAppQuill>): void => {
  expect(snapshot.imports).to.equal((AppQuill as any).imports);
  expect(Object.keys(snapshot.imports)).to.deep.equal([...snapshot.importEntries.keys()]);
  snapshot.importEntries.forEach((definition, path) => expect(snapshot.imports[path]).to.equal(definition));
  expect(Object.keys(snapshot.icons)).to.deep.equal([...snapshot.iconEntries.keys()]);
  snapshot.iconEntries.forEach((icon, name) => expect(snapshot.icons[name]).to.equal(icon));
  expect(AppQuill.import('parchment')).to.equal(snapshot.parchment);
  expect(Object.keys(snapshot.parchment)).to.deep.equal(snapshot.parchmentKeys);
};

const createAppQuillWithDifferentVersion = (): typeof QuillRuntime => {
  class AppQuillDifferentVersion extends AppQuill {}

  (AppQuillDifferentVersion as any).imports = { ...(AppQuill as any).imports };
  (AppQuillDifferentVersion as any).version = '2.0.3-test-runtime';
  return AppQuillDifferentVersion as unknown as typeof QuillRuntime;
};

describe('Isolamento definitivo do Quill', () => {
  before(async () => {
    await import('../../src/index');
  });

  it('isola a biblioteca do Quill da aplicação na mesma versão, inclusive para nomes conflitantes', () => {
    class ModuloDaAplicacao {}
    const Parchment = AppQuill.import('parchment');
    const formatoDaAplicacao = new Parchment.Attributor.Class('estiloTextoAplicacao', 'estilo-texto-aplicacao', { scope: Parchment.Scope.INLINE });

    const snapshot = snapshotAppQuill(AppQuill);
    AppQuill.register('modules/revisao', ModuloDaAplicacao, true);
    AppQuill.register('formats/estilo-texto', formatoDaAplicacao, true);

    try {
      expect(PrivateQuill).to.not.equal(AppQuill);
      expect(PrivateQuill.import('modules/revisao')).to.not.equal(ModuloDaAplicacao);
      expect(PrivateQuill.import('formats/estilo-texto')).to.not.equal(formatoDaAplicacao);
      expect(AppQuill.import('modules/revisao')).to.equal(ModuloDaAplicacao);
      expect(AppQuill.import('formats/estilo-texto')).to.equal(formatoDaAplicacao);
    } finally {
      Object.assign((AppQuill as any).imports, Object.fromEntries(snapshot.importEntries));
      Object.keys((AppQuill as any).imports)
        .filter(path => !snapshot.importEntries.has(path))
        .forEach(path => delete (AppQuill as any).imports[path]);
    }

    expectAppQuillUnchanged(snapshot);
  });

  it('não depende do runtime da aplicação quando ele declara outra versão', () => {
    class ModuloDaAplicacao {}
    const appQuillOutraVersao = createAppQuillWithDifferentVersion();

    appQuillOutraVersao.register('modules/revisao', ModuloDaAplicacao, true);
    const importsAntes = new Map(Object.entries((appQuillOutraVersao as any).imports));

    expect((appQuillOutraVersao as any).version).to.equal('2.0.3-test-runtime');
    expect(appQuillOutraVersao.import('modules/revisao')).to.equal(ModuloDaAplicacao);
    expect(PrivateQuill.import('modules/revisao')).to.not.equal(ModuloDaAplicacao);
    expect(Object.keys((appQuillOutraVersao as any).imports)).to.deep.equal([...importsAntes.keys()]);
  });

  it('mantém dois editores ricos da biblioteca simultâneos', async () => {
    const primeiro = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);
    const segundo = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

    try {
      primeiro.quill.setText('Primeiro editor');
      segundo.quill.setText('Segundo editor');

      expect(primeiro.quill.constructor).to.equal(PrivateQuill);
      expect(segundo.quill.constructor).to.equal(PrivateQuill);
      expect(primeiro.quill.getText()).to.equal('Primeiro editor\n');
      expect(segundo.quill.getText()).to.equal('Segundo editor\n');
    } finally {
      primeiro.remove();
      segundo.remove();
    }
  });

  it('mantém editor estruturado e editor rico simultâneos', async () => {
    const estruturadoHtml = document.createElement('div');
    const bufferHtml = document.createElement('div');
    document.body.append(estruturadoHtml, bufferHtml);
    const rico = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

    try {
      const estruturado = new EtaQuill(estruturadoHtml, bufferHtml, {});
      estruturado.setText('Estruturado');
      rico.quill.setText('Rico');

      expect(estruturado.constructor).to.equal(EtaQuill);
      expect(rico.quill.constructor).to.equal(PrivateQuill);
      expect(estruturado.getText()).to.equal('Estruturado\n');
      expect(rico.quill.getText()).to.equal('Rico\n');
    } finally {
      estruturadoHtml.remove();
      bufferHtml.remove();
      rico.remove();
    }
  });

  it('permite criar, destruir e recriar editores sem alterar o Quill da aplicação', async () => {
    const snapshot = snapshotAppQuill(AppQuill);
    const primeiro = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);
    primeiro.quill.setText('Primeira criação');
    primeiro.remove();

    const segundo = await fixture<any>(html`<lexml-emenda-editor-texto-rico></lexml-emenda-editor-texto-rico>`);

    try {
      segundo.quill.setText('Segunda criação');
      expect(segundo.quill.getText()).to.equal('Segunda criação\n');
      expectAppQuillUnchanged(snapshot);
    } finally {
      segundo.remove();
    }
  });
});
