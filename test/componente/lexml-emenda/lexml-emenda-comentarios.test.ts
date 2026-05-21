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

const criarSequenciaComentarioComId = (id: string, ...comentarios: Comentario[]): SequenciaComentario => Object.assign(criarSequenciaComentario(...comentarios), { id });

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

  it('Deveria habilitar o botão de comentar apenas quando houver texto válido no modal', () => {
    const component = new LexmlEmendaComponent() as any;
    const textarea = { value: '   ' };
    Object.defineProperty(component, 'comentarioTextarea', { value: textarea, configurable: true });

    component.atualizarContadorComentario();

    expect(component.tamanhoTextoModalComentario).to.equal(3);
    expect(component.comentarioModalPossuiTexto).to.be.false;

    textarea.value = ' Comentário ';
    component.atualizarContadorComentario();

    expect(component.tamanhoTextoModalComentario).to.equal(12);
    expect(component.comentarioModalPossuiTexto).to.be.true;
  });

  it('Deveria abrir modal de resposta para a sequência selecionada', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];

    let tituloModal = '';
    let textoInicial = 'mantem se nao limpar';
    component.abrirModalComentario = (titulo: string, texto = ''): void => {
      tituloModal = titulo;
      textoInicial = texto;
    };

    component.abrirModalResponderComentario('sc1');

    expect(component.acaoModalComentario).to.equal('responder');
    expect(component.idSequenciaComentarioRespostaAtual).to.equal('sc1');
    expect(component.comentarioEdicaoAtual).to.be.undefined;
    expect(tituloModal).to.equal('Responder comentário');
    expect(textoInicial).to.equal('');
  });

  it('Deveria adicionar resposta como último comentário da sequência selecionada', () => {
    const component = new LexmlEmendaComponent() as any;
    const sequenciaAlvo = criarSequenciaComentarioComId('sc1', criarComentario('Texto original'));
    const outraSequencia = criarSequenciaComentarioComId('sc2', criarComentario('Outro comentário'));
    component.sequenciasComentario = [sequenciaAlvo, outraSequencia];
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    component.formatarDataHoraComentario = (): string => '2026-05-20 14:30:00';
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: ' Nova resposta ' }, configurable: true });

    component.responderComentarioSelecionado();

    expect(component.sequenciasComentario[0].comentarios).to.have.length(2);
    expect(component.sequenciasComentario[0].comentarios[1].texto).to.equal('Nova resposta');
    expect(component.sequenciasComentario[0].comentarios[1].dataHora).to.equal('2026-05-20 14:30:00');
    expect(component.sequenciasComentario[0].comentarios[1].usuario.nome).to.equal('Fulano');
    expect(component.sequenciasComentario[1].comentarios).to.have.length(1);
  });

  it('Não deveria adicionar resposta com texto vazio', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: '   ' }, configurable: true });

    component.responderComentarioSelecionado();

    expect(component.sequenciasComentario[0].comentarios).to.have.length(1);
  });

  it('Deveria abrir modal de confirmação para excluir sequência de comentários', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];

    let modalAberto = false;
    Object.defineProperty(component, 'excluirSequenciaComentarioModal', {
      value: {
        show: (): void => {
          modalAberto = true;
        },
      },
      configurable: true,
    });

    component.abrirModalExcluirSequenciaComentario('sc1');

    expect(component.idSequenciaComentarioExclusaoAtual).to.equal('sc1');
    expect(modalAberto).to.be.true;
  });

  it('Deveria excluir sequência confirmada e remover marcação do editor', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [
      criarSequenciaComentarioComId('sc1', criarComentario('Texto original')),
      criarSequenciaComentarioComId('sc2', criarComentario('Outro comentário')),
    ];
    component.idSequenciaComentarioExclusaoAtual = 'sc1';
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    component.comentarioEdicaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 0 };

    let idComentarioRemovido = '';
    let modalFechado = false;
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        removerComentario: (idSequenciaComentario: string): boolean => {
          idComentarioRemovido = idSequenciaComentario;
          return true;
        },
      },
      configurable: true,
    });
    Object.defineProperty(component, 'excluirSequenciaComentarioModal', {
      value: {
        hide: (): void => {
          modalFechado = true;
        },
      },
      configurable: true,
    });

    component.confirmarExcluirSequenciaComentario();

    expect(component.sequenciasComentario.map((seq: SequenciaComentario) => seq.id)).to.deep.equal(['sc2']);
    expect(idComentarioRemovido).to.equal('sc1');
    expect(component.idSequenciaComentarioExclusaoAtual).to.be.undefined;
    expect(component.idSequenciaComentarioRespostaAtual).to.be.undefined;
    expect(component.comentarioEdicaoAtual).to.be.undefined;
    expect(modalFechado).to.be.true;
  });

  it('Deveria excluir sequência de comentários quando a marcação não existir mais no texto', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [
      criarSequenciaComentarioComId('sc1', criarComentario('Texto apagado')),
      criarSequenciaComentarioComId('sc2', criarComentario('Texto mantido')),
    ];
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    component.comentarioEdicaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 0 };
    component.idSequenciaComentarioExclusaoAtual = 'sc1';
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        possuiComentario: (idSequenciaComentario: string): boolean => idSequenciaComentario === 'sc2',
      },
      configurable: true,
    });

    component.sincronizarSequenciasComentarioComTexto();

    expect(component.sequenciasComentario.map((seq: SequenciaComentario) => seq.id)).to.deep.equal(['sc2']);
    expect(component.idSequenciaComentarioRespostaAtual).to.be.undefined;
    expect(component.comentarioEdicaoAtual).to.be.undefined;
    expect(component.idSequenciaComentarioExclusaoAtual).to.be.undefined;
  });

  it('Não deveria excluir sequência quando o editor ainda não informar a existência da marcação', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        possuiComentario: (): undefined => undefined,
      },
      configurable: true,
    });

    component.sincronizarSequenciasComentarioComTexto();

    expect(component.sequenciasComentario.map((seq: SequenciaComentario) => seq.id)).to.deep.equal(['sc1']);
  });

  it('Deveria preservar espaços como trecho comentado localizado', () => {
    const component = new LexmlEmendaComponent() as any;
    const sequencia = criarSequenciaComentarioComId('sc1', criarComentario('Comentário'));
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        getTextoComentario: (): string => '   ',
      },
      configurable: true,
    });

    expect(component.getTrechoComentario(sequencia)).to.equal('   ');
  });
});
