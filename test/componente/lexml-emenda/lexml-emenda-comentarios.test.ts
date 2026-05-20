import { expect } from '@open-wc/testing';
import { LexmlEmendaComponent } from '../../../src/components/lexml-emenda.component';
import { Comentario, SequenciaComentario, TipoLocalComentario } from '../../../src/model/emenda/emenda';
import { Usuario } from '../../../src/model/revisao/usuario';
import { rootStore } from '../../../src/redux/store';

const criarUsuario = (id: string, nome: string): Usuario => Object.assign(new Usuario(), { id, nome });

const criarComentario = (texto: string, usuario = criarUsuario('u1', 'Fulano')): Comentario =>
  Object.assign(new Comentario(), {
    usuario,
    dataHora: '2026-05-20 13:45:00',
    texto,
  });

const criarSequenciaComentario = (...comentarios: Comentario[]): SequenciaComentario =>
  Object.assign(new SequenciaComentario(), {
    id: 'sc1',
    local: TipoLocalComentario.JUSTIFICACAO,
    comentarios,
  });

describe('LexmlEmendaComponent - comentários', () => {
  let elementoReducerAnterior: any;

  beforeEach(() => {
    elementoReducerAnterior = rootStore.getState().elementoReducer;
    (rootStore.getState() as any).elementoReducer = {
      ...(elementoReducerAnterior || {}),
      usuario: criarUsuario('u1', 'Fulano'),
    };
  });

  afterEach(() => {
    (rootStore.getState() as any).elementoReducer = elementoReducerAnterior;
  });

  it('Deveria abrir modal de edição com o texto atual do comentário do usuário', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];

    let tituloModal = '';
    let textoInicial = '';
    component.abrirModalComentario = (titulo: string, texto: string): void => {
      tituloModal = titulo;
      textoInicial = texto;
    };

    component.abrirModalEditarComentario('sc1', 0);

    expect(component.acaoModalComentario).to.equal('editar');
    expect(component.comentarioEdicaoAtual).to.deep.equal({ idSequenciaComentario: 'sc1', indexComentario: 0 });
    expect(tituloModal).to.equal('Editar comentário');
    expect(textoInicial).to.equal('Texto original');
  });

  it('Não deveria abrir modal de edição para comentário de outro usuário', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original', criarUsuario('u2', 'Beltrano')))];

    let modalAberto = false;
    component.abrirModalComentario = (): void => {
      modalAberto = true;
    };

    component.abrirModalEditarComentario('sc1', 0);

    expect(modalAberto).to.be.false;
    expect(component.comentarioEdicaoAtual).to.be.undefined;
  });

  it('Deveria atualizar apenas o texto do comentário selecionado', () => {
    const component = new LexmlEmendaComponent() as any;
    const comentarioOriginal = criarComentario('Texto original');
    const resposta = criarComentario('Resposta original');
    component.sequenciasComentario = [criarSequenciaComentario(comentarioOriginal, resposta)];
    component.comentarioEdicaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 0 };
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: ' Texto atualizado ' }, configurable: true });

    component.editarComentarioSelecionado();

    const comentarios = component.sequenciasComentario[0].comentarios;
    expect(comentarios[0].texto).to.equal('Texto atualizado');
    expect(comentarios[0].usuario).to.equal(comentarioOriginal.usuario);
    expect(comentarios[0].dataHora).to.equal(comentarioOriginal.dataHora);
    expect(comentarios[1].texto).to.equal('Resposta original');
  });

  it('Não deveria atualizar comentário com texto vazio', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];
    component.comentarioEdicaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 0 };
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: '   ' }, configurable: true });

    component.editarComentarioSelecionado();

    expect(component.sequenciasComentario[0].comentarios[0].texto).to.equal('Texto original');
  });
});
