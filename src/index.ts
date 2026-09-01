// ---------------------------------------------------
// DEPENDÊNCIAS
// ---------------------------------------------------
// import 'quill/dist/quill.snow.css';
// import 'font-awesome/css/font-awesome.css';

import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button';
import '@shoelace-style/shoelace/dist/components/input/input';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item';
import '@shoelace-style/shoelace/dist/components/select/select';
import '@shoelace-style/shoelace/dist/components/button/button';
import '@shoelace-style/shoelace/dist/components/split-panel/split-panel';
import '@shoelace-style/shoelace/dist/components/radio/radio';
import '@shoelace-style/shoelace/dist/components/details/details';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox';
import '@shoelace-style/shoelace/dist/components/switch/switch';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip';
import '@shoelace-style/shoelace/dist/components/card/card';
import './model/lexml/util/mixin';
import { configurePrivateQuill } from './internal/quill/configure-private-quill';

// ---------------------------------------------------
// REGISTRO DOS COMPONENTES INTERNOS
// ---------------------------------------------------
// Estes imports mantêm o registro das tags usadas pelo <lexml-emenda>,
// sem transformar as classes visuais internas em API pública do pacote.

import './components/articulacao.component';
import './components/comandoEmenda/comandoEmenda.component';
import './components/editor/editor.component';
import './components/elemento/elemento.component';
import './components/ajuda/atalhos.component';
import './components/editor-texto-rico/editor-texto-rico.component';
import './components/editor-texto-rico/alterar-largura-tabela-coluna-modal';
import './components/editor-texto-rico/alterar-largura-imagem-modal';
import './components/lexml-eta.component';
import './components/autoria/autoria.component';
import './components/destino/destino.component';
import './components/lexml-autocomplete';
import './components/data/data.component';
import './components/alertas/alertas.component';
import './components/ajuda/ajuda.component';
import './components/ajuda/ajuda.modal.component';
import './components/sufixos/sufixos.modal.componet';
import './components/comandoEmenda/comandoEmenda.modal.component';
import './components/ajuda/atalhos.modal.component';
import './components/opcoesImpressao/opcoesImpressao.component';
import './components/switchRevisao/switch-revisao.component';
import './components/substituicao-termo/substituicao-termo.component';
import './components/editor/emendaDivididaDialog';

// ---------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------

export { LexmlEmendaComponent, LexmlEmendaParametrosEdicao } from './components/lexml-emenda.component';
export { LexmlEmendaConfig } from './model/lexmlEmendaConfig';
export { Emenda } from './model/emenda/emenda';

configurePrivateQuill();
