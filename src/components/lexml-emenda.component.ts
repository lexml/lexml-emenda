import { Usuario } from './../model/revisao/usuario';
import '@shoelace-style/shoelace/dist/components/badge/badge';
import '@shoelace-style/shoelace/dist/components/button/button';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/icon/icon';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel';
import '@shoelace-style/shoelace/dist/components/tab/tab';

import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { connect } from 'pwa-helpers';

import { editorStyles } from '../assets/css/editor.css';
import { quillSnowStyles } from '../assets/css/quill.snow.css';
import { shoelaceLightThemeStyles } from '../assets/css/shoelace.theme.light.css';

import { adicionarAlerta } from '../model/alerta/acao/adicionarAlerta';
import { removerAlerta } from '../model/alerta/acao/removerAlerta';
import {
  Autoria,
  ColegiadoApreciador,
  Comentario,
  Emenda,
  Epigrafe,
  ModoEdicaoEmenda,
  Parlamentar,
  RefProposicaoEmendada,
  OpcoesImpressao,
  SubstituicaoTermo,
  SequenciaComentario,
  TipoLocalComentario,
} from '../model/emenda/emenda';
import { buildFakeUrn, getAno, getNumero, getSigla, getTipo } from '../model/lexml/documento/urnUtil';
import { rootStore } from '../redux/store';
import { ClassificacaoDocumento } from './../model/documento/classificacao';
import { Dispositivo } from '../model/dispositivo/dispositivo';
import { Elemento } from '../model/elemento';
import { ProjetoNorma } from './../model/lexml/documento/projetoNorma';
import { ComandoEmendaComponent } from './comandoEmenda/comandoEmenda.component';
import { ComandoEmendaModalComponent } from './comandoEmenda/comandoEmenda.modal.component';
import { LexmlEtaComponent } from './lexml-eta.component';
import { limparAlertas } from '../model/alerta/acao/limparAlertas';
import { LexmlEmendaConfig } from '../model/lexmlEmendaConfig';
import { atualizarUsuarioAction } from '../model/lexml/acao/atualizarUsuarioAction';
import { getQuantidadeRevisoesAll, isRevisaoElemento, mostrarDialogDisclaimerRevisao, ordernarRevisoes, removeAtributosDoElemento } from '../redux/elemento/util/revisaoUtil';
import { Revisao, RevisaoElemento } from '../model/revisao/revisao';
import { ativarDesativarRevisaoAction } from '../model/lexml/acao/ativarDesativarRevisaoAction';
import { StateEvent, StateType } from '../redux/state';
import { limparRevisaoAction } from '../model/lexml/acao/limparRevisoes';
import { aplicarAlteracoesEmendaAction } from '../model/lexml/acao/aplicarAlteracoesEmenda';
import { buildContent, getUrn } from '../model/lexml/documento/conversor/buildProjetoNormaFromJsonix';
import { buscaDispositivoById, findDispositivoByUuid2 } from '../model/lexml/hierarquia/hierarquiaUtil';
import { TipoDispositivo } from '../model/lexml/tipo/tipoDispositivo';
import { createElemento, getElementos } from '../model/elemento/elementoUtil';
import { generoFromLetra } from '../model/dispositivo/genero';
import { Comissao } from './destino/comissao';
import { SubstituicaoTermoComponent } from './substituicao-termo/substituicao-termo.component';
import { NOTA_RODAPE_CHANGE_EVENT, NOTA_RODAPE_REMOVE_EVENT, NotaRodape } from './editor-texto-rico/notaRodape';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { DestinoComponent } from './destino/destino.component';
import { errorInicializarEdicaoAction } from '../model/lexml/acao/errorInicializarEdicaoAction';
import { isHtmlSemTexto } from '../util/string-util';
import { ConfiguracaoPaginacao } from '../model/paginacao/paginacao';
import { TipoMensagem } from '../model/lexml/util/mensagem';
import { iconeComentario } from '../../assets/icons/icons';

export interface DispositivoBloqueado {
  lexmlId: string;
  bloquearFilhos: boolean;
  motivoBloqueio?: string;
}

type TipoCasaLegislativa = 'SF' | 'CD' | 'CN';

/**
 * Parâmetros de inicialização de edição de documento
 */
export class LexmlEmendaParametrosEdicao {
  modo = 'emenda';

  // Identificação da proposição (texto) emendado.
  // Opcional se for informada a emenda ou o projetoNorma
  proposicao?: {
    sigla: string;
    numero: string;
    ano: string;
    ementa: string;
  };

  // Preenchido automaticamente se for informada a emenda ou o projetoNorma
  ementa = '';

  // Indicação de matéria orçamentária. Utilizado inicalmente para definir destino de emenda a MP
  isMateriaOrcamentaria = false;

  // Texto json da proposição para emenda ou edição estruturada (modo 'emenda' ou 'edicao')
  // Obrigatório para modo 'emenda'
  // Opcional para modo 'edicao'
  projetoNorma?: ProjetoNorma;

  // Lista de lexml id's de artigos bloqueados para edição.
  // Não é salvo junto com a emenda, portanto deve ser informado também ao abrir uma emenda existente.
  dispositivosBloqueados?: (string | DispositivoBloqueado)[];

  // Emenda a ser aberta para edição
  emenda?: Emenda;

  // Motivo de uma nova emenda de texto livre
  // Preenchido automaticamente se for informada a emenda
  motivo = '';

  // Identificação do usuário para registro de marcas de revisão
  usuario?: Usuario;

  // Preferências de usuário ----

  // Autoria padrão
  autoriaPadrao?: { identificacao: string; siglaCasaLegislativa: 'SF' | 'CD' };

  // Opções de impressão padrão
  opcoesImpressaoPadrao?: { imprimirBrasao: boolean; textoCabecalho: string; tamanhoFonte: number };

  // Configuração de paginação de dispositivos durante a edição da emenda
  configuracaoPaginacao?: ConfiguracaoPaginacao;
  // Casa legislativa resposavel pela apreciaçao da emenda
  casaLegislativa?: TipoCasaLegislativa;

  // Indica se o texto a ser emendado é substitutivo
  emendarTextoSubstitutivo = false;
}

@customElement('lexml-emenda')
export class LexmlEmendaComponent extends connect(rootStore)(LitElement) {
  @property({ type: Boolean }) existeObserverEmenda = false;
  @property({ type: Number }) totalAlertas = 0;
  @property({ type: Boolean }) exibirAjuda = true;
  @property({ type: Array }) parlamentares: Parlamentar[] = [];
  @property({ type: Array }) comissoes: Comissao[] = [];
  @property({ type: Object }) lexmlEmendaConfig: LexmlEmendaConfig = new LexmlEmendaConfig();

  private modo: any = ClassificacaoDocumento.EMENDA;

  private urn = '';

  private ementa = '';

  private isMateriaOrcamentaria = false;

  private projetoNorma: any;

  private motivo = '';

  private params?: LexmlEmendaParametrosEdicao;
  private casaLegislativa: TipoCasaLegislativa = 'CN';

  private parlamentaresCarregados = false;
  private comissoesCarregadas = false;

  private emendarTextoSubstitutivo = false;

  // Para forçar atualização da interface
  @state()
  private updateState: any;

  @state()
  private notasRodape: NotaRodape[] = [];

  @state()
  private sequenciasComentario: SequenciaComentario[] = [];

  @state()
  private tituloModalComentario = 'Adicionar comentário';

  @state()
  private textoTrechoComentarioAtual = '';

  @state()
  private tamanhoTextoModalComentario = 0;

  @state()
  private comentarioModalPossuiTexto = false;

  @state()
  private ordenacaoComentarios: 'recentes' | 'texto' = 'texto';

  @state()
  private idSequenciaComentarioAtual?: string;

  @state()
  private modalListaComentariosAberto = false;

  private preservarComentarioNaTrocaAba = false;
  private idsDispositivosComentadosCacheKey = '';
  private idsDispositivosComentadosCache: string[] = [];

  @state()
  autoria = new Autoria();

  @query('lexml-emenda-substituicao-termo')
  _substituicaoTermo?: SubstituicaoTermoComponent;

  @query('lexml-emenda-eta')
  _lexmlEta?: LexmlEtaComponent;
  @query('#lexml-emenda-editor-texto-rico-emenda')
  _lexmlEmendaTextoRico;
  @query('#lexml-emenda-editor-texto-rico-justificativa')
  _lexmlJustificativa;
  @query('lexml-emenda-destino')
  _lexmlDestino?: DestinoComponent;
  @query('lexml-emenda-autoria')
  _lexmlAutoria;
  @query('lexml-emenda-data')
  _lexmlData;
  @query('lexml-emenda-opcoes-impressao')
  _lexmlOpcoesImpressao;
  @query('#tabs-esquerda')
  _tabsEsquerda;
  @query('#tabs-direita')
  _tabsDireita;
  @query('lexml-emenda-comando')
  _lexmlEmendaComando!: ComandoEmendaComponent;

  @query('lexml-emenda-comando-modal')
  _lexmlEmendaComandoModal!: ComandoEmendaModalComponent;

  @query('sl-split-panel')
  private slSplitPanel!: any;

  @query('#lexml-emenda-comentario-modal')
  private comentarioModal!: any;

  @query('#lexml-emenda-comentario-textarea')
  private comentarioTextarea!: HTMLTextAreaElement;

  @query('#lexml-emenda-excluir-sequencia-comentario-modal')
  private excluirSequenciaComentarioModal!: any;

  @query('#lexml-emenda-excluir-comentario-modal')
  private excluirComentarioModal!: any;

  @query('#lexml-emenda-lista-comentarios-modal')
  private listaComentariosModal!: any;

  private editorComentarioAtual?: any;
  private rangeComentarioAtual?: any;
  private comentarioArticulacaoAtual?: { elemento: Elemento; idDispositivo: string };
  private uuid2DispositivoPorSequenciaComentario = new Map<string, string>();
  private timerSincronizacaoComentariosArticulacao?: number;
  private modoComentarioAtual = '';
  private acaoModalComentario: 'adicionar' | 'responder' | 'editar' = 'adicionar';
  private comentarioEdicaoAtual?: { idSequenciaComentario: string; indexComentario: number };
  private comentarioExclusaoAtual?: { idSequenciaComentario: string; indexComentario: number };
  private idSequenciaComentarioRespostaAtual?: string;
  private idSequenciaComentarioExclusaoAtual?: string;

  async getParlamentares(): Promise<Parlamentar[]> {
    try {
      const _response = await fetch(this.lexmlEmendaConfig.urlConsultaParlamentares);
      const _parlamentares = await _response.json();
      return _parlamentares
        .filter(p => this.casaLegislativa === 'CN' || p.siglaCasa === this.casaLegislativa)
        .map(p => ({
          identificacao: p.id + '',
          nome: p.nome,
          sexo: p.sexo,
          siglaPartido: p.siglaPartido,
          siglaUF: p.siglaUF,
          siglaCasaLegislativa: p.siglaCasa,
        }));
    } catch (err) {
      console.log('Erro inesperado ao carregar lista de parlamentares');
      console.log(err);
    } finally {
      this.parlamentaresCarregados = true;
      // this.habilitarBotoes();
    }
    return Promise.resolve([]);
  }

  async getComissoes(siglaCasaLegislativa: string): Promise<Comissao[]> {
    try {
      if (!this.lexmlEmendaConfig.urlComissoes) {
        return Promise.resolve([]);
      }
      const _response = await fetch(`${this.lexmlEmendaConfig.urlComissoes}?siglaCasaLegislativa=${siglaCasaLegislativa}`);
      const _comissoes = await _response.json();
      return _comissoes
        .filter(c => c.siglaCasaLegislativa === siglaCasaLegislativa)
        .map(c => ({
          siglaCasaLegislativa: c.siglaCasaLegislativa,
          sigla: c.sigla,
          nome: c.nome,
        }));
    } catch (err) {
      console.log('Erro inesperado ao carregar lista de comissões');
      console.log(err);
    } finally {
      this.comissoesCarregadas = true;
      // this.habilitarBotoes();
    }
    return Promise.resolve([]);
  }

  atualizaListaComissoes(): void {
    this.getComissoes(this.casaLegislativa).then(comissoes => (this.comissoes = comissoes));
  }

  private montarLocalFromColegiadoApreciador(colegiado: ColegiadoApreciador): any {
    return colegiado.tipoColegiado === 'Comissão' ? 'Sala da comissão' : 'Sala das sessões';
  }

  private montarEmendaBasica(): Emenda {
    const emenda = new Emenda();
    emenda.modoEdicao = this.modo;
    emenda.componentes[0].urn = this.urn;
    emenda.proposicao = this.montarProposicaoPorUrn(this.urn, this.ementa);
    return emenda;
  }

  private montarProposicaoPorUrn(urn: string, ementa: string): RefProposicaoEmendada {
    if (urn) {
      return {
        urn: urn,
        sigla: getSigla(urn),
        numero: getNumero(urn),
        ano: getAno(urn),
        ementa: ementa,
        identificacaoTexto: this.emendarTextoSubstitutivo ? 'Substitutivo' : 'Texto inicial',
        emendarTextoSubstitutivo: this.emendarTextoSubstitutivo,
      };
    }
    return new RefProposicaoEmendada();
  }

  getEmenda(): Emenda {
    // Para evitar erros de referência nula quando chamado antes da inicialização do componente
    if (!this.urn) {
      return new Emenda();
    }

    this.sincronizarReferenciasComentariosArticulacao(true);

    const emenda = this.montarEmendaBasica();
    const numeroProposicao = emenda.proposicao.numero.replace(/^0+/, '');
    if (this.isEmendaSubstituicaoTermo()) {
      emenda.substituicaoTermo = this._substituicaoTermo!.getSubstituicaoTermo();
      emenda.comandoEmenda = this._substituicaoTermo!.getComandoEmenda(this.urn);
      emenda.comandoEmendaTextoLivre.texto = '';
    } else if (this.isEmendaTextoLivre()) {
      emenda.comandoEmendaTextoLivre.motivo = this.motivo;
      emenda.comandoEmendaTextoLivre.texto = this._lexmlEmendaTextoRico.texto;
      emenda.anexos = this._lexmlEmendaTextoRico.anexos;
      emenda.comandoEmendaTextoLivre.textoAntesRevisao = this._lexmlEmendaTextoRico.textoAntesRevisao;
    } else {
      emenda.comandoEmendaTextoLivre.texto = '';
      emenda.componentes[0].dispositivos = this._lexmlEta!.getDispositivosEmenda()!;
      emenda.comandoEmenda = this._lexmlEta!.getComandoEmenda();
      emenda.anexos = this._lexmlEta!.getAnexos();
    }
    emenda.justificativa = this._lexmlJustificativa.texto;
    emenda.notasRodape = this._lexmlJustificativa.notasRodape;
    emenda.sequenciasComentario = this.normalizarSequenciasComentario(this.sequenciasComentario);
    emenda.autoria = this._lexmlAutoria.getAutoriaAtualizada();
    emenda.data = this._lexmlData.data || undefined;
    emenda.opcoesImpressao = this._lexmlOpcoesImpressao.opcoesImpressao;
    emenda.colegiadoApreciador = this._lexmlDestino!.colegiadoApreciador;
    emenda.epigrafe = new Epigrafe();
    emenda.epigrafe.texto = 'EMENDA Nº         ';
    if (emenda.colegiadoApreciador && emenda.colegiadoApreciador.tipoColegiado !== 'Plenário' && emenda.colegiadoApreciador.siglaComissao) {
      emenda.epigrafe.texto += `- ${emenda.colegiadoApreciador.siglaComissao}`;
    }

    const generoProposicao = generoFromLetra(getTipo(emenda.proposicao.urn).genero);
    const inicioEpigrafe = this.emendarTextoSubstitutivo ? '(ao substitutivo ' : '(';
    emenda.epigrafe.complemento = `${inicioEpigrafe}${generoProposicao.artigoDefinidoPrecedidoPreposicaoASingular.trim()} ${emenda.proposicao.sigla} ${numeroProposicao}/${
      emenda.proposicao.ano
    })`;
    if (emenda.colegiadoApreciador) emenda.local = this.montarLocalFromColegiadoApreciador(emenda.colegiadoApreciador);
    emenda.revisoes = this.getRevisoes();
    emenda.justificativaAntesRevisao = this._lexmlJustificativa.textoAntesRevisao;
    emenda.pendenciasPreenchimento = this.getPendenciasPreenchimentoEmenda(emenda);

    return emenda;
  }

  private getPendenciasPreenchimentoEmenda(emenda: Emenda): string[] {
    const pendenciasPreenchimento: Array<string> = [];

    if (this.isEmendaPadrao()) {
      if (emenda.comandoEmenda.comandos.length === 0) {
        pendenciasPreenchimento.push('Deve ser feita pelo menos uma modificação no texto da proposição para a geração do comando de emenda.');
      }
    } else if (this.isEmendaSubstituicaoTermo()) {
      if (emenda.substituicaoTermo?.termo.replace('(termo a ser substituído)', '').trim() === '' || emenda.substituicaoTermo?.novoTermo.replace('(novo termo)', '').trim() === '') {
        pendenciasPreenchimento.push('Substituição de termo não preenchida.');
      }
    } else if (this.isEmendaTextoLivre()) {
      if (isHtmlSemTexto(emenda.comandoEmendaTextoLivre.texto)) {
        pendenciasPreenchimento.push('Emenda de texto livre não preenchida.');
      }
    }

    // Verifica preenchimento da justificação
    if (isHtmlSemTexto(emenda.justificativa)) {
      pendenciasPreenchimento.push('Não foi informado um texto de justificação.');
    }

    const messagesCritical = rootStore.getState().elementoReducer.mensagensCritical;

    for (let index = 0; index < messagesCritical.length; index++) {
      const element = messagesCritical[index];
      pendenciasPreenchimento.push(element);
    }

    return pendenciasPreenchimento;
  }

  private getRevisoes(): Revisao[] {
    const revisoes = ordernarRevisoes([...rootStore.getState().elementoReducer.revisoes]);

    revisoes.filter(isRevisaoElemento).forEach(r => {
      const re = r as RevisaoElemento;
      removeAtributosDoElemento(re.elementoAposRevisao);
      re.elementoAntesRevisao && removeAtributosDoElemento(re.elementoAntesRevisao);
    });

    return revisoes;
  }

  async inicializarEdicao(params: LexmlEmendaParametrosEdicao) {
    try {
      this._lexmlEmendaComando.emenda = [];
      this.modo = params.modo;
      this.projetoNorma = params.projetoNorma;
      this.isMateriaOrcamentaria = params.isMateriaOrcamentaria || (!!params.emenda && params.emenda.colegiadoApreciador.siglaComissao === 'CMO');
      this._lexmlDestino!.isMateriaOrcamentaria = this.isMateriaOrcamentaria;
      this.params = params;

      this.inicializaProposicao(params);

      this.motivo = params.motivo;
      if (this.isEmendaTextoLivre() && params.emenda) {
        this.motivo = params.emenda.comandoEmendaTextoLivre.motivo || 'Motivo não informado na emenda';
      }

      this.setUsuario(params.usuario ?? rootStore.getState().elementoReducer.usuario);

      if (!this.isEmendaTextoLivre() && !this.isEmendaSubstituicaoTermo()) {
        this._lexmlEta!.inicializarEdicao(this.modo, this.urn, params.projetoNorma, !!params.emenda, params);
      }

      this.casaLegislativa = this.inicializaCasaLegislativa(getSigla(this.urn), params);

      // Deve ser chamado antes do reseta emenda para garantir a autoria padrão e depois da inicialização da casaLegislativa
      this.parlamentares = await this.getParlamentares();

      if (params.emenda) {
        this.setEmenda(params.emenda);
      } else {
        this.resetaEmenda(params);
      }

      this.atualizaListaComissoes();

      this.limparAlertas();

      if (this.isEmendaTextoLivre() && this._lexmlEmendaTextoRico.isEditorVazio()) {
        this.showAlertaEmendaTextoLivre();
      }
      this.atualizarAlertaGlobalComentarios();
      setTimeout(this.handleResize, 0);

      if (!params.emenda?.revisoes?.length) {
        this.desativarMarcaRevisao();
      }

      this._tabsEsquerda.show('lexml-emenda-eta');

      if (this.modo.startsWith('emenda') && !this.isEmendaTextoLivre()) {
        setTimeout(() => {
          this._tabsDireita?.show('comando');
        });
      } else {
        setTimeout(() => {
          this._tabsDireita?.show('notas');
        });
      }

      this.updateView();
    } catch (err) {
      console.error(err);
      this.emitirEventoFatalError(err);
      setTimeout(() => {
        rootStore.dispatch(errorInicializarEdicaoAction.execute(err));
      }, 0);
    }
  }

  private inicializaCasaLegislativa(siglaProposicao: string, params: LexmlEmendaParametrosEdicao): TipoCasaLegislativa {
    if (['MPV', 'PDN', 'PRN'].indexOf(siglaProposicao) > -1) {
      return 'CN';
    }
    return (params.emenda ? params.emenda.colegiadoApreciador.siglaCasaLegislativa : params.casaLegislativa) || 'CN';
  }

  public trocarModoEdicao(modo: string, motivo = ''): void {
    if (this.modo === modo) {
      console.log('Ignorando tentativa de mudança para o mesmo modo de edição.');
      return;
    }

    if (!this.projetoNorma && modo === 'emenda') {
      throw 'Não é possível trocar para o modo "emenda" quando não há texto da proposição.';
    }

    this._lexmlEmendaComando.emenda = [];
    this.modo = modo;

    this.motivo = motivo;
    if (this.isEmendaTextoLivre() && !this.motivo) {
      throw 'Deve ser informado um motivo para a emenda de texto livre.';
    }

    if (!this.isEmendaTextoLivre() && !this.isEmendaSubstituicaoTermo()) {
      this._lexmlEta!.inicializarEdicao(this.modo, this.urn, this.projetoNorma, false, this.params);
    }

    rootStore.dispatch(limparAlertas());

    if (this.isEmendaTextoLivre()) {
      this._lexmlEmendaTextoRico.reset();
      this._lexmlEmendaTextoRico.anexos = [];
    } else if (this.isEmendaSubstituicaoTermo()) {
      this._lexmlEmendaTextoRico.reset();
      this._substituicaoTermo!.setSubstituicaoTermo(new SubstituicaoTermo());
    }

    this.limparAlertas();

    if (this.isEmendaTextoLivre() && this._lexmlEmendaTextoRico.isEditorVazio()) {
      this.showAlertaEmendaTextoLivre();
    }
    this.atualizarAlertaGlobalComentarios();
    setTimeout(this.handleResize, 0);

    this._tabsEsquerda.show('lexml-emenda-eta');

    if (this.modo.startsWith('emenda') && !this.isEmendaTextoLivre()) {
      setTimeout(() => {
        this._tabsDireita?.show('comando');
      });
    } else {
      setTimeout(() => {
        this._tabsDireita?.show('notas');
      });
    }

    this.updateView();
  }

  private inicializaProposicao(params: LexmlEmendaParametrosEdicao): void {
    this.urn = '';
    this.ementa = '';

    if (params.proposicao) {
      // Preferência para a proposição informada
      this.urn = buildFakeUrn(params.proposicao.sigla, params.proposicao.numero, params.proposicao.ano);
      this.ementa = params.proposicao.ementa; // Preferência para a ementa informada
    }
    this.emendarTextoSubstitutivo = params.emendarTextoSubstitutivo || false;

    // Se não forem informados, utilizar da Emenda
    if (params.emenda) {
      if (!this.urn) {
        this.urn = params.emenda.proposicao.urn;
      }
      if (!this.ementa) {
        this.ementa = params.emenda.proposicao.ementa;
      }
      this.emendarTextoSubstitutivo = params.emenda.proposicao.emendarTextoSubstitutivo || false;
    }

    // Por último do ProjetoNorma
    if (this.projetoNorma) {
      if (!this.urn) {
        this.urn = getUrn(this.projetoNorma);
      }
      if (!this.ementa) {
        this.ementa = this.getEmentaFromProjetoNorma(this.projetoNorma);
      }
    }
  }

  getEmentaFromProjetoNorma(projetoNorma: any): string {
    return buildContent(projetoNorma.value?.projetoNorma?.norma?.parteInicial?.ementa.content);
  }

  stateChanged(state: any): void {
    const events = state?.elementoReducer?.ui?.events || [];
    const revisaoAtivada = events.some((ev: StateEvent) => ev.stateType === StateType.RevisaoAtivada);
    const revisaoDesativada = events.some((ev: StateEvent) => ev.stateType === StateType.RevisaoDesativada);
    revisaoAtivada && this.mostrarDialogDisclaimerRevisao();
    if (revisaoAtivada || revisaoDesativada) {
      this.emitiEventoOnRevisao(rootStore.getState().elementoReducer.emRevisao);
    }

    const eventosEstruturais = events.filter((ev: StateEvent) =>
      [StateType.ElementoRenumerado, StateType.ElementoModificado, StateType.ElementoIncluido, StateType.ElementoRemovido].includes(ev.stateType)
    );
    if (eventosEstruturais.length) {
      this.agendarSincronizacaoReferenciasComentariosArticulacao(eventosEstruturais.some((ev: StateEvent) => ev.stateType === StateType.ElementoRemovido));
    }

    if (events.some((ev: StateEvent) => [StateType.DocumentoCarregado, StateType.ArticulacaoAtualizada].includes(ev.stateType))) {
      this.restaurarReferenciasComentariosArticulacao();
    }

    const eventoElementoSelecionado = events.filter((ev: StateEvent) => ev.stateType === StateType.ElementoSelecionado).slice(-1)[0];
    if (eventoElementoSelecionado) {
      this.sincronizarComentarioAtualComDispositivoSelecionado(eventoElementoSelecionado.elementos?.[0]);
    }
  }

  private emitiEventoOnRevisao(emRevisao: boolean): void {
    this.dispatchEvent(
      new CustomEvent('onrevisao', {
        bubbles: true,
        composed: true,
        detail: {
          emRevisao,
        },
      })
    );
  }

  private emitirEventoFatalError(err): void {
    this.dispatchEvent(
      new CustomEvent('fatalError', {
        bubbles: true,
        composed: true,
        detail: {
          err,
        },
      })
    );
  }

  private desativarMarcaRevisao = (): void => {
    if (rootStore.getState().elementoReducer.emRevisao) {
      const quantidade = getQuantidadeRevisoesAll(rootStore.getState().elementoReducer.revisoes);
      if (quantidade === 0) {
        rootStore.dispatch(ativarDesativarRevisaoAction.execute(quantidade));
      }
    }
  };

  public setUsuario(usuario = new Usuario()): void {
    rootStore.dispatch(atualizarUsuarioAction.execute(usuario));
  }

  private normalizarSequenciasComentario(sequenciasComentario: SequenciaComentario[] = []): SequenciaComentario[] {
    return sequenciasComentario.map(seq => {
      const sequenciaComentario = Object.assign(new SequenciaComentario(), seq);
      sequenciaComentario.comentarios = (seq.comentarios || []).map(comentario => {
        const comentarioNormalizado = Object.assign(new Comentario(), comentario);
        comentarioNormalizado.usuario = Object.assign(new Usuario(), comentario.usuario || {});
        return comentarioNormalizado;
      });
      return sequenciaComentario;
    });
  }

  private restaurarReferenciasComentariosArticulacao(): void {
    let houveAtualizacao = false;

    this.sequenciasComentario.forEach(seq => {
      if (!this.isComentarioArticulacao(seq)) {
        return;
      }

      if (this.isComentarioEmenta(seq)) {
        houveAtualizacao = this.uuid2DispositivoPorSequenciaComentario.delete(seq.id) || houveAtualizacao;
        return;
      }

      if (this.uuid2DispositivoPorSequenciaComentario.has(seq.id)) {
        return;
      }

      const dispositivo = this.getDispositivoPorIdComentario(seq.idDispositivo);
      if (dispositivo?.uuid2) {
        this.uuid2DispositivoPorSequenciaComentario.set(seq.id, dispositivo.uuid2);
        houveAtualizacao = true;
      }
    });

    if (houveAtualizacao) {
      this.idsDispositivosComentadosCacheKey = '';
      this.idsDispositivosComentadosCache = [];
      this.requestUpdate();
    }
  }

  private setEmenda(emenda: Emenda): void {
    rootStore.dispatch(limparAlertas());
    this.uuid2DispositivoPorSequenciaComentario.clear();
    this.idsDispositivosComentadosCacheKey = '';
    this.idsDispositivosComentadosCache = [];

    if (!this.isEmendaTextoLivre() && !this.isEmendaSubstituicaoTermo()) {
      this._lexmlEta!.setDispositivosERevisoesEmenda(emenda.componentes[0].dispositivos, emenda.revisoes);
    }

    this._lexmlAutoria.autoria = emenda.autoria;
    this._lexmlAutoria.casaLegislativa = this.casaLegislativa;
    this._lexmlOpcoesImpressao.opcoesImpressao = emenda.opcoesImpressao;
    this._lexmlJustificativa.setTextoAntesRevisao(emenda.justificativaAntesRevisao);
    this._lexmlDestino!.colegiadoApreciador = emenda.colegiadoApreciador;
    this._lexmlDestino!.proposicao = emenda.proposicao;
    this.notasRodape = emenda.notasRodape || [];
    this.sequenciasComentario = this.normalizarSequenciasComentario(emenda.sequenciasComentario || []);
    this.restaurarReferenciasComentariosArticulacao();
    this._lexmlJustificativa.setContent(emenda.justificativa, emenda.notasRodape);

    if (this.isEmendaTextoLivre()) {
      this._lexmlEmendaTextoRico.setContent(emenda?.comandoEmendaTextoLivre.texto || '');
      this._lexmlEmendaTextoRico.anexos = emenda.anexos || [];
      this._lexmlEmendaTextoRico.setTextoAntesRevisao(emenda.comandoEmendaTextoLivre.textoAntesRevisao);
      rootStore.dispatch(aplicarAlteracoesEmendaAction.execute(emenda.componentes[0].dispositivos, emenda.revisoes));
    } else if (this.isEmendaSubstituicaoTermo()) {
      this._substituicaoTermo!.setSubstituicaoTermo(emenda.substituicaoTermo || new SubstituicaoTermo());
    } else if (this.isEmendaPadrao() || this.isEmendaDispositivoOndeCouber()) {
      this._lexmlEta!.atualizaAnexos(emenda.anexos || []);
    }
    this._lexmlData.data = emenda.data;
  }

  private resetaEmenda(params: LexmlEmendaParametrosEdicao): void {
    const emenda = new Emenda();
    emenda.modoEdicao = params.modo as ModoEdicaoEmenda;
    emenda.proposicao = this.montarProposicaoPorUrn(this.urn, params.ementa);
    emenda.autoria = this.montarAutoriaPadrao(params);
    emenda.opcoesImpressao = this.montarOpcoesImpressaoPadrao(params);
    emenda.colegiadoApreciador.siglaCasaLegislativa = this.casaLegislativa;
    this._lexmlEmendaComando.emenda = {};
    this.setEmenda(emenda);
    rootStore.dispatch(limparRevisaoAction.execute());
  }

  private montarAutoriaPadrao(params: LexmlEmendaParametrosEdicao): Autoria {
    const autoria = new Autoria();
    if (params.autoriaPadrao?.identificacao) {
      const autoriaPadrao = params.autoriaPadrao;
      const parlamentarAutor = this.parlamentares.find(
        par => par.identificacao === autoriaPadrao!.identificacao && par.siglaCasaLegislativa === autoriaPadrao!.siglaCasaLegislativa
      );
      if (parlamentarAutor) {
        autoria.parlamentares = [parlamentarAutor];
      }
    }
    return autoria;
  }

  private montarOpcoesImpressaoPadrao(params: LexmlEmendaParametrosEdicao): OpcoesImpressao {
    const opcoesImpressao = new OpcoesImpressao();
    if (params.opcoesImpressaoPadrao) {
      opcoesImpressao.imprimirBrasao = params.opcoesImpressaoPadrao.imprimirBrasao;
      opcoesImpressao.textoCabecalho = params.opcoesImpressaoPadrao.textoCabecalho;
      opcoesImpressao.tamanhoFonte = params.opcoesImpressaoPadrao.tamanhoFonte;
    }
    return opcoesImpressao;
  }

  constructor() {
    super();
    this.addEventListener(NOTA_RODAPE_CHANGE_EVENT, this.onChangeNotasRodape);
    this.addEventListener(NOTA_RODAPE_REMOVE_EVENT, this.onChangeNotasRodape);
  }

  createRenderRoot(): LitElement {
    return this;
  }

  private MOBILE_WIDTH = 768;
  private TABLET_WIDTH = 992;
  private splitPanelPosition = 67;
  private sizeMode = '';

  private updateLayoutSplitPanel(forceUpdate = false): void {
    if (this.sizeMode === 'desktop') {
      this.slSplitPanel.position = this.splitPanelPosition;
    }

    if (window.innerWidth <= this.MOBILE_WIDTH && (this.sizeMode !== 'mobile' || forceUpdate)) {
      this.sizeMode = 'mobile';
      this.slSplitPanel.position = 100;
      this.slSplitPanel.setAttribute('disabled', 'true');
    } else if (window.innerWidth > this.MOBILE_WIDTH && (this.sizeMode !== 'desktop' || forceUpdate)) {
      this.sizeMode = 'desktop';
      this.slSplitPanel.position = this.splitPanelPosition;
      this.slSplitPanel.removeAttribute('disabled');
    }
  }

  // Documentação de tratamento de eventos no Lit
  // https://lit.dev/docs/components/events/

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.handleResize);
    super.disconnectedCallback();
  }

  handleResize = (): void => {
    this.updateLayoutSplitPanel();
    this.ajustarAltura();
  };

  protected firstUpdated(): void {
    // this.habilitarBotoes();
    // setTimeout(() => this.atualizaListaParlamentares(), 0);
    // setTimeout(() => this.atualizaListaComissoes(), 0);

    this._tabsEsquerda?.addEventListener('sl-tab-show', (event: any) => {
      const tabName = event.detail.name;
      if (this.preservarComentarioNaTrocaAba) {
        return;
      }

      this.limparComentarioAtual();

      if (tabName === 'avisos') {
        const badge = (event.target as Element).querySelector('sl-badge');
        if (badge) {
          badge.pulse = false;
        }
      } else if (tabName === 'autoria') {
        // this.parlamentares.length === 0 && this.atualizaListaParlamentares();
        // this.comissoes?.length === 0 && this.atualizaListaComissoes();
      }
    });

    this.slSplitPanel.addEventListener('sl-reposition', () => {
      this.ajustarAltura();
    });

    const badgeAtalhos = this._tabsDireita?.querySelector('sl-tab[panel="atalhos"] #badgeAtalhos') as any;
    if (badgeAtalhos) {
      const naoPulsarBadgeAtalhos = localStorage.getItem('naoPulsarBadgeAtalhos');
      if (!naoPulsarBadgeAtalhos) {
        badgeAtalhos.pulse = true;
        badgeAtalhos.setAttribute('variant', 'warning');
      }
    }

    this._tabsDireita?.addEventListener('sl-tab-show', (event: any) => {
      const tabName = event.detail.name;
      if (tabName === 'atalhos') {
        const badge = (event.target as Element).querySelector('sl-tab[panel="atalhos"] sl-badge') as any;
        if (badge) {
          badge.pulse = false;
          badge.setAttribute('variant', 'primary');
        }
        localStorage.setItem('naoPulsarBadgeAtalhos', 'true');
      } else if (tabName === 'comentarios') {
        this.rolarParaComentarioAtual();
      } else {
        this.limparComentarioAtual();
      }
    });
  }

  updated(): void {
    // if (this.modo.startsWith('emenda') && !this.isEmendaTextoLivre()) {
    //   this.slSplitPanel.removeAttribute('disabled');
    //   this.slSplitPanel.position = this.splitPanelPosition;
    // } else {
    //   this.slSplitPanel.setAttribute('disabled', 'true');
    //   this.slSplitPanel.position = 100;
    // }
  }

  private pesquisarAlturaParentElement(elemento): number {
    if (elemento.parentElement === null) {
      // chegou no HTML e não encontrou altura
      return 0;
    } else {
      const minHeight = getComputedStyle(this).getPropertyValue('--min-height').replace('px', '');
      if (elemento.clientHeight >= minHeight) {
        return elemento.clientHeight;
      } else {
        return this.pesquisarAlturaParentElement(elemento.parentElement);
      }
    }
  }

  private ajustarAltura(altura?: number): boolean {
    const alturaElementoBase = altura ?? this.pesquisarAlturaParentElement(this);
    const lexmlEtaTabs = document.querySelector('sl-tab-group')?.shadowRoot?.querySelector('.tab-group__nav-container');
    const alturaLexmlEtaTabs = lexmlEtaTabs?.clientHeight;

    if (!alturaLexmlEtaTabs) return false;

    const alturaElemento = alturaElementoBase - alturaLexmlEtaTabs - 12;
    if (alturaElemento <= 0) return false;

    const getElement = (selector: string): HTMLElement => document.querySelector(selector) as HTMLElement;

    const justificativaTabPanel = getElement('sl-tab-panel[name="justificativa"]');
    const emendaTabPanel = getElement('sl-tab-panel[name="lexml-emenda-eta"]');
    const qlToolbarJustificativa = getElement('#lexml-emenda-editor-texto-rico-justificativa .ql-toolbar');
    const qlToolbarEmenda = getElement('#lx-eta-barra-ferramenta');

    const estilosOriginais = {
      justificativa: {
        display: justificativaTabPanel.style.display,
        opacity: justificativaTabPanel.style.opacity,
        pointerEvents: justificativaTabPanel.style.pointerEvents,
      },
      emenda: {
        display: emendaTabPanel.style.display,
        opacity: emendaTabPanel.style.opacity,
        pointerEvents: emendaTabPanel.style.pointerEvents,
      },
    };

    const setTabPanelStyles = (tabPanel: HTMLElement, estilos: any, isTemporary = false): void => {
      if (isTemporary) {
        tabPanel.style.opacity = '0';
        tabPanel.style.pointerEvents = 'none';
        tabPanel.style.display = 'block';
      } else {
        tabPanel.style.opacity = estilos.opacity;
        tabPanel.style.pointerEvents = estilos.pointerEvents;
        tabPanel.style.display = estilos.display;
      }
    };

    if (estilosOriginais.justificativa.display === 'none') {
      setTabPanelStyles(justificativaTabPanel, estilosOriginais.justificativa, true);
    }
    if (estilosOriginais.emenda.display === 'none') {
      setTabPanelStyles(emendaTabPanel, estilosOriginais.emenda, true);
    }

    const alturaToolBarJustificativa = qlToolbarJustificativa?.clientHeight + 10;
    const alturaToolBarEmenda = qlToolbarEmenda?.clientHeight + 10;

    setTabPanelStyles(justificativaTabPanel, estilosOriginais.justificativa);
    setTabPanelStyles(emendaTabPanel, estilosOriginais.emenda);

    this.style.setProperty('--heightJustificativa', `${alturaElemento - alturaToolBarJustificativa}px`);
    this.style.setProperty('--heightEmenda', `${alturaElemento - alturaToolBarEmenda}px`);
    this.style.setProperty('--height', `${alturaElemento}px`);
    this.style.setProperty('--overflow', 'hidden');

    return true;
  }

  private onChange(): void {
    let comandoEmenda = null as any;
    if (this.isEmendaSubstituicaoTermo()) {
      comandoEmenda = this._substituicaoTermo!.getComandoEmenda(this.urn);
      this._lexmlEmendaComando.emenda = comandoEmenda;
      this._lexmlEmendaComandoModal.atualizarComandoEmenda(comandoEmenda);
    } else if (this.isEmendaTextoLivre()) {
      if (!this._lexmlEmendaTextoRico.isEditorVazio() && this._lexmlJustificativa.isEditorVazio()) {
        this.disparaAlerta();
      } else {
        rootStore.dispatch(removerAlerta('alerta-global-justificativa'));
      }
      if (this._lexmlEmendaTextoRico.isEditorVazio()) {
        this.showAlertaEmendaTextoLivre();
      } else {
        rootStore.dispatch(removerAlerta('alerta-global-emenda-texto-livre'));
      }
    }

    if (!this.isEmendaTextoLivre()) {
      this.buildAlertaJustificativa(comandoEmenda);
    }

    this.sincronizarReferenciasComentariosArticulacao(true);
    this.sincronizarSequenciasComentarioComTexto();
    this.atualizarAlertaGlobalComentarios();

    if (this.sequenciasComentario.length) {
      this.requestUpdate();
    }
  }

  buildAlertaJustificativa(comandoEmenda: any): void {
    if (comandoEmenda === null) {
      comandoEmenda = this._lexmlEta!.getComandoEmenda();
      this._lexmlEmendaComando.emenda = comandoEmenda;
      this._lexmlEmendaComandoModal.atualizarComandoEmenda(comandoEmenda);
    }

    if (comandoEmenda !== null && comandoEmenda.comandos?.length > 0 && this._lexmlJustificativa.isEditorVazio()) {
      this.disparaAlerta();
    } else {
      rootStore.dispatch(removerAlerta('alerta-global-justificativa'));
    }
  }

  disparaAlerta(): void {
    const alerta = {
      id: 'alerta-global-justificativa',
      tipo: TipoMensagem.CRITICAL,
      mensagem: 'A emenda não possui uma justificação',
      podeFechar: false,
    };
    rootStore.dispatch(adicionarAlerta(alerta));
  }

  getJustificativa(): string {
    return '';
  }

  limparAlertas(): void {
    rootStore.dispatch(limparAlertas());
  }

  private atualizarAlertaGlobalComentarios(): void {
    const id = 'alerta-global-comentarios';

    if (this.sequenciasComentario.length) {
      rootStore.dispatch(
        adicionarAlerta({
          id,
          tipo: TipoMensagem.INFO,
          mensagem: 'Este documento contém comentários e não deve ser protocolado até que sejam removidos.',
          podeFechar: true,
          exibirComandoEmenda: true,
        })
      );
    } else if (rootStore.getState().elementoReducer.ui?.alertas?.some(alerta => alerta.id === id)) {
      rootStore.dispatch(removerAlerta(id));
    }
  }

  showAlertaEmendaTextoLivre(): void {
    const alerta = {
      id: 'alerta-global-emenda-texto-livre',
      tipo: TipoMensagem.CRITICAL,
      mensagem: 'O comando de emenda deve ser preenchido.',
      podeFechar: false,
    };
    rootStore.dispatch(adicionarAlerta(alerta));
  }

  mostrarDialogDisclaimerRevisao(): void {
    mostrarDialogDisclaimerRevisao();
  }

  private isEmendaPadrao(): boolean {
    return this.modo === ClassificacaoDocumento.EMENDA;
  }

  private isEmendaDispositivoOndeCouber(): boolean {
    return this.modo === ClassificacaoDocumento.EMENDA_ARTIGO_ONDE_COUBER;
  }

  private isEmendaTextoLivre(): boolean {
    return this.modo === ClassificacaoDocumento.EMENDA_TEXTO_LIVRE;
  }

  private isEmendaSubstituicaoTermo(): boolean {
    return this.modo === ClassificacaoDocumento.EMENDA_SUBSTITUICAO_TERMO;
  }

  private updateView(): void {
    this.updateState = new Date();
  }

  render(): TemplateResult {
    return html`
      ${shoelaceLightThemeStyles} ${quillSnowStyles} ${editorStyles}
      <style>
        :root {
          --height: 100%;
          --overflow: visible;
          --min-height: 300px;
          --heightJustificativa: 100%;
          --heightEmenda: 100%;
          --visibilityNotasAcao: hidden;
        }
        sl-tab-panel {
          --padding: 0px;
        }
        sl-tab-panel::part(base) {
          height: var(--height);
        }
        sl-tab-panel.overflow-hidden::part(base) {
          overflow-y: auto;
        }
        lexml-emenda-comando {
          font-family: var(--eta-font-serif);
          display: ${this.modo.startsWith('emenda') && !this.isEmendaTextoLivre() ? 'block' : 'none'};
          height: 100%;
        }
        lexml-emenda-eta {
          font-family: var(--eta-font-serif);
          text-align: left;
        }
        /* #lexml-emenda-editor-texto-rico-justificativa #lexml-emenda-editor-texto-rico {
          height: calc(var(--height) - 44px);
          overflow: var(--overflow);
        } */

        #lexml-emenda-editor-texto-rico-emenda-inner {
          height: calc(var(--heightJustificativa));
          overflow: var(--overflow);
        }
        #lexml-emenda-editor-texto-rico-justificativa-inner {
          height: calc(var(--heightJustificativa));
          overflow: var(--overflow);
        }
        .badge-pulse {
          margin-left: 7px;
          height: 16px;
          margin-top: -4px;
        }

        #badgeNotas::part(base),
        #badgeAtalhos::part(base) {
          height: 16px;
          margin-top: 2px;
          font-size: var(--sl-font-size-small);
          background-color: transparent;
          color: var(--sl-color-neutral-600);
        }
        sl-tab[panel='notas'][active] #badgeNotas::part(base),
        sl-tab[panel='atalhos'][active] #badgeAtalhos::part(base) {
          color: var(--sl-color-primary-600);
        }

        sl-split-panel {
          --divider-width: 15px;
          --min: 70%;
          --max: 85%;
        }
        sl-tab sl-icon {
          margin-right: 5px;
          font-size: 18px;
        }
        sl-tab[panel='comentarios'] sl-icon {
          transform: translateY(2px);
        }
        .tab-autoria__container {
          padding: 10px;
        }
        .notas-rodape {
          font-family: var(--eta-font-serif);
          font-style: normal;
          padding: 10px;
        }
        .notas-rodape h4 {
          font-family: var(--eta-font-sans);
          font-style: normal;
          padding: 1rem 0px 0.5rem;
          margin: 0px;
        }
        .notas-texto-vazio {
          padding-left: 20px;
          color: var(--sl-color-gray-500);
          font-style: italic;
        }

        .comentarios-texto-vazio {
          padding-left: 20px;
          color: var(--sl-color-gray-500);
          font-style: italic;
        }

        .notas-rodape ol {
          padding-left: 20px;
          list-style: none;
          counter-reset: item;
          margin: 0px;
        }

        .notas-rodape li {
          padding: 0px;
          position: relative;
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .notas-rodape li:hover {
          --visibilityNotasAcao: visible;
          background-color: var(--sl-color-gray-100);
        }

        .notas-rodape li::before {
          content: counter(item);
          counter-increment: item;
          position: absolute;
          width: 20px;
          left: -20px;
          top: 4px;
          font-size: smaller;
          vertical-align: super;
          font-weight: bold;
          font-size: 12px;
          color: var(--sl-color-gray-500);
          text-align: right;
        }

        .notas-texto {
          flex-grow: 1;
          cursor: pointer;
          padding: 5px;
          color: var(--sl-color-gray-500);
        }

        .notas-texto p {
          margin-block-start: 0;
          margin-block-end: 0;
        }

        .notas-acoes {
          display: flex;
          flex-direction: row;
          align-items: center;
        }

        .notas-acao {
          margin-left: 5px;
          visibility: var(--visibilityNotasAcao);
          cursor: pointer;
        }

        .notas-checkbox {
          appearance: none;
          background: transparent;
          display: none;
        }

        .notas-checkbox:checked + .notas-texto {
          color: black;
          font-style: italic;
        }

        .comentarios {
          font-family: var(--eta-font-sans);
          font-style: normal;
          min-height: 100%;
          padding: 10px;
          background: white;
          color: var(--sl-color-neutral-800);
        }

        .comentarios__cabecalho {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 1rem 0px 0.5rem;
        }

        .comentarios h4 {
          font-family: var(--eta-font-sans);
          font-size: 1rem;
          font-style: normal;
          margin: 0;
        }

        .comentarios__ordenacao-container {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--sl-color-neutral-600);
          font-size: 0.72rem;
        }

        .comentarios__ordenacao {
          width: 120px;
          height: 26px;
          border: 1px solid var(--sl-color-neutral-200);
          border-radius: 4px;
          color: var(--sl-color-neutral-700);
          font: inherit;
          font-size: 0.78rem;
          background: white;
        }

        .comentarios__lista {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
        }

        .comentario-sequencia {
          border: 1px solid #d9dee8;
          border-radius: 8px;
          background: white;
          box-sizing: border-box;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
          padding: 14px;
        }

        .comentario-sequencia--selecionada {
          border: 2px solid #93c5fd;
          background: #fbfdff;
          box-shadow: 0 0 0 3px #eaf4ff, 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .comentario-sequencia:focus-visible {
          outline: 0;
          background: #f5fbff;
        }

        .comentario-sequencia__topo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--sl-color-neutral-200);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .comentario-sequencia__origem {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          line-height: 1;
          padding: 0 8px;
        }

        .comentario-sequencia__origem--texto {
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          color: #4b5563;
        }

        .comentario-sequencia__origem--justificativa {
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          color: #4b5563;
        }

        .comentario-sequencia__acoes {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comentario-sequencia__acao {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 0;
          background: transparent;
          color: var(--sl-color-neutral-600);
          cursor: pointer;
          font: inherit;
          font-size: 0.8rem;
          line-height: 1;
          padding: 0;
        }

        .comentario-sequencia__seta {
          display: inline-block;
          position: relative;
          width: 11px;
          height: 8px;
          flex: none;
        }

        .comentario-sequencia__seta::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 1px;
          width: 9px;
          border-top: 1.5px solid currentColor;
        }

        .comentario-sequencia__seta::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 1px;
          width: 5px;
          height: 5px;
          border-left: 1.5px solid currentColor;
          border-bottom: 1.5px solid currentColor;
          transform: rotate(45deg);
        }

        .comentario-sequencia__acao:hover {
          color: var(--sl-color-primary-700);
        }

        .comentario-sequencia__acao--excluir {
          color: #ef4444;
          font-size: 1rem;
        }

        .comentario-sequencia__trecho {
          display: block;
          border-left: 3px solid #f59e0b;
          border-radius: 7px;
          background: #f3f2ed;
          color: #374151;
          font-family: var(--eta-font-serif);
          font-size: 0.88rem;
          font-style: italic;
          line-height: 1.45;
          margin: 0 0 12px;
          overflow: hidden;
          padding: 10px 12px;
          white-space: nowrap;
        }

        .comentario-sequencia__trecho-conteudo {
          display: inline-flex;
          max-width: 100%;
          min-width: 0;
          vertical-align: bottom;
        }

        .comentario-sequencia__trecho-conteudo::before,
        .comentario-sequencia__trecho-conteudo::after {
          content: '"';
          flex: none;
        }

        .comentario-sequencia__trecho-texto {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: pre;
        }

        .comentario-sequencia__comentarios {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .comentario-item {
          color: #374151;
        }

        .comentario-item:not(:last-child) {
          border-bottom: 1px solid var(--sl-color-neutral-200);
          margin-bottom: 10px;
          padding-bottom: 10px;
        }

        .comentario-item--resposta {
          margin-left: 16px;
        }

        .comentario-item__cabecalho {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .comentario-item__autor {
          color: #111827;
          font-weight: 600;
          font-size: 0.84rem;
        }

        .comentario-item__data {
          color: #8a94a3;
          font-size: 0.7rem;
          line-height: 1.2;
          margin-left: auto;
          padding-left: 8px;
          white-space: nowrap;
        }

        .comentario-item__texto {
          color: #5f6b7a;
          font-family: var(--eta-font-sans);
          font-size: 0.88rem;
          line-height: 1.45;
          margin: 0;
        }

        .comentario-item__acoes {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .comentario-item__acao {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 0;
          background: transparent;
          color: var(--sl-color-neutral-600);
          cursor: pointer;
          font: inherit;
          font-size: 0.75rem;
          padding: 0;
        }

        .comentario-item__acao:hover {
          color: var(--sl-color-primary-700);
        }

        .comentario-item__acao--excluir {
          color: #ef4444;
        }

        .comentario-dialog::part(panel) {
          width: min(440px, calc(100vw - 32px));
          border-radius: 8px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.24);
        }

        .comentario-dialog--confirmacao::part(panel) {
          width: min(440px, calc(100vw - 32px));
        }

        .comentario-dialog--lista::part(panel) {
          width: min(430px, calc(100vw - 24px));
          max-height: calc(100vh - 32px);
        }

        .comentario-dialog::part(header) {
          padding: 5px 24px 10px;
          align-items: center;
          border-bottom: 1px solid var(--sl-color-neutral-200);
        }

        .comentario-dialog::part(title) {
          color: #111827;
          font-family: var(--eta-font-sans);
          font-size: 1.15rem;
          font-weight: 600;
          letter-spacing: 0;
          line-height: 1.3;
          padding-left: 0;
          padding-bottom: 10px;
        }

        .comentario-dialog::part(close-button) {
          align-items: center;
          border: 0;
          color: #111827;
          display: inline-flex;
          font-size: 1.3rem;
          font-weight: 700;
          height: 32px;
          justify-content: center;
          margin-top: 0;
          margin-right: 0;
          margin-top: 10px;
          padding: 4px;
          width: 32px;
        }

        .comentario-dialog::part(body) {
          color: #374151;
          font-family: var(--eta-font-sans);
          padding: 12px 24px 20px;
        }

        .comentario-dialog--lista::part(body) {
          padding: 0;
          overflow: hidden;
        }

        .comentario-dialog::part(footer) {
          border-top: 1px solid var(--sl-color-neutral-200);
          padding: 16px 24px 20px;
        }

        .comentario-dialog--lista .comentarios {
          max-height: min(68vh, 680px);
          overflow-y: auto;
          padding: 12px;
        }

        .comentario-dialog__titulo-lista {
          align-items: center;
          display: inline-flex;
          gap: 8px;
        }

        .comentario-dialog__titulo-lista sl-icon {
          color: #111827;
          font-size: 1rem;
          transform: translateY(1px);
        }

        .comentario-modal__campo,
        .comentario-modal__grupo {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comentario-modal__grupo {
          margin-bottom: 16px;
        }

        .comentario-modal__label {
          color: #374151;
          font-size: 0.87rem;
          font-weight: 500;
          line-height: 1.3;
        }

        .comentario-modal__trecho {
          border-left: 3px solid #f59e0b;
          border-radius: 7px;
          background: #f3f2ed;
          color: #374151;
          font-family: var(--eta-font-serif);
          font-size: 0.88rem;
          font-style: italic;
          line-height: 1.45;
          overflow: hidden;
          padding: 10px 12px;
          white-space: nowrap;
        }

        .comentario-modal__trecho-conteudo {
          display: inline-flex;
          max-width: 100%;
          min-width: 0;
          vertical-align: bottom;
        }

        .comentario-modal__trecho-conteudo::before,
        .comentario-modal__trecho-conteudo::after {
          content: '"';
          flex: none;
        }

        .comentario-modal__trecho-texto {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: pre;
        }

        .comentario-modal__textarea {
          min-height: 100px;
          resize: vertical;
          border: 1px solid var(--sl-color-neutral-300);
          border-radius: 4px;
          color: #374151;
          font: inherit;
          line-height: 1.45;
          padding: 8px;
        }

        .comentario-modal__textarea::placeholder {
          color: #8a94a3;
        }

        .comentario-modal__textarea:focus {
          outline: 2px solid var(--sl-color-primary-200);
          border-color: var(--sl-color-primary-500);
        }

        .comentario-modal__contador {
          color: #6b7280;
          font-size: 0.74rem;
          line-height: 1;
          text-align: right;
        }

        .comentario-dialog__footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .comentario-dialog__footer sl-button::part(base) {
          min-width: 94px;
        }

        .comentario-modal__botao-icone {
          display: inline-flex;
          align-items: center;
          color: currentColor;
        }

        .comentario-modal__botao-icone svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }

        .comentario-modal__botao-icone .ql-fill {
          fill: currentColor;
        }

        .comentario-confirmacao {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .comentario-confirmacao__icone {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #fef2f2;
          color: #dc2626;
          font-size: 1.05rem;
        }

        .comentario-confirmacao__conteudo {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .comentario-confirmacao__titulo {
          color: #111827;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.35;
        }

        .comentario-confirmacao__texto {
          color: #4b5563;
          font-size: 0.91rem;
          line-height: 1.45;
          margin: 0;
        }

        @media (max-width: 768px) {
          sl-split-panel {
            --divider-width: 0px;
            --min: 100%;
            --max: 100%;
          }
        }
      </style>

      <sl-split-panel position="67">
        <sl-icon slot="handle" name="grip-vertical"></sl-icon>
        <div slot="start">
          <sl-tab-group id="tabs-esquerda">
            <sl-tab slot="nav" panel="lexml-emenda-eta">Texto</sl-tab>
            <sl-tab slot="nav" panel="justificativa">Justificação</sl-tab>
            <sl-tab slot="nav" panel="autoria">Destino, Data, Autoria e Impressão</sl-tab>
            <sl-tab slot="nav" panel="avisos">
              Avisos
              <div class="badge-pulse" id="contadorAvisos">${this.totalAlertas > 0 ? html` <sl-badge variant="danger" pill pulse>${this.totalAlertas}</sl-badge> ` : ''}</div>
            </sl-tab>
            <sl-tab-panel name="lexml-emenda-eta" class="overflow-hidden">
              <lexml-emenda-eta
                style="display: ${!this.isEmendaTextoLivre() && !this.isEmendaSubstituicaoTermo() ? 'block' : 'none'}"
                id="lexmlEta"
                .lexmlEtaConfig=${this.lexmlEmendaConfig}
                .idsDispositivosComentados=${this.getIdsDispositivosComentados()}
                @onchange=${this.onChange}
                @abrir-modal-comentario-articulacao=${this.abrirModalAdicionarComentarioArticulacao}
                @selecionar-comentario-articulacao=${this.selecionarComentarioArticulacaoPorDispositivo}
                @abrir-modal-lista-comentarios=${this.abrirModalListaComentarios}
              ></lexml-emenda-eta>
              <lexml-emenda-editor-texto-rico
                style="display: ${this.isEmendaTextoLivre() ? 'block' : 'none'}"
                modo="textoLivre"
                id="lexml-emenda-editor-texto-rico-emenda"
                registroEvento="justificativa"
                @onchange=${this.onChange}
                @abrir-modal-comentario=${this.abrirModalAdicionarComentario}
                @abrir-modal-lista-comentarios=${this.abrirModalListaComentarios}
                @comentario-selecionado=${this.atualizarComentarioAtual}
              ></lexml-emenda-editor-texto-rico>
              <lexml-emenda-substituicao-termo style="display: ${this.isEmendaSubstituicaoTermo() ? 'block' : 'none'}" @onchange=${this.onChange}></lexml-emenda-substituicao-termo>
            </sl-tab-panel>
            <sl-tab-panel name="justificativa" class="overflow-hidden">
              <lexml-emenda-editor-texto-rico
                .lexmlEtaConfig=${this.lexmlEmendaConfig}
                modo="justificativa"
                id="lexml-emenda-editor-texto-rico-justificativa"
                registroEvento="justificativa"
                @onchange=${this.onChange}
                @abrir-modal-comentario=${this.abrirModalAdicionarComentario}
                @abrir-modal-lista-comentarios=${this.abrirModalListaComentarios}
                @comentario-selecionado=${this.atualizarComentarioAtual}
              ></lexml-emenda-editor-texto-rico>
            </sl-tab-panel>
            <sl-tab-panel name="autoria" class="overflow-hidden">
              <div class="tab-autoria__container">
                <lexml-emenda-destino .comissoes=${this.comissoes}></lexml-emenda-destino>
                <br />
                <lexml-emenda-data></lexml-emenda-data>
                <br />
                <lexml-emenda-autoria .parlamentares=${this.parlamentares}></lexml-emenda-autoria>
                <lexml-emenda-opcoes-impressao></lexml-emenda-opcoes-impressao>
              </div>
            </sl-tab-panel>
            <sl-tab-panel name="avisos" class="overflow-hidden">
              <lexml-emenda-alertas></lexml-emenda-alertas>
            </sl-tab-panel>
          </sl-tab-group>
        </div>
        <div slot="end">
          <sl-tab-group id="tabs-direita">
            ${this.tabIsVisible('comando')
              ? html`
                  <sl-tab slot="nav" panel="comando">
                    <sl-icon name="code"></sl-icon>
                    Comando
                  </sl-tab>
                `
              : ''}
            ${this.tabIsVisible('comentarios')
              ? html`
                  <sl-tab slot="nav" panel="comentarios">
                    <sl-icon name="chat-left-text"></sl-icon>
                    Comentários
                  </sl-tab>
                `
              : ''}
            ${this.tabIsVisible('notas')
              ? html`
                  <sl-tab slot="nav" panel="notas" title="Notas de rodapé">
                    <sl-badge variant="primary" id="badgeNotas" pill>
                      <sl-icon name="footnote"></sl-icon>
                      Notas
                    </sl-badge>
                  </sl-tab>
                `
              : ''}
            ${this.tabIsVisible('dicas')
              ? html`
                  <sl-tab slot="nav" panel="dicas">
                    <sl-icon name="lightbulb"></sl-icon>
                    Dicas
                  </sl-tab>
                `
              : ''}
            ${this.tabIsVisible('atalhos')
              ? html`
                  <sl-tab slot="nav" panel="atalhos">
                    <sl-badge variant="primary" id="badgeAtalhos" pill>
                      <sl-icon name="keyboard"></sl-icon>
                      Atalhos
                    </sl-badge>
                  </sl-tab>
                `
              : ''}
            <sl-tab-panel name="comando" class="overflow-hidden">
              <lexml-emenda-comando></lexml-emenda-comando>
            </sl-tab-panel>
            <sl-tab-panel name="comentarios" class="overflow-hidden"> ${this.renderComentariosEstaticos()} </sl-tab-panel>
            <sl-tab-panel name="notas" class="overflow-hidden">
              <div class="notas-rodape">
                <h4>Notas de rodapé</h4>
                ${this.renderNotasRodape()}
              </div>
            </sl-tab-panel>
            <sl-tab-panel name="dicas" class="overflow-hidden">
              <lexml-emenda-ajuda></lexml-emenda-ajuda>
            </sl-tab-panel>
            <sl-tab-panel name="atalhos" class="overflow-hidden">
              <lexml-emenda-atalhos></lexml-emenda-atalhos>
            </sl-tab-panel>
          </sl-tab-group>
        </div>
      </sl-split-panel>
      ${this.renderModalComentario()} ${this.renderModalListaComentarios()} ${this.renderModalExcluirSequenciaComentario()} ${this.renderModalExcluirComentario()}
    `;
  }

  tabIsVisible(tab: string): boolean {
    if ((tab === 'atalhos' || tab === 'dicas') && this.modo === 'emendaSubstituicaoTermo') {
      return false;
    } else if (tab === 'comentarios') {
      return this.modo.startsWith('emenda') && !this.isEmendaSubstituicaoTermo();
    } else if (tab === 'notas' && (this.isEmendaTextoLivre() || this.modo === 'edicao')) {
      return true;
    }
    return this.modo.startsWith('emenda') && !this.isEmendaTextoLivre();
  }

  onChangeNotasRodape(): void {
    this.notasRodape = this._lexmlJustificativa.notasRodape;
    this.focusOnTab('notas');
  }

  renderComentariosEstaticos(): TemplateResult {
    const sequenciasComentario = this.getSequenciasComentarioOrdenadas();

    return html`
      <div class="comentarios">
        <div class="comentarios__cabecalho">
          <h4>Comentários</h4>
          <label class="comentarios__ordenacao-container">
            <select class="comentarios__ordenacao" aria-label="Ordenação dos comentários" .value=${this.ordenacaoComentarios} @change=${this.alterarOrdenacaoComentarios}>
              <option value="texto">Ordem no texto</option>
              <option value="recentes">Mais recentes</option>
            </select>
          </label>
        </div>
        ${sequenciasComentario.length
          ? html`<div class="comentarios__lista">${sequenciasComentario.map(seq => this.renderSequenciaComentario(seq))}</div>`
          : html`<span class="comentarios-texto-vazio">Não há comentários registrados.</span>`}
      </div>
    `;
  }

  private alterarOrdenacaoComentarios = (event: Event): void => {
    const value = (event.target as HTMLSelectElement).value;
    this.ordenacaoComentarios = value === 'texto' ? 'texto' : 'recentes';
    this.rolarParaComentarioAtual();
  };

  private atualizarComentarioAtual = (event: CustomEvent): void => {
    const idSequenciaComentario = event.detail?.idSequenciaComentario;
    const abrirAbaComentarios = !!event.detail?.abrirAbaComentarios;
    const idAtual = this.sequenciasComentario.some(seq => seq.id === idSequenciaComentario) ? idSequenciaComentario : undefined;

    if (this.idSequenciaComentarioAtual === idAtual) {
      if (idAtual && abrirAbaComentarios) {
        this.exibirComentarioAtualNaLista();
      } else if (idAtual) {
        this.rolarParaSequenciaComentario(idAtual);
      }
      return;
    }

    this.idSequenciaComentarioAtual = idAtual;

    if (idAtual && abrirAbaComentarios) {
      this.exibirComentarioAtualNaLista();
      return;
    }

    if (idAtual) {
      this.rolarParaComentarioAtual();
    }
  };

  private sincronizarComentarioAtualComDispositivoSelecionado(elemento?: Elemento): void {
    const sequenciaComentario =
      elemento?.lexmlId && elemento.tipo !== TipoDispositivo.articulacao.tipo ? this.getSequenciaComentarioPorDispositivo(elemento.lexmlId, elemento.uuid2) : undefined;
    const idAtual = sequenciaComentario?.id;

    if (sequenciaComentario) {
      this.atualizarIdDispositivoSequenciaComentario(sequenciaComentario);
    }

    if (this.idSequenciaComentarioAtual === idAtual) {
      if (idAtual) {
        this.rolarParaSequenciaComentario(idAtual);
      }
      return;
    }

    if (!idAtual && !this.isComentarioArticulacao(this.sequenciasComentario.find(seq => seq.id === this.idSequenciaComentarioAtual))) {
      return;
    }

    this.idSequenciaComentarioAtual = idAtual;

    if (idAtual) {
      this.rolarParaComentarioAtual();
    }
  }

  private isAbaComentariosAtiva(): boolean {
    const activeTab = this._tabsDireita?.getActiveTab?.();
    if (activeTab) {
      return activeTab.panel === 'comentarios';
    }

    return !!this.querySelector('sl-tab[panel="comentarios"][active], sl-tab-panel[name="comentarios"][active]');
  }

  private rolarParaComentarioAtual(): void {
    if (!this.idSequenciaComentarioAtual) {
      return;
    }

    this.rolarParaSequenciaComentario(this.idSequenciaComentarioAtual);
  }

  private rolarParaSequenciaComentario(idSequenciaComentario: string): void {
    void this.updateComplete.then(() => {
      const rolar = (): void => {
        const painelComentarios = this.getPainelComentariosVisivel();
        const card = painelComentarios?.querySelector(`[data-id-sequencia-comentario="${idSequenciaComentario}"]`) as HTMLElement | null;
        if (card && this.isElementoVisivel(card)) {
          this.rolarCardComentarioParaPosicao(card, 0.25);
        }
      };

      window.requestAnimationFrame(() => {
        rolar();
        window.requestAnimationFrame(rolar);
        setTimeout(rolar, 80);
        setTimeout(rolar, 200);
      });
    });
  }

  private getPainelComentariosVisivel(): HTMLElement | undefined {
    const comentariosModal = this.listaComentariosModal?.querySelector?.('.comentarios') as HTMLElement | null;
    if (this.modalListaComentariosAberto && comentariosModal && this.isElementoVisivel(comentariosModal)) {
      return comentariosModal;
    }

    const painel = this.querySelector('sl-tab-panel[name="comentarios"]') as HTMLElement | null;
    return painel && this.isElementoVisivel(painel) ? painel : undefined;
  }

  private isElementoVisivel(elemento: HTMLElement): boolean {
    return elemento.offsetWidth > 0 || elemento.offsetHeight > 0 || elemento.getClientRects().length > 0;
  }

  private rolarCardComentarioParaPosicao(card: HTMLElement, proporcaoAltura: number): void {
    const containerRolagem = this.getContainerRolagemComentario(card);
    if (!containerRolagem?.clientHeight) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const containerRect = containerRolagem.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const topAtualCardNoContainer = cardRect.top - containerRect.top + containerRolagem.scrollTop;

    containerRolagem.scrollTo({ top: Math.max(0, topAtualCardNoContainer - containerRolagem.clientHeight * proporcaoAltura), behavior: 'smooth' });
  }

  private getContainerRolagemComentario(card: HTMLElement): HTMLElement | undefined {
    const tabPanel = card.closest('sl-tab-panel') as HTMLElement | null;
    const tabPanelBase = tabPanel?.shadowRoot?.querySelector('[part~="base"]') as HTMLElement | null;
    if (tabPanelBase?.clientHeight) {
      return tabPanelBase;
    }

    let atual = card.parentElement;
    while (atual && atual !== this) {
      const style = window.getComputedStyle(atual);
      if (['auto', 'scroll', 'overlay'].includes(style.overflowY) && atual.scrollHeight > atual.clientHeight) {
        return atual;
      }
      atual = atual.parentElement;
    }

    return undefined;
  }

  private limparComentarioAtual(): void {
    if (!this.idSequenciaComentarioAtual) {
      this._lexmlJustificativa?.limparDestaqueComentarioSelecionado?.(false);
      this._lexmlEmendaTextoRico?.limparDestaqueComentarioSelecionado?.(false);
      return;
    }

    this.idSequenciaComentarioAtual = undefined;
    this._lexmlJustificativa?.limparDestaqueComentarioSelecionado?.(false);
    this._lexmlEmendaTextoRico?.limparDestaqueComentarioSelecionado?.(false);
  }

  private getSequenciasComentarioOrdenadas(): SequenciaComentario[] {
    const sequenciasComIndice = this.sequenciasComentario.map((seq, index) => ({ seq, index }));

    if (this.ordenacaoComentarios === 'texto') {
      const posicoesSequenciasComentario = this.getPosicoesSequenciasComentario();
      return sequenciasComIndice
        .sort((a, b) => {
          const local = this.getOrdemLocalComentario(a.seq.local) - this.getOrdemLocalComentario(b.seq.local);
          if (local !== 0) {
            return local;
          }

          const posicaoA = posicoesSequenciasComentario.get(a.seq.id) ?? Number.MAX_SAFE_INTEGER;
          const posicaoB = posicoesSequenciasComentario.get(b.seq.id) ?? Number.MAX_SAFE_INTEGER;
          const posicao = posicaoA - posicaoB;
          return posicao !== 0 ? posicao : a.index - b.index;
        })
        .map(item => item.seq);
    }

    return sequenciasComIndice
      .sort((a, b) => {
        const data = this.getDataUltimoComentario(b.seq) - this.getDataUltimoComentario(a.seq);
        return data !== 0 ? data : a.index - b.index;
      })
      .map(item => item.seq);
  }

  private getOrdemLocalComentario(local: TipoLocalComentario): number {
    return local === TipoLocalComentario.TEXTO ? 0 : 1;
  }

  private getPosicoesSequenciasComentario(): Map<string, number> {
    const posicoesDispositivosArticulacao = this.getPosicoesDispositivosArticulacao();
    return new Map(this.sequenciasComentario.map(seq => [seq.id, this.getPosicaoSequenciaComentario(seq, posicoesDispositivosArticulacao)]));
  }

  private getPosicoesDispositivosArticulacao(): Map<string, number> {
    const articulacao = rootStore.getState().elementoReducer.articulacao;
    const elementos = articulacao ? getElementos(articulacao) : [];
    const posicoes = new Map<string, number>();

    elementos.forEach((elemento, index) => {
      elemento.lexmlId && posicoes.set(elemento.lexmlId, index);
      elemento.uuid2 && posicoes.set(elemento.uuid2, index);
    });

    return posicoes;
  }

  private getPosicaoSequenciaComentario(seq: SequenciaComentario, posicoesDispositivosArticulacao?: Map<string, number>): number {
    if (this.isComentarioArticulacao(seq)) {
      const posicoes = posicoesDispositivosArticulacao ?? this.getPosicoesDispositivosArticulacao();
      const uuid2 = this.getUuid2DispositivoComentario(seq);
      const posicao = uuid2 ? posicoes.get(uuid2) : posicoes.get(seq.idDispositivo!);
      return typeof posicao === 'number' ? posicao : Number.MAX_SAFE_INTEGER;
    }

    const posicao = this.getEditorTextoRicoByLocalComentario(seq.local)?.getIndiceComentario?.(seq.id);
    return typeof posicao === 'number' ? posicao : Number.MAX_SAFE_INTEGER;
  }

  private getDataUltimoComentario(seq: SequenciaComentario): number {
    const dataHora = seq.comentarios[seq.comentarios.length - 1]?.dataHora;
    const timestamp = dataHora ? new Date(dataHora.replace(' ', 'T')).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private selecionarSequenciaComentario(idSequenciaComentario: string, event?: Event, manterFocoNoCard = false): void {
    if (event && this.isEventoEmElementoInterativo(event)) {
      return;
    }

    const sequenciaComentario = this.sequenciasComentario.find(seq => seq.id === idSequenciaComentario);
    if (!sequenciaComentario) {
      return;
    }

    this.idSequenciaComentarioAtual = idSequenciaComentario;
    (event?.currentTarget as HTMLElement | undefined)?.focus?.();
    this.preservarComentarioNaTrocaAba = true;
    this._tabsEsquerda?.show(this.getNomeAbaComentario(sequenciaComentario.local));
    setTimeout(() => {
      this.preservarComentarioNaTrocaAba = false;
    }, 0);
    this.rolarParaComentarioAtual();
    this.posicionarCursorNoComentario(sequenciaComentario, manterFocoNoCard);
    this.fecharModalListaComentarios();
  }

  private navegarSequenciaComentarioPorTeclado(event: KeyboardEvent, idSequenciaComentario: string): void {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || this.isEventoEmElementoInterativo(event)) {
      return;
    }

    const sequenciasComentario = this.getSequenciasComentarioOrdenadas();
    const indexAtual = sequenciasComentario.findIndex(seq => seq.id === idSequenciaComentario);
    const proximoIndex = event.key === 'ArrowDown' ? indexAtual + 1 : indexAtual - 1;
    const proximaSequencia = sequenciasComentario[proximoIndex];
    if (!proximaSequencia) {
      return;
    }

    event.preventDefault();
    this.selecionarSequenciaComentario(proximaSequencia.id, undefined, true);
  }

  private isEventoEmElementoInterativo(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    return !!target?.closest?.('button, sl-button, textarea, input, select, a');
  }

  private getNomeAbaComentario(local: TipoLocalComentario): string {
    return local === TipoLocalComentario.TEXTO ? 'lexml-emenda-eta' : 'justificativa';
  }

  private posicionarCursorNoComentario(sequenciaComentario: SequenciaComentario, manterFocoNoCard = false): void {
    const idSequenciaComentario = sequenciaComentario.id;
    if (this.isComentarioArticulacao(sequenciaComentario)) {
      setTimeout(() => {
        this._lexmlEta?.selecionarDispositivoPorId(sequenciaComentario.idDispositivo!, this.getUuid2DispositivoComentario(sequenciaComentario));
        if (this.sequenciasComentario.some(seq => seq.id === idSequenciaComentario)) {
          this.idSequenciaComentarioAtual = idSequenciaComentario;
        }
        if (manterFocoNoCard) {
          this.focarCardSequenciaComentario(idSequenciaComentario);
        }
      }, 0);
      return;
    }

    setTimeout(() => {
      this.getEditorTextoRicoByLocalComentario(sequenciaComentario.local)?.posicionarCursorComentario?.(idSequenciaComentario);
      if (this.sequenciasComentario.some(seq => seq.id === idSequenciaComentario)) {
        this.idSequenciaComentarioAtual = idSequenciaComentario;
      }
      if (manterFocoNoCard) {
        this.focarCardSequenciaComentario(idSequenciaComentario);
      }
    }, 0);
  }

  private focarCardSequenciaComentario(idSequenciaComentario: string): void {
    void this.updateComplete.then(() => {
      const card = this.querySelector(`[data-id-sequencia-comentario="${idSequenciaComentario}"]`) as HTMLElement | null;
      card?.focus();
    });
  }

  private renderSequenciaComentario(seq: SequenciaComentario): TemplateResult {
    const origemLabel = seq.local === TipoLocalComentario.JUSTIFICACAO ? 'Na justificação' : 'No texto';
    const origemClass = seq.local === TipoLocalComentario.JUSTIFICACAO ? 'comentario-sequencia__origem--justificativa' : 'comentario-sequencia__origem--texto';
    const trecho = this.getTrechoComentario(seq);
    const selecionada = this.idSequenciaComentarioAtual === seq.id;

    return html`
      <article
        class="comentario-sequencia ${selecionada ? 'comentario-sequencia--selecionada' : ''}"
        data-id-sequencia-comentario=${seq.id}
        tabindex="0"
        aria-selected=${selecionada ? 'true' : 'false'}
        @click=${(event: MouseEvent) => this.selecionarSequenciaComentario(seq.id, event)}
        @keydown=${(event: KeyboardEvent) => this.navegarSequenciaComentarioPorTeclado(event, seq.id)}
      >
        <div class="comentario-sequencia__topo">
          <span class="comentario-sequencia__origem ${origemClass}">${origemLabel}</span>
          <span class="comentario-sequencia__acoes">
            <button type="button" class="comentario-sequencia__acao" @click=${() => this.abrirModalResponderComentario(seq.id)}>
              <span class="comentario-sequencia__seta" aria-hidden="true"></span>
              Responder
            </button>
            <button
              type="button"
              class="comentario-sequencia__acao comentario-sequencia__acao--excluir"
              title="Excluir sequência de comentários"
              aria-label="Excluir sequência de comentários"
              @click=${() => this.abrirModalExcluirSequenciaComentario(seq.id)}
            >
              <sl-icon name="trash"></sl-icon>
            </button>
          </span>
        </div>
        <blockquote class="comentario-sequencia__trecho">
          <span class="comentario-sequencia__trecho-conteudo">
            <span class="comentario-sequencia__trecho-texto">${trecho}</span>
          </span>
        </blockquote>
        <div class="comentario-sequencia__comentarios">${seq.comentarios.map((comentario, index) => this.renderComentarioEstatico(seq, comentario, index))}</div>
      </article>
    `;
  }

  private renderComentarioEstatico(seq: SequenciaComentario, comentario: Comentario, indexComentario: number): TemplateResult {
    const resposta = indexComentario > 0;
    const comentarioDoUsuarioAtual = this.isComentarioDoUsuarioAtual(comentario);
    const editavel = comentarioDoUsuarioAtual;
    const excluivel = comentarioDoUsuarioAtual && seq.comentarios.length > 1;
    const dataHoraFormatada = this.formatarDataHoraComentarioVisual(comentario.dataHora);
    return html`
      <section class="comentario-item ${resposta ? 'comentario-item--resposta' : ''}">
        <div class="comentario-item__cabecalho">
          <span class="comentario-item__autor">${comentario.usuario?.nome || 'Anônimo'}</span>
          <span class="comentario-item__data" title=${comentario.dataHora}>${dataHoraFormatada}</span>
        </div>
        <p class="comentario-item__texto">${comentario.texto}</p>
        ${editavel
          ? html`
              <span class="comentario-item__acoes">
                <button
                  type="button"
                  class="comentario-item__acao"
                  title="Editar comentário"
                  aria-label="Editar comentário"
                  @click=${() => this.abrirModalEditarComentario(seq.id, indexComentario)}
                >
                  <sl-icon name="pencil-square"></sl-icon>
                  Editar
                </button>
                ${excluivel
                  ? html`
                      <button
                        type="button"
                        class="comentario-item__acao comentario-item__acao--excluir"
                        title="Excluir comentário"
                        aria-label="Excluir comentário"
                        @click=${() => this.abrirModalExcluirComentario(seq.id, indexComentario)}
                      >
                        <sl-icon name="trash"></sl-icon>
                        Excluir
                      </button>
                    `
                  : ''}
              </span>
            `
          : ''}
      </section>
    `;
  }

  private getTrechoComentario(seq: SequenciaComentario): string {
    if (this.isComentarioArticulacao(seq)) {
      return this.getIdentificacaoDispositivoComentario(seq.idDispositivo, undefined, seq);
    }

    const editor = this.getEditorTextoRicoByLocalComentario(seq.local);
    const trecho = editor?.getTextoComentario?.(seq.id);
    return typeof trecho === 'string' && trecho.length > 0 ? trecho : 'Trecho comentado não localizado.';
  }

  private isComentarioArticulacao(seq?: SequenciaComentario): boolean {
    return !!seq?.idDispositivo && seq.local === TipoLocalComentario.TEXTO;
  }

  private isComentarioEmenta(seq?: SequenciaComentario): boolean {
    return this.isComentarioArticulacao(seq) && seq?.idDispositivo === 'ementa';
  }

  private getIdsDispositivosComentados(): string[] {
    const sequenciasArticulacao = this.sequenciasComentario.filter(seq => this.isComentarioArticulacao(seq));
    const key = sequenciasArticulacao.map(seq => `${seq.id}:${seq.idDispositivo || ''}:${this.uuid2DispositivoPorSequenciaComentario.get(seq.id) || ''}`).join('|');
    if (key === this.idsDispositivosComentadosCacheKey) {
      return this.idsDispositivosComentadosCache;
    }

    const ids = new Set<string>();
    sequenciasArticulacao.forEach(seq => {
      const uuid2 = this.getUuid2DispositivoComentario(seq);
      if (uuid2) {
        ids.add(uuid2);
      } else {
        seq.idDispositivo && ids.add(seq.idDispositivo);
      }
    });

    this.idsDispositivosComentadosCache = [...ids];
    this.idsDispositivosComentadosCacheKey = sequenciasArticulacao
      .map(seq => `${seq.id}:${seq.idDispositivo || ''}:${this.uuid2DispositivoPorSequenciaComentario.get(seq.id) || ''}`)
      .join('|');
    return this.idsDispositivosComentadosCache;
  }

  private getSequenciaComentarioPorDispositivo(idDispositivo: string, uuid2Dispositivo?: string): SequenciaComentario | undefined {
    const sequenciasArticulacao = this.sequenciasComentario.filter(seq => this.isComentarioArticulacao(seq));

    if (uuid2Dispositivo) {
      const sequenciaPorUuid2 = sequenciasArticulacao.find(seq => this.getUuid2DispositivoComentario(seq) === uuid2Dispositivo);
      if (sequenciaPorUuid2) {
        return sequenciaPorUuid2;
      }

      return sequenciasArticulacao.find(seq => (this.isComentarioEmenta(seq) || !this.uuid2DispositivoPorSequenciaComentario.has(seq.id)) && seq.idDispositivo === idDispositivo);
    }

    return sequenciasArticulacao.find(seq => seq.idDispositivo === idDispositivo);
  }

  private selecionarComentarioArticulacaoPorDispositivo = (event: CustomEvent): void => {
    const idDispositivo = event.detail?.idDispositivo;
    const uuid2Dispositivo = event.detail?.uuid2Dispositivo;
    const sequenciaComentario = idDispositivo || uuid2Dispositivo ? this.getSequenciaComentarioPorDispositivo(idDispositivo, uuid2Dispositivo) : undefined;
    if (!sequenciaComentario) {
      return;
    }

    this.atualizarIdDispositivoSequenciaComentario(sequenciaComentario);
    this.idSequenciaComentarioAtual = sequenciaComentario.id;
    this.exibirComentarioAtualNaLista();
  };

  private getIdentificacaoDispositivoComentario(idDispositivo?: string, elemento?: Elemento, sequenciaComentario?: SequenciaComentario): string {
    const dispositivo = sequenciaComentario ? this.getDispositivoComentarioArticulacao(sequenciaComentario) : this.getDispositivoPorIdComentario(idDispositivo);
    if (dispositivo) {
      return this.formatarIdentificacaoDispositivo(dispositivo);
    }

    return this.formatarIdentificacaoElemento(elemento) || 'Dispositivo comentado';
  }

  private getDispositivoPorIdComentario(idDispositivo?: string): Dispositivo | undefined {
    const articulacao = rootStore.getState().elementoReducer.articulacao;
    const dispositivo = idDispositivo && articulacao ? buscaDispositivoById(articulacao, idDispositivo) : undefined;
    return dispositivo && dispositivo.tipo !== TipoDispositivo.articulacao.tipo ? dispositivo : undefined;
  }

  private getDispositivoComentarioArticulacao(seq: SequenciaComentario): Dispositivo | undefined {
    const articulacao = rootStore.getState().elementoReducer.articulacao;
    if (!articulacao || !this.isComentarioArticulacao(seq)) {
      return undefined;
    }

    if (this.isComentarioEmenta(seq)) {
      return this.getDispositivoPorIdComentario(seq.idDispositivo);
    }

    const uuid2 = this.uuid2DispositivoPorSequenciaComentario.get(seq.id);
    const dispositivoPorUuid2 = uuid2 ? (findDispositivoByUuid2(articulacao, uuid2) as Dispositivo | null) : null;
    if (uuid2) {
      return dispositivoPorUuid2 && dispositivoPorUuid2.tipo !== TipoDispositivo.articulacao.tipo ? dispositivoPorUuid2 : undefined;
    }

    const dispositivoPorId = this.getDispositivoPorIdComentario(seq.idDispositivo);
    if (dispositivoPorId) {
      dispositivoPorId.uuid2 && this.uuid2DispositivoPorSequenciaComentario.set(seq.id, dispositivoPorId.uuid2);
      return dispositivoPorId;
    }

    return undefined;
  }

  private getUuid2DispositivoComentario(seq: SequenciaComentario): string | undefined {
    if (this.isComentarioEmenta(seq)) {
      return undefined;
    }

    const uuid2 = this.uuid2DispositivoPorSequenciaComentario.get(seq.id);
    if (uuid2) {
      return uuid2;
    }

    const dispositivo = this.getDispositivoPorIdComentario(seq.idDispositivo);
    if (dispositivo?.uuid2) {
      this.uuid2DispositivoPorSequenciaComentario.set(seq.id, dispositivo.uuid2);
      return dispositivo.uuid2;
    }

    return undefined;
  }

  private getIdAtualDispositivo(dispositivo: Dispositivo): string {
    return createElemento(dispositivo).lexmlId || dispositivo.id || '';
  }

  private atualizarIdDispositivoSequenciaComentario(sequenciaComentario: SequenciaComentario): void {
    const dispositivo = this.getDispositivoComentarioArticulacao(sequenciaComentario);
    const idAtual = dispositivo ? this.getIdAtualDispositivo(dispositivo) : '';
    if (!idAtual || idAtual === sequenciaComentario.idDispositivo) {
      return;
    }

    this.sequenciasComentario = this.sequenciasComentario.map(seq =>
      seq.id === sequenciaComentario.id ? Object.assign(new SequenciaComentario(), seq, { idDispositivo: idAtual }) : seq
    );
  }

  private agendarSincronizacaoReferenciasComentariosArticulacao(removerSequenciasOrfas = false): void {
    window.clearTimeout(this.timerSincronizacaoComentariosArticulacao);
    this.timerSincronizacaoComentariosArticulacao = window.setTimeout(() => {
      this.timerSincronizacaoComentariosArticulacao = undefined;
      this.sincronizarReferenciasComentariosArticulacao(removerSequenciasOrfas);
    }, 0);
  }

  private sincronizarReferenciasComentariosArticulacao(removerSequenciasOrfas = false): void {
    if (!this.sequenciasComentario.some(seq => this.isComentarioArticulacao(seq))) {
      return;
    }

    const articulacao = rootStore.getState().elementoReducer.articulacao;
    if (!articulacao) {
      return;
    }

    let houveAtualizacao = false;
    const idsRemovidos: string[] = [];
    const sequenciasComentario = this.sequenciasComentario
      .map(seq => {
        if (!this.isComentarioArticulacao(seq)) {
          return seq;
        }

        const dispositivo = this.getDispositivoComentarioArticulacao(seq);
        const idAtual = dispositivo ? this.getIdAtualDispositivo(dispositivo) : '';
        if (!idAtual && removerSequenciasOrfas) {
          idsRemovidos.push(seq.id);
          houveAtualizacao = true;
          return undefined;
        }

        if (!idAtual) {
          return seq;
        }

        if (idAtual === seq.idDispositivo) {
          return seq;
        }

        houveAtualizacao = true;
        return Object.assign(new SequenciaComentario(), seq, { idDispositivo: idAtual });
      })
      .filter((seq): seq is SequenciaComentario => !!seq);

    if (houveAtualizacao) {
      this.sequenciasComentario = sequenciasComentario;
      idsRemovidos.forEach(idSequenciaComentario => this.limparEstadoSequenciaComentario(idSequenciaComentario));
      idsRemovidos.length && this.atualizarAlertaGlobalComentarios();
    }
  }

  private formatarIdentificacaoElemento(elemento?: Elemento): string {
    if (!elemento) {
      return '';
    }

    const tipo = this.getDescricaoTipoDispositivo(elemento.tipo);
    const numero = elemento.rotulo || elemento.numero || '';
    return `${tipo} ${numero}`.trim();
  }

  private formatarIdentificacaoDispositivo(dispositivo: Dispositivo): string {
    const partes: string[] = [];
    let atual: Dispositivo | undefined = dispositivo;

    while (atual && atual.tipo !== TipoDispositivo.articulacao.tipo && partes.length < 6) {
      if (atual.tipo !== TipoDispositivo.caput.tipo || atual === dispositivo) {
        const parte = this.formatarParteIdentificacaoDispositivo(atual);
        parte && partes.push(parte);
      }
      atual = atual.pai;
    }

    return partes.length ? partes.join(' do ') : 'Dispositivo comentado';
  }

  private formatarParteIdentificacaoDispositivo(dispositivo: Dispositivo): string {
    const numero = dispositivo.rotulo || dispositivo.numero || '';

    switch (dispositivo.tipo) {
      case TipoDispositivo.artigo.tipo:
        return (numero || 'artigo').replace(/^Art\./i, 'art.');
      case TipoDispositivo.paragrafo.tipo:
        return numero || 'parágrafo';
      case TipoDispositivo.inciso.tipo:
        return `inciso ${numero}`.trim();
      case TipoDispositivo.alinea.tipo:
        return `alínea ${numero}`.trim();
      case TipoDispositivo.item.tipo:
        return `item ${numero}`.trim();
      case TipoDispositivo.caput.tipo:
        return 'caput';
      case TipoDispositivo.ementa.tipo:
        return 'ementa';
      default:
        return `${this.getDescricaoTipoDispositivo(dispositivo.tipo)} ${numero}`.trim();
    }
  }

  private getDescricaoTipoDispositivo(tipo?: string): string {
    const tipoDispositivo = Object.values(TipoDispositivo).find(item => item.tipo === tipo);
    return tipoDispositivo?.descricao?.toLowerCase() || tipo?.toLowerCase() || 'dispositivo';
  }

  private getEditorTextoRicoByLocalComentario(local: TipoLocalComentario): any {
    return local === TipoLocalComentario.TEXTO ? this._lexmlEmendaTextoRico : this._lexmlJustificativa;
  }

  private isComentarioDoUsuarioAtual(comentario: Comentario): boolean {
    const usuarioAtual = rootStore.getState().elementoReducer.usuario;
    if (!usuarioAtual) {
      return false;
    }
    return comentario.usuario?.id ? comentario.usuario.id === usuarioAtual.id : comentario.usuario?.nome === usuarioAtual.nome;
  }

  private formatarDataHoraComentarioVisual(dataHora: string): string {
    const match = dataHora?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!match) {
      return dataHora || '';
    }

    const [, ano, mes, dia, hora, minuto] = match;
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }

  private renderModalComentario(): TemplateResult {
    return html`
      <sl-dialog id="lexml-emenda-comentario-modal" class="comentario-dialog" label=${this.tituloModalComentario}>
        ${this.acaoModalComentario === 'adicionar' && this.textoTrechoComentarioAtual
          ? html`
              <div class="comentario-modal__grupo">
                <span class="comentario-modal__label">Trecho selecionado</span>
                <div class="comentario-modal__trecho">
                  <span class="comentario-modal__trecho-conteudo">
                    <span class="comentario-modal__trecho-texto">${this.textoTrechoComentarioAtual}</span>
                  </span>
                </div>
              </div>
            `
          : ''}
        <div class="comentario-modal__campo">
          <label class="comentario-modal__label" for="lexml-emenda-comentario-textarea">Comentário</label>
          <textarea
            id="lexml-emenda-comentario-textarea"
            class="comentario-modal__textarea"
            maxlength="500"
            placeholder=${this.getPlaceholderModalComentario()}
            @input=${this.atualizarContadorComentario}
          ></textarea>
          <span class="comentario-modal__contador">${this.tamanhoTextoModalComentario} / 500 caracteres</span>
        </div>
        <div slot="footer" class="comentario-dialog__footer">
          <sl-button variant="default" @click=${this.fecharModalComentario}>Cancelar</sl-button>
          <sl-button variant="primary" ?disabled=${!this.comentarioModalPossuiTexto} @click=${this.confirmarComentarioEstatico}>
            <span slot="prefix" class="comentario-modal__botao-icone">${unsafeHTML(iconeComentario)}</span>
            Comentar
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }

  private renderModalListaComentarios(): TemplateResult {
    return html`
      <sl-dialog
        id="lexml-emenda-lista-comentarios-modal"
        class="comentario-dialog comentario-dialog--lista"
        label="Comentários"
        @sl-after-hide=${this.marcarModalListaComentariosFechado}
      >
        <span slot="label" class="comentario-dialog__titulo-lista">
          <sl-icon name="chat-left-text" aria-hidden="true"></sl-icon>
          <span>Comentários</span>
        </span>
        ${this.modalListaComentariosAberto ? this.renderComentariosEstaticos() : ''}
        <div slot="footer" class="comentario-dialog__footer">
          <sl-button variant="primary" @click=${this.fecharModalListaComentarios}>Fechar</sl-button>
        </div>
      </sl-dialog>
    `;
  }

  private renderModalExcluirSequenciaComentario(): TemplateResult {
    return html`
      <sl-dialog id="lexml-emenda-excluir-sequencia-comentario-modal" class="comentario-dialog comentario-dialog--confirmacao" label="Confirmar exclusão">
        <div class="comentario-confirmacao">
          <span class="comentario-confirmacao__icone" aria-hidden="true">
            <sl-icon name="trash"></sl-icon>
          </span>
          <div class="comentario-confirmacao__conteudo">
            <span class="comentario-confirmacao__titulo">Excluir esta sequência de comentários?</span>
            <p class="comentario-confirmacao__texto">Esta ação removerá todos os comentários e respostas associados ao trecho. Essa operação não poderá ser desfeita.</p>
          </div>
        </div>
        <div slot="footer" class="comentario-dialog__footer">
          <sl-button variant="default" @click=${this.fecharModalExcluirSequenciaComentario}>Cancelar</sl-button>
          <sl-button variant="danger" @click=${this.confirmarExcluirSequenciaComentario}>
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Excluir
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }

  private renderModalExcluirComentario(): TemplateResult {
    return html`
      <sl-dialog id="lexml-emenda-excluir-comentario-modal" class="comentario-dialog comentario-dialog--confirmacao" label="Confirmar exclusão">
        <div class="comentario-confirmacao">
          <span class="comentario-confirmacao__icone" aria-hidden="true">
            <sl-icon name="trash"></sl-icon>
          </span>
          <div class="comentario-confirmacao__conteudo">
            <span class="comentario-confirmacao__titulo">Excluir este comentário?</span>
            <p class="comentario-confirmacao__texto">Esta ação removerá apenas este comentário da sequência. O trecho comentado e as demais respostas serão mantidos.</p>
          </div>
        </div>
        <div slot="footer" class="comentario-dialog__footer">
          <sl-button variant="default" @click=${this.fecharModalExcluirComentario}>Cancelar</sl-button>
          <sl-button variant="danger" @click=${this.confirmarExcluirComentario}>
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Excluir
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }

  private abrirModalListaComentarios = (): void => {
    this.modalListaComentariosAberto = true;
    void this.updateComplete.then(() => {
      this.listaComentariosModal?.show();
      this.rolarParaComentarioAtual();
    });
  };

  private fecharModalListaComentarios = (): void => {
    this.modalListaComentariosAberto = false;
    this.listaComentariosModal?.hide();
  };

  private marcarModalListaComentariosFechado = (): void => {
    this.modalListaComentariosAberto = false;
  };

  private isModoMobileOuTablet(): boolean {
    return window.innerWidth <= this.TABLET_WIDTH;
  }

  private exibirComentarioAtualNaLista(): void {
    if (this.isModoMobileOuTablet()) {
      this.abrirModalListaComentarios();
      return;
    }

    this._tabsDireita?.show('comentarios');
    this.rolarParaComentarioAtual();
  }

  private abrirModalAdicionarComentario = (event?: CustomEvent): void => {
    this.acaoModalComentario = 'adicionar';
    this.comentarioEdicaoAtual = undefined;
    this.idSequenciaComentarioRespostaAtual = undefined;
    this.comentarioArticulacaoAtual = undefined;
    this.textoTrechoComentarioAtual = event?.detail?.texto || '';
    this.editorComentarioAtual = event?.target;
    this.rangeComentarioAtual = event?.detail?.range;
    this.modoComentarioAtual = event?.detail?.modo || '';
    this.abrirModalComentario('Adicionar comentário');
  };

  private abrirModalAdicionarComentarioArticulacao = (event: CustomEvent): void => {
    const elemento = event.detail?.elemento as Elemento | undefined;
    const idDispositivo = event.detail?.idDispositivo || elemento?.lexmlId;

    if (!elemento || !idDispositivo || this.getSequenciaComentarioPorDispositivo(idDispositivo, elemento.uuid2)) {
      return;
    }

    this.acaoModalComentario = 'adicionar';
    this.comentarioEdicaoAtual = undefined;
    this.idSequenciaComentarioRespostaAtual = undefined;
    this.editorComentarioAtual = undefined;
    this.rangeComentarioAtual = undefined;
    this.modoComentarioAtual = 'articulacao';
    this.comentarioArticulacaoAtual = { elemento, idDispositivo };
    this.textoTrechoComentarioAtual = this.getIdentificacaoDispositivoComentario(idDispositivo, elemento);
    this.abrirModalComentario('Adicionar comentário');
  };

  private abrirModalResponderComentario = (idSequenciaComentario: string): void => {
    if (!this.sequenciasComentario.some(seq => seq.id === idSequenciaComentario)) {
      return;
    }

    this.acaoModalComentario = 'responder';
    this.comentarioEdicaoAtual = undefined;
    this.comentarioArticulacaoAtual = undefined;
    this.idSequenciaComentarioRespostaAtual = idSequenciaComentario;
    this.textoTrechoComentarioAtual = '';
    this.abrirModalComentario('Responder comentário');
  };

  private abrirModalEditarComentario = (idSequenciaComentario: string, indexComentario: number): void => {
    const comentario = this.getComentarioPorSequenciaEIndice(idSequenciaComentario, indexComentario);
    if (!comentario || !this.isComentarioDoUsuarioAtual(comentario)) {
      return;
    }

    this.acaoModalComentario = 'editar';
    this.comentarioEdicaoAtual = { idSequenciaComentario, indexComentario };
    this.comentarioArticulacaoAtual = undefined;
    this.idSequenciaComentarioRespostaAtual = undefined;
    this.textoTrechoComentarioAtual = '';
    this.abrirModalComentario('Editar comentário', comentario.texto);
  };

  private abrirModalComentario(titulo: string, textoInicial = ''): void {
    this.tituloModalComentario = titulo;
    this.tamanhoTextoModalComentario = textoInicial.length;
    this.comentarioModalPossuiTexto = textoInicial.trim().length > 0;
    setTimeout(() => {
      if (this.comentarioTextarea) {
        this.comentarioTextarea.value = textoInicial;
        this.atualizarEstadoTextoModalComentario(this.comentarioTextarea.value);
      }
      this.comentarioModal?.show();
      this.comentarioTextarea?.focus();
    }, 0);
  }

  private getPlaceholderModalComentario(): string {
    if (this.acaoModalComentario === 'responder') {
      return 'Escreva sua resposta para esta sequência...';
    }
    if (this.acaoModalComentario === 'editar') {
      return 'Atualize o texto do comentário...';
    }
    return 'Escreva seu comentário sobre o trecho selecionado...';
  }

  private atualizarContadorComentario = (): void => {
    this.atualizarEstadoTextoModalComentario(this.comentarioTextarea?.value || '');
  };

  private atualizarEstadoTextoModalComentario(texto: string): void {
    this.tamanhoTextoModalComentario = texto.length;
    this.comentarioModalPossuiTexto = texto.trim().length > 0;
  }

  private fecharModalComentario = (): void => {
    this.comentarioArticulacaoAtual = undefined;
    this.comentarioModal?.hide();
  };

  private abrirModalExcluirSequenciaComentario = (idSequenciaComentario: string): void => {
    if (!this.sequenciasComentario.some(seq => seq.id === idSequenciaComentario)) {
      return;
    }

    this.idSequenciaComentarioExclusaoAtual = idSequenciaComentario;
    this.excluirSequenciaComentarioModal?.show();
  };

  private fecharModalExcluirSequenciaComentario = (): void => {
    this.idSequenciaComentarioExclusaoAtual = undefined;
    this.excluirSequenciaComentarioModal?.hide();
  };

  private confirmarExcluirSequenciaComentario = (): void => {
    if (this.idSequenciaComentarioExclusaoAtual) {
      this.excluirSequenciaComentario(this.idSequenciaComentarioExclusaoAtual);
    }

    this.fecharModalExcluirSequenciaComentario();
  };

  private abrirModalExcluirComentario = (idSequenciaComentario: string, indexComentario: number): void => {
    if (!this.podeExcluirComentario(idSequenciaComentario, indexComentario)) {
      return;
    }

    this.comentarioExclusaoAtual = { idSequenciaComentario, indexComentario };
    this.excluirComentarioModal?.show();
  };

  private fecharModalExcluirComentario = (): void => {
    this.comentarioExclusaoAtual = undefined;
    this.excluirComentarioModal?.hide();
  };

  private confirmarExcluirComentario = (): void => {
    if (this.comentarioExclusaoAtual) {
      const { idSequenciaComentario, indexComentario } = this.comentarioExclusaoAtual;
      this.excluirComentario(idSequenciaComentario, indexComentario);
    }

    this.fecharModalExcluirComentario();
  };

  private confirmarComentarioEstatico = (): void => {
    if (this.acaoModalComentario === 'adicionar') {
      this.adicionarComentarioSelecionado();
    } else if (this.acaoModalComentario === 'responder') {
      this.responderComentarioSelecionado();
    } else if (this.acaoModalComentario === 'editar') {
      this.editarComentarioSelecionado();
    }
    this.fecharModalComentario();
  };

  private adicionarComentarioSelecionado(): void {
    const textoComentario = this.comentarioTextarea?.value?.trim();
    if (this.comentarioArticulacaoAtual) {
      this.adicionarComentarioArticulacaoSelecionado(textoComentario);
      return;
    }

    if (!textoComentario || !this.editorComentarioAtual || !this.rangeComentarioAtual?.length) {
      return;
    }

    const sequenciaComentario = new SequenciaComentario();
    sequenciaComentario.id = this.gerarIdSequenciaComentario();
    sequenciaComentario.local = this.getLocalComentarioPorModo(this.modoComentarioAtual);

    const comentario = new Comentario();
    comentario.usuario = rootStore.getState().elementoReducer.usuario || new Usuario();
    comentario.dataHora = this.formatarDataHoraComentario();
    comentario.texto = textoComentario;
    sequenciaComentario.comentarios = [comentario];

    const comentarioAplicado = this.editorComentarioAtual.adicionarComentario(sequenciaComentario.id, this.rangeComentarioAtual);
    if (!comentarioAplicado) {
      return;
    }

    this.sequenciasComentario = [...this.sequenciasComentario, sequenciaComentario];
    this.idSequenciaComentarioAtual = sequenciaComentario.id;
    this.atualizarAlertaGlobalComentarios();
    this._tabsDireita?.show('comentarios');
    this.rolarParaSequenciaComentario(sequenciaComentario.id);
    this.selecionarComentarioTextoRicoAposCriacao(sequenciaComentario.id, this.editorComentarioAtual);
    if (this.isModoMobileOuTablet()) {
      this.abrirModalListaComentarios();
    }
  }

  private selecionarComentarioTextoRicoAposCriacao(idSequenciaComentario: string, editor: any): void {
    const selecionar = (): void => {
      editor?.posicionarCursorComentario?.(idSequenciaComentario);
      this.idSequenciaComentarioAtual = idSequenciaComentario;
      this.rolarParaSequenciaComentario(idSequenciaComentario);
    };

    window.requestAnimationFrame(() => {
      selecionar();
      setTimeout(selecionar, 80);
    });
  }

  private adicionarComentarioArticulacaoSelecionado(textoComentario?: string): void {
    if (!textoComentario || !this.comentarioArticulacaoAtual) {
      return;
    }

    const { idDispositivo } = this.comentarioArticulacaoAtual;
    if (this.getSequenciaComentarioPorDispositivo(idDispositivo, this.comentarioArticulacaoAtual.elemento.uuid2)) {
      return;
    }

    const sequenciaComentario = new SequenciaComentario();
    sequenciaComentario.id = this.gerarIdSequenciaComentario();
    sequenciaComentario.local = TipoLocalComentario.TEXTO;
    sequenciaComentario.idDispositivo = idDispositivo;

    const comentario = new Comentario();
    comentario.usuario = rootStore.getState().elementoReducer.usuario || new Usuario();
    comentario.dataHora = this.formatarDataHoraComentario();
    comentario.texto = textoComentario;
    sequenciaComentario.comentarios = [comentario];

    if (!this.isComentarioEmenta(sequenciaComentario) && this.comentarioArticulacaoAtual.elemento.uuid2) {
      this.uuid2DispositivoPorSequenciaComentario.set(sequenciaComentario.id, this.comentarioArticulacaoAtual.elemento.uuid2);
    }
    this.sequenciasComentario = [...this.sequenciasComentario, sequenciaComentario];
    this.idSequenciaComentarioAtual = sequenciaComentario.id;
    this.atualizarAlertaGlobalComentarios();
    this._tabsDireita?.show('comentarios');
    this.rolarParaSequenciaComentario(sequenciaComentario.id);
    if (this.isModoMobileOuTablet()) {
      this.abrirModalListaComentarios();
    }
  }

  private responderComentarioSelecionado(): void {
    const textoComentario = this.comentarioTextarea?.value?.trim();
    if (!textoComentario || !this.idSequenciaComentarioRespostaAtual) {
      return;
    }

    const resposta = new Comentario();
    resposta.usuario = rootStore.getState().elementoReducer.usuario || new Usuario();
    resposta.dataHora = this.formatarDataHoraComentario();
    resposta.texto = textoComentario;

    this.sequenciasComentario = this.sequenciasComentario.map(seq => {
      if (seq.id !== this.idSequenciaComentarioRespostaAtual) {
        return seq;
      }

      return Object.assign(new SequenciaComentario(), seq, { comentarios: [...seq.comentarios, resposta] });
    });
    this.atualizarAlertaGlobalComentarios();
  }

  private excluirComentario(idSequenciaComentario: string, indexComentario: number): void {
    if (!this.podeExcluirComentario(idSequenciaComentario, indexComentario)) {
      return;
    }

    this.sequenciasComentario = this.sequenciasComentario.map(seq => {
      if (seq.id !== idSequenciaComentario) {
        return seq;
      }

      const comentarios = seq.comentarios.filter((_, index) => index !== indexComentario);
      return Object.assign(new SequenciaComentario(), seq, { comentarios });
    });

    if (this.comentarioEdicaoAtual?.idSequenciaComentario === idSequenciaComentario) {
      this.comentarioEdicaoAtual = undefined;
    }
    this.atualizarAlertaGlobalComentarios();
  }

  private podeExcluirComentario(idSequenciaComentario: string, indexComentario: number): boolean {
    const sequenciaComentario = this.sequenciasComentario.find(seq => seq.id === idSequenciaComentario);
    if (!sequenciaComentario || sequenciaComentario.comentarios.length <= 1) {
      return false;
    }

    const comentario = sequenciaComentario.comentarios[indexComentario];
    return !!comentario && this.isComentarioDoUsuarioAtual(comentario);
  }

  private excluirSequenciaComentario(idSequenciaComentario: string): void {
    const sequenciaComentario = this.sequenciasComentario.find(seq => seq.id === idSequenciaComentario);
    if (!sequenciaComentario) {
      return;
    }

    if (!this.isComentarioArticulacao(sequenciaComentario)) {
      this.registrarSequenciaComentarioRemovida(sequenciaComentario);
      this.getEditorTextoRicoByLocalComentario(sequenciaComentario.local)?.removerComentario?.(idSequenciaComentario);
    }
    this.sequenciasComentario = this.sequenciasComentario.filter(seq => seq.id !== idSequenciaComentario);
    this.limparEstadoSequenciaComentario(idSequenciaComentario);
    this.atualizarAlertaGlobalComentarios();
  }

  private sincronizarSequenciasComentarioComTexto(): void {
    if (!this.sequenciasComentario.length) {
      return;
    }

    const idsRemovidos: string[] = [];
    const sequenciasComentario = this.sequenciasComentario.filter(seq => {
      if (this.isComentarioArticulacao(seq)) {
        return true;
      }

      const editor = this.getEditorTextoRicoByLocalComentario(seq.local);
      const possuiComentario = editor?.possuiComentario?.(seq.id);

      if (possuiComentario === false) {
        idsRemovidos.push(seq.id);
        this.registrarSequenciaComentarioRemovida(seq);
        return false;
      }

      return true;
    });

    if (idsRemovidos.length) {
      this.sequenciasComentario = sequenciasComentario;
      idsRemovidos.forEach(idSequenciaComentario => this.limparEstadoSequenciaComentario(idSequenciaComentario));
      this.atualizarAlertaGlobalComentarios();
    }
  }

  private registrarSequenciaComentarioRemovida(sequenciaComentario: SequenciaComentario): void {
    if (!sequenciaComentario.id || this.isComentarioArticulacao(sequenciaComentario)) {
      return;
    }

    this.getEditorTextoRicoByLocalComentario(sequenciaComentario.local)?.registrarComentarioRemovido?.(sequenciaComentario.id);
  }

  private limparEstadoSequenciaComentario(idSequenciaComentario: string): void {
    if (this.idSequenciaComentarioRespostaAtual === idSequenciaComentario) {
      this.idSequenciaComentarioRespostaAtual = undefined;
    }
    if (this.comentarioEdicaoAtual?.idSequenciaComentario === idSequenciaComentario) {
      this.comentarioEdicaoAtual = undefined;
    }
    if (this.comentarioExclusaoAtual?.idSequenciaComentario === idSequenciaComentario) {
      this.comentarioExclusaoAtual = undefined;
    }
    if (this.idSequenciaComentarioExclusaoAtual === idSequenciaComentario) {
      this.idSequenciaComentarioExclusaoAtual = undefined;
    }
    if (this.idSequenciaComentarioAtual === idSequenciaComentario) {
      this.idSequenciaComentarioAtual = undefined;
    }
    this.uuid2DispositivoPorSequenciaComentario.delete(idSequenciaComentario);
  }

  private editarComentarioSelecionado(): void {
    const textoComentario = this.comentarioTextarea?.value?.trim();
    if (!textoComentario || !this.comentarioEdicaoAtual) {
      return;
    }

    const { idSequenciaComentario, indexComentario } = this.comentarioEdicaoAtual;
    this.sequenciasComentario = this.sequenciasComentario.map(seq => {
      if (seq.id !== idSequenciaComentario || !seq.comentarios[indexComentario]) {
        return seq;
      }

      const comentarioAtualizado = Object.assign(new Comentario(), seq.comentarios[indexComentario], { texto: textoComentario });
      const comentarios = seq.comentarios.map((comentario, index) => (index === indexComentario ? comentarioAtualizado : comentario));
      return Object.assign(new SequenciaComentario(), seq, { comentarios });
    });
    this.atualizarAlertaGlobalComentarios();
  }

  private getComentarioPorSequenciaEIndice(idSequenciaComentario: string, indexComentario: number): Comentario | undefined {
    return this.sequenciasComentario.find(seq => seq.id === idSequenciaComentario)?.comentarios[indexComentario];
  }

  private getLocalComentarioPorModo(modo: string): TipoLocalComentario {
    return modo === 'textoLivre' ? TipoLocalComentario.TEXTO : TipoLocalComentario.JUSTIFICACAO;
  }

  private gerarIdSequenciaComentario(): string {
    return `sc${new Date().getTime()}`;
  }

  private formatarDataHoraComentario(data = new Date()): string {
    const pad = (valor: number): string => `${valor}`.padStart(2, '0');
    return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())} ${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}`;
  }

  renderNotasRodape(): TemplateResult {
    return !this.notasRodape.length
      ? html`<span class="notas-texto-vazio">Não há notas de rodapé registradas.</span>`
      : html`
          <ol>
            ${this._lexmlJustificativa.notasRodape.map(
              (nr: NotaRodape) =>
                html`
                  <li>
                    <input type="checkbox" idNotaRodape="${nr.id}" class="notas-checkbox" id="checkbox-${nr.id}" @change=${() => this.selecionarNotaRodape(nr.id)} />
                    <label for="checkbox-${nr.id}" class="notas-texto">${unsafeHTML(nr.texto)}</label>
                    <span class="notas-acoes">
                      <sl-button
                        class="notas-acao"
                        variant="default"
                        size="small"
                        aria-label="Editar nota de rodapé"
                        title="Editar nota de rodapé"
                        idNotaRodape="${nr.id}"
                        @click=${this.editarNotaRodape}
                      >
                        <sl-icon slot="prefix" name="pencil-square"></sl-icon>
                      </sl-button>
                      <sl-button
                        class="notas-acao"
                        variant="default"
                        size="small"
                        aria-label="Excluir nota de rodapé"
                        title="Excluir nota de rodapé"
                        idNotaRodape="${nr.id}"
                        @click=${this.removerNotaRodape}
                      >
                        <sl-icon slot="prefix" name="trash"></sl-icon>
                      </sl-button>
                    </span>
                  </li>
                `
            )}
          </ol>
        `;
  }

  focusOnTab(tabName: string): void {
    const tab = this.querySelector(`sl-tab[panel="${tabName}"]`) as HTMLElement | null;
    if (!tab) return;

    this._tabsDireita?.show('notas');
  }

  localizarNotaRodape(idNotaRodape: any): void {
    // const idNotaRodape = event.target.getAttribute('idNotaRodape');
    const notaRodapeElement = this.querySelector(`.ql-editor lexml-emenda-nota-rodape[id-lexml-emenda-nota-rodape="${idNotaRodape}"]`);
    const tab = this.getTabFromElement(notaRodapeElement);
    this.focusOnTab(tab.getAttribute('name'));
    notaRodapeElement && setTimeout(() => notaRodapeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    const notasRodape = this.querySelectorAll('.ql-editor lexml-emenda-nota-rodape');
    notasRodape.forEach(nr => {
      if (nr.attributes['id-lexml-emenda-nota-rodape'].value === idNotaRodape) {
        nr?.classList.add('pulse');
      } else {
        nr.classList.remove('pulse');
      }
    });
  }

  selecionarNotaRodape(idNotaRodape: any): void {
    const checkbox = document.getElementById(`checkbox-${idNotaRodape}`) as HTMLInputElement | null;
    if (checkbox) {
      if (checkbox.checked) {
        const checkboxes = document.querySelectorAll('.notas-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(cb => {
          if (cb.id !== checkbox.id) {
            cb.checked = false;
          }
        });
        this.localizarNotaRodape(idNotaRodape);
      } else {
        this.removerPulsarNotaRodape(idNotaRodape);
      }
    }
  }

  removerPulsarNotaRodape(idNotaRodape: any): void {
    const notaRodapeElement = this.querySelector(`.ql-editor lexml-emenda-nota-rodape[id-lexml-emenda-nota-rodape="${idNotaRodape}"]`);
    notaRodapeElement?.classList.remove('pulse');
  }

  editarNotaRodape(event: any): void {
    const idNotaRodape = event.target.getAttribute('idNotaRodape');
    const notaRodapeElement = this.querySelector(`.ql-editor lexml-emenda-nota-rodape[id-lexml-emenda-nota-rodape="${idNotaRodape}"]`);
    const editorTextoRico = this.getEditorTextoRicoFromElement(notaRodapeElement);
    editorTextoRico?.focus();
    editorTextoRico.editarNotaRodape(idNotaRodape);
  }

  removerNotaRodape(event: any): void {
    const idNotaRodape = event.target.getAttribute('idNotaRodape');
    const notaRodapeElement = this.querySelector(`.ql-editor lexml-emenda-nota-rodape[id-lexml-emenda-nota-rodape="${idNotaRodape}"]`);
    const editorTextoRico = this.getEditorTextoRicoFromElement(notaRodapeElement);
    editorTextoRico?.focus();
    editorTextoRico.removerNotaRodape(idNotaRodape);
  }

  getEditorTextoRicoFromElement(element: any): any {
    return element.closest('lexml-emenda-editor-texto-rico');
  }

  getTabFromElement(element: any): any {
    return element.closest('sl-tab-panel');
  }

  getRestricoesConhecidas(): string[] {
    return [
      'Emendamento ou adição de anexos.',
      'Emendamento ou adição de pena, penalidade etc.',
      'Emendamento ou adição de especificação temática do dispositivo (usado para nome do tipo penal e outros).',
      'Alteração de anexo de MP de crédito extraordinário.',
      'Alteração do texto da proposição e proposta de adição de dispositivos onde couber na mesma emenda.',
      'Alteração de norma que não segue a LC nº 95 de 98 (ex: norma com alíneas em parágrafos).',
      'Casos especiais de numeração de parte (PARTE GERAL, PARTE ESPECIAL e uso de numeral ordinal por extenso).',
      'Tabelas e imagens no texto da proposição.',
    ];
  }
}
