/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from '@open-wc/testing';
import { LexmlEmendaComponent } from '../../../src/components/lexml-emenda.component';
import { Comentario, SequenciaComentario, TipoLocalComentario } from '../../../src/model/emenda/emenda';
import { Usuario } from '../../../src/model/revisao/usuario';
import { rootStore } from '../../../src/redux/store';
import { createArticulacao, criaDispositivo } from '../../../src/model/lexml/dispositivo/dispositivoLexmlFactory';
import { TipoDispositivo } from '../../../src/model/lexml/tipo/tipoDispositivo';

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

const criarSequenciaComentarioEmenta = (): SequenciaComentario =>
  Object.assign(criarSequenciaComentarioComId('scEmenta', criarComentario('Comentário da ementa')), {
    local: TipoLocalComentario.TEXTO,
    idDispositivo: 'ementa',
  });

const criarArticulacaoComEmenta = (): any => {
  const articulacao = createArticulacao();
  const ementa = criaDispositivo(articulacao, TipoDispositivo.ementa.tipo);
  articulacao.removeFilho(ementa);
  ementa.pai = articulacao;
  ementa.id = 'ementa';
  ementa.texto = 'Texto original da ementa';
  articulacao.projetoNorma = { ementa } as any;
  return { articulacao, ementa };
};

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

  it('Deveria preservar espaços internos e quebras de linha do comentário', () => {
    const component = new LexmlEmendaComponent() as any;
    const texto = 'Vou adicionar 3 pontos:\n\n-Ponto 1: tudo ok\n  -Ponto 2: tudo certo';
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: texto }, configurable: true });

    component.responderComentarioSelecionado();

    expect(component.sequenciasComentario[0].comentarios[1].texto).to.equal(texto);
  });

  it('Não deveria adicionar resposta com texto vazio', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'))];
    component.idSequenciaComentarioRespostaAtual = 'sc1';
    Object.defineProperty(component, 'comentarioTextarea', { value: { value: '   ' }, configurable: true });

    component.responderComentarioSelecionado();

    expect(component.sequenciasComentario[0].comentarios).to.have.length(1);
  });

  it('Deveria ordenar comentários pelos mais recentes considerando a última resposta', () => {
    const component = new LexmlEmendaComponent() as any;
    const sequenciaComRespostaRecente = criarSequenciaComentarioComId('sc1', criarComentario('Comentário antigo'), criarComentario('Resposta recente'));
    sequenciaComRespostaRecente.comentarios[0].dataHora = '2026-05-20 10:00:00';
    sequenciaComRespostaRecente.comentarios[1].dataHora = '2026-05-22 09:00:00';
    const sequenciaRecenteSemResposta = criarSequenciaComentarioComId('sc2', criarComentario('Comentário recente'));
    sequenciaRecenteSemResposta.comentarios[0].dataHora = '2026-05-21 18:00:00';
    const sequenciaAntiga = criarSequenciaComentarioComId('sc3', criarComentario('Comentário antigo'));
    sequenciaAntiga.comentarios[0].dataHora = '2026-05-19 08:00:00';
    component.sequenciasComentario = [sequenciaAntiga, sequenciaRecenteSemResposta, sequenciaComRespostaRecente];
    component.ordenacaoComentarios = 'recentes';

    const idsOrdenados = component.getSequenciasComentarioOrdenadas().map((seq: SequenciaComentario) => seq.id);

    expect(idsOrdenados).to.deep.equal(['sc1', 'sc2', 'sc3']);
  });

  it('Deveria ordenar comentários por apresentação no texto, priorizando texto livre antes da justificação', () => {
    const component = new LexmlEmendaComponent() as any;
    const sequenciaJustificacao = criarSequenciaComentarioComId('scJustificacao', criarComentario('Comentário na justificação'));
    const sequenciaTextoDepois = Object.assign(criarSequenciaComentarioComId('scTextoDepois', criarComentario('Comentário no texto depois')), { local: TipoLocalComentario.TEXTO });
    const sequenciaTextoAntes = Object.assign(criarSequenciaComentarioComId('scTextoAntes', criarComentario('Comentário no texto antes')), { local: TipoLocalComentario.TEXTO });
    component.sequenciasComentario = [sequenciaJustificacao, sequenciaTextoDepois, sequenciaTextoAntes];
    component.ordenacaoComentarios = 'texto';
    Object.defineProperty(component, '_lexmlEmendaTextoRico', {
      value: {
        getIndiceComentario: (idSequenciaComentario: string): number => ({ scTextoDepois: 30, scTextoAntes: 5 }[idSequenciaComentario] ?? 0),
      },
      configurable: true,
    });
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        getIndiceComentario: (): number => 0,
      },
      configurable: true,
    });

    const idsOrdenados = component.getSequenciasComentarioOrdenadas().map((seq: SequenciaComentario) => seq.id);

    expect(idsOrdenados).to.deep.equal(['scTextoAntes', 'scTextoDepois', 'scJustificacao']);
  });

  it('Deveria alterar a ordenação selecionada na aba de comentários', () => {
    const component = new LexmlEmendaComponent() as any;

    component.alterarOrdenacaoComentarios({ target: { value: 'texto' } } as any);

    expect(component.ordenacaoComentarios).to.equal('texto');

    component.alterarOrdenacaoComentarios({ target: { value: 'recentes' } } as any);

    expect(component.ordenacaoComentarios).to.equal('recentes');
  });

  it('Deveria destacar comentário atual e solicitar rolagem quando a aba de comentários estiver ativa', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    let solicitouRolagem = false;
    component.isAbaComentariosAtiva = (): boolean => true;
    component.rolarParaComentarioAtual = (): void => {
      solicitouRolagem = true;
    };

    component.atualizarComentarioAtual(new CustomEvent('comentario-selecionado', { detail: { idSequenciaComentario: 'sc1' } }));

    expect(component.idSequenciaComentarioAtual).to.equal('sc1');
    expect(solicitouRolagem).to.be.true;
  });

  it('Deveria limpar destaque quando o cursor sair de um trecho comentado', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    component.idSequenciaComentarioAtual = 'sc1';

    component.atualizarComentarioAtual(new CustomEvent('comentario-selecionado', { detail: {} }));

    expect(component.idSequenciaComentarioAtual).to.be.undefined;
  });

  it('Deveria abrir modal responsiva da lista de comentarios', async () => {
    const component = new LexmlEmendaComponent() as any;
    let modalAberto = false;
    Object.defineProperty(component, 'listaComentariosModal', {
      value: {
        show: (): void => {
          modalAberto = true;
        },
      },
      configurable: true,
    });
    Object.defineProperty(component, 'updateComplete', { value: Promise.resolve(true), configurable: true });
    component.rolarParaComentarioAtual = (): void => undefined;

    component.abrirModalListaComentarios();
    await component.updateComplete;

    expect(modalAberto).to.be.true;
  });

  it('Deveria abrir a modal responsiva com o comentario do texto selecionado pelo icone', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    component.isModoMobileOuTablet = (): boolean => true;
    let modalAberto = false;
    let abaDesktopAberta = false;
    component.abrirModalListaComentarios = (): void => {
      modalAberto = true;
    };
    Object.defineProperty(component, '_tabsDireita', {
      value: {
        show: (): void => {
          abaDesktopAberta = true;
        },
      },
      configurable: true,
    });

    component.atualizarComentarioAtual(
      new CustomEvent('comentario-selecionado', {
        detail: { idSequenciaComentario: 'sc1', abrirAbaComentarios: true },
      })
    );

    expect(component.idSequenciaComentarioAtual).to.equal('sc1');
    expect(modalAberto).to.be.true;
    expect(abaDesktopAberta).to.be.false;
  });

  it('Deveria abrir a modal responsiva com o comentario do dispositivo selecionado pelo icone', () => {
    const component = new LexmlEmendaComponent() as any;
    const sequenciaDispositivo = Object.assign(criarSequenciaComentarioComId('scDispositivo', criarComentario('Comentario do inciso')), {
      local: TipoLocalComentario.TEXTO,
      idDispositivo: 'art1_inc1',
    });
    component.sequenciasComentario = [sequenciaDispositivo];
    component.isModoMobileOuTablet = (): boolean => true;
    component.atualizarIdDispositivoSequenciaComentario = (): void => undefined;
    let modalAberto = false;
    component.abrirModalListaComentarios = (): void => {
      modalAberto = true;
    };

    component.selecionarComentarioArticulacaoPorDispositivo(
      new CustomEvent('selecionar-comentario-articulacao', {
        detail: { idDispositivo: 'art1_inc1' },
      })
    );

    expect(component.idSequenciaComentarioAtual).to.equal('scDispositivo');
    expect(modalAberto).to.be.true;
  });

  it('Deveria manter a abertura da aba lateral ao selecionar comentario pelo icone no desktop', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    component.isModoMobileOuTablet = (): boolean => false;
    let abaAberta = '';
    let solicitouRolagem = false;
    Object.defineProperty(component, '_tabsDireita', {
      value: {
        show: (aba: string): void => {
          abaAberta = aba;
        },
      },
      configurable: true,
    });
    component.rolarParaComentarioAtual = (): void => {
      solicitouRolagem = true;
    };

    component.atualizarComentarioAtual(
      new CustomEvent('comentario-selecionado', {
        detail: { idSequenciaComentario: 'sc1', abrirAbaComentarios: true },
      })
    );

    expect(abaAberta).to.equal('comentarios');
    expect(solicitouRolagem).to.be.true;
  });

  it('Deveria selecionar sequencia clicada, abrir justificativa e posicionar cursor no comentario', async () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    component.isAbaComentariosAtiva = (): boolean => false;
    let abaAberta = '';
    let comentarioPosicionado = '';
    Object.defineProperty(component, '_tabsEsquerda', {
      value: {
        show: (aba: string): void => {
          abaAberta = aba;
        },
      },
      configurable: true,
    });
    Object.defineProperty(component, '_lexmlJustificativa', {
      value: {
        posicionarCursorComentario: (idSequenciaComentario: string): boolean => {
          comentarioPosicionado = idSequenciaComentario;
          return true;
        },
      },
      configurable: true,
    });

    component.selecionarSequenciaComentario('sc1');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.idSequenciaComentarioAtual).to.equal('sc1');
    expect(abaAberta).to.equal('justificativa');
    expect(comentarioPosicionado).to.equal('sc1');
  });

  it('Deveria abrir texto livre ao selecionar comentario no texto', async () => {
    const component = new LexmlEmendaComponent() as any;
    const sequenciaTexto = Object.assign(criarSequenciaComentarioComId('scTexto', criarComentario('Texto original')), { local: TipoLocalComentario.TEXTO });
    component.sequenciasComentario = [sequenciaTexto];
    component.isAbaComentariosAtiva = (): boolean => false;
    let abaAberta = '';
    let comentarioPosicionado = '';
    Object.defineProperty(component, '_tabsEsquerda', {
      value: {
        show: (aba: string): void => {
          abaAberta = aba;
        },
      },
      configurable: true,
    });
    Object.defineProperty(component, '_lexmlEmendaTextoRico', {
      value: {
        posicionarCursorComentario: (idSequenciaComentario: string): boolean => {
          comentarioPosicionado = idSequenciaComentario;
          return true;
        },
      },
      configurable: true,
    });

    component.selecionarSequenciaComentario('scTexto');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(abaAberta).to.equal('lexml-emenda-eta');
    expect(comentarioPosicionado).to.equal('scTexto');
  });

  it('Nao deveria selecionar sequencia ao clicar em acao interna do card', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Texto original'))];
    const botao = document.createElement('button');

    component.selecionarSequenciaComentario('sc1', { target: botao } as any);

    expect(component.idSequenciaComentarioAtual).to.be.undefined;
  });

  it('Deveria navegar para proxima sequencia com seta para baixo', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Primeiro')), criarSequenciaComentarioComId('sc2', criarComentario('Segundo'))];
    let preventDefaultChamado = false;
    let abaAberta = '';
    Object.defineProperty(component, '_tabsEsquerda', {
      value: {
        show: (aba: string): void => {
          abaAberta = aba;
        },
      },
      configurable: true,
    });

    component.navegarSequenciaComentarioPorTeclado(
      {
        key: 'ArrowDown',
        preventDefault: (): void => {
          preventDefaultChamado = true;
        },
        target: document.createElement('article'),
      } as any,
      'sc1'
    );

    expect(preventDefaultChamado).to.be.true;
    expect(component.idSequenciaComentarioAtual).to.equal('sc2');
    expect(abaAberta).to.equal('justificativa');
  });

  it('Deveria navegar para sequencia anterior com seta para cima', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentarioComId('sc1', criarComentario('Primeiro')), criarSequenciaComentarioComId('sc2', criarComentario('Segundo'))];
    let preventDefaultChamado = false;

    component.navegarSequenciaComentarioPorTeclado(
      {
        key: 'ArrowUp',
        preventDefault: (): void => {
          preventDefaultChamado = true;
        },
        target: document.createElement('article'),
      } as any,
      'sc2'
    );

    expect(preventDefaultChamado).to.be.true;
    expect(component.idSequenciaComentarioAtual).to.equal('sc1');
  });

  it('Deveria abrir modal de confirmação para excluir comentário do usuário', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'), criarComentario('Resposta original'))];

    let modalAberto = false;
    Object.defineProperty(component, 'excluirComentarioModal', {
      value: {
        show: (): void => {
          modalAberto = true;
        },
      },
      configurable: true,
    });

    component.abrirModalExcluirComentario('sc1', 1);

    expect(component.comentarioExclusaoAtual).to.deep.equal({ idSequenciaComentario: 'sc1', indexComentario: 1 });
    expect(modalAberto).to.be.true;
  });

  it('Não deveria abrir modal para excluir comentário de outro usuário ou sequência com único comentário', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [
      criarSequenciaComentarioComId('sc1', criarComentario('Texto original')),
      criarSequenciaComentarioComId('sc2', criarComentario('Comentário próprio'), criarComentario('Comentário de outro usuário', criarUsuario('u2', 'Beltrano'))),
    ];

    let modalAberto = false;
    Object.defineProperty(component, 'excluirComentarioModal', {
      value: {
        show: (): void => {
          modalAberto = true;
        },
      },
      configurable: true,
    });

    component.abrirModalExcluirComentario('sc1', 0);
    component.abrirModalExcluirComentario('sc2', 1);

    expect(component.comentarioExclusaoAtual).to.be.undefined;
    expect(modalAberto).to.be.false;
  });

  it('Deveria excluir apenas o comentário confirmado mantendo a sequência', () => {
    const component = new LexmlEmendaComponent() as any;
    component.sequenciasComentario = [criarSequenciaComentario(criarComentario('Texto original'), criarComentario('Resposta removida'), criarComentario('Resposta mantida'))];
    component.comentarioExclusaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 1 };
    component.comentarioEdicaoAtual = { idSequenciaComentario: 'sc1', indexComentario: 1 };

    let modalFechado = false;
    Object.defineProperty(component, 'excluirComentarioModal', {
      value: {
        hide: (): void => {
          modalFechado = true;
        },
      },
      configurable: true,
    });

    component.confirmarExcluirComentario();

    expect(component.sequenciasComentario).to.have.length(1);
    expect(component.sequenciasComentario[0].comentarios.map((comentario: Comentario) => comentario.texto)).to.deep.equal(['Texto original', 'Resposta mantida']);
    expect(component.comentarioExclusaoAtual).to.be.undefined;
    expect(component.comentarioEdicaoAtual).to.be.undefined;
    expect(modalFechado).to.be.true;
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

  it('Deveria usar o id estável da ementa para recuperar o indicador do comentário', () => {
    const component = new LexmlEmendaComponent() as any;
    const { articulacao, ementa } = criarArticulacaoComEmenta();
    const sequencia = criarSequenciaComentarioEmenta();
    (rootStore.getState() as any).elementoReducer = { ...rootStore.getState().elementoReducer, articulacao };
    component.sequenciasComentario = [sequencia];
    component.uuid2DispositivoPorSequenciaComentario.set(sequencia.id, 'uuid-obsoleto');

    component.restaurarReferenciasComentariosArticulacao();

    expect(component.uuid2DispositivoPorSequenciaComentario.has(sequencia.id)).to.be.false;
    expect(component.getIdsDispositivosComentados()).to.deep.equal(['ementa']);
    expect(component.getDispositivoComentarioArticulacao(sequencia)).to.equal(ementa);
    expect(component.getSequenciaComentarioPorDispositivo('ementa', ementa.uuid2)).to.equal(sequencia);
  });

  it('Não deveria excluir o comentário da ementa após editar seu texto e sincronizar para salvar', () => {
    const component = new LexmlEmendaComponent() as any;
    const { articulacao, ementa } = criarArticulacaoComEmenta();
    const sequencia = criarSequenciaComentarioEmenta();
    (rootStore.getState() as any).elementoReducer = { ...rootStore.getState().elementoReducer, articulacao };
    component.sequenciasComentario = [sequencia];
    component.uuid2DispositivoPorSequenciaComentario.set(sequencia.id, 'uuid-obsoleto');

    ementa.texto = 'Texto da ementa alterado manualmente';
    component.sincronizarReferenciasComentariosArticulacao(true);

    expect(component.sequenciasComentario).to.have.length(1);
    expect(component.sequenciasComentario[0].id).to.equal('scEmenta');
    expect(component.sequenciasComentario[0].idDispositivo).to.equal('ementa');
    expect(component.getIdsDispositivosComentados()).to.deep.equal(['ementa']);
  });

  it('Deveria formatar a identificacao do item ate o artigo sem sinais editoriais nem agrupadores', () => {
    const component = new LexmlEmendaComponent() as any;
    const articulacao = createArticulacao();
    const capitulo = criaDispositivo(articulacao, TipoDispositivo.capitulo.tipo);
    capitulo.rotulo = 'CAPÍTULO II';
    const artigo = criaDispositivo(capitulo, TipoDispositivo.artigo.tipo) as any;
    artigo.numero = '2';
    artigo.createRotulo(artigo);
    const inciso = criaDispositivo(artigo.caput, TipoDispositivo.inciso.tipo);
    inciso.numero = '2-1';
    inciso.createRotulo(inciso);
    const alinea = criaDispositivo(inciso, TipoDispositivo.alinea.tipo);
    alinea.numero = '2';
    alinea.createRotulo(alinea);
    const item = criaDispositivo(alinea, TipoDispositivo.item.tipo);
    item.numero = '1';
    item.createRotulo(item);

    expect(component.formatarIdentificacaoDispositivo(item)).to.equal('item 1 da alínea “b” do inciso II-1 do art. 2º');
  });

  it('Deveria formatar artigo sem ponto final nem agrupadores superiores', () => {
    const component = new LexmlEmendaComponent() as any;
    const articulacao = createArticulacao();
    const secao = criaDispositivo(articulacao, TipoDispositivo.secao.tipo);
    secao.rotulo = 'Seção I';
    const artigo = criaDispositivo(secao, TipoDispositivo.artigo.tipo);
    artigo.numero = '13';
    artigo.createRotulo(artigo);

    expect(component.formatarIdentificacaoDispositivo(artigo)).to.equal('art. 13');
  });

  it('Deveria formatar a hierarquia de agrupadores com capitalizacao e preposicoes corretas', () => {
    const component = new LexmlEmendaComponent() as any;
    const articulacao = createArticulacao();
    const parte = criaDispositivo(articulacao, TipoDispositivo.parte.tipo);
    parte.rotulo = 'PARTE ÚNICA';
    const livro = criaDispositivo(parte, TipoDispositivo.livro.tipo);
    livro.rotulo = 'LIVRO ÚNICO';
    const titulo = criaDispositivo(livro, TipoDispositivo.titulo.tipo);
    titulo.rotulo = 'TÍTULO ÚNICO';
    const capitulo = criaDispositivo(titulo, TipoDispositivo.capitulo.tipo);
    capitulo.rotulo = 'CAPÍTULO I';
    const secao = criaDispositivo(capitulo, TipoDispositivo.secao.tipo);
    secao.rotulo = 'Seção Única';
    const subsecao = criaDispositivo(secao, TipoDispositivo.subsecao.tipo);
    subsecao.rotulo = 'Subseção Única';

    expect(component.formatarIdentificacaoDispositivo(subsecao)).to.equal('Subseção Única da Seção Única do Capítulo I do Título Único do Livro Único da Parte Única');
  });
});
