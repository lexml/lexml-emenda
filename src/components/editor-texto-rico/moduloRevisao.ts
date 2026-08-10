/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable eqeqeq */

import { generateUUID } from '../../util/uuid';
import Quill from '../../internal/quill/private-quill';
import { iconeComentario } from '../../../assets/icons/icons';

/* eslint-disable prefer-const */
const Delta = Quill.import('delta');
const Parchment = Quill.import('parchment');
const Module = Quill.import('core/module');
const Inline = Quill.import('blots/inline');
const Clipboard = Quill.import('modules/clipboard');
const Keyboard = Quill.import('modules/keyboard');

type RectReferencia = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------

class RevisaoUtil {
  static valueToAttributes(value, domNode) {
    if (!value) return;
    const partes = value.split('|');
    domNode.setAttribute('usuario', partes[0]);
    domNode.setAttribute('date', partes[1]);
    domNode.setAttribute('title', 'Revisão de ' + partes[0] + ' em ' + this.formatDDMMYYYYAndTime(new Date(partes[1])));
    domNode.setAttribute('id-revisao', partes[2]);
  }

  static formats(domNode) {
    if (domNode?.hasAttribute('usuario') && domNode?.hasAttribute('date')) {
      return [domNode.getAttribute('usuario'), domNode.getAttribute('date'), domNode.getAttribute('id-revisao')].join('|');
    }
  }

  static padTo2Digits(num) {
    return num.toString().padStart(2, '0');
  }

  static formatDate(date) {
    return (
      [date.getFullYear(), RevisaoUtil.padTo2Digits(date.getMonth() + 1), RevisaoUtil.padTo2Digits(date.getDate())].join('-') +
      ' ' +
      [
        RevisaoUtil.padTo2Digits(date.getHours()),
        RevisaoUtil.padTo2Digits(date.getMinutes()),
        // RevisaoUtil.padTo2Digits(date.getSeconds()),
        '00',
      ].join(':')
    );
  }

  static formatDDMMYYYYAndTime(date: Date): string {
    const data = [this.padTo2Digits(date.getDate()), this.padTo2Digits(date.getMonth() + 1), date.getFullYear()].join('/');
    const hora = [this.padTo2Digits(date.getHours()), this.padTo2Digits(date.getMinutes())].join(':');
    return `${data} ${hora}`;
  }
}

// --------------------------------------------------------------------------------------------------------------------
// Fornatos de revisão inline

class InlineRevisionBaseFormat extends Inline {
  static blotName = 'revisionBaseFormat';
  static tagName = '';

  static create(value) {
    let node = super.create();
    RevisaoUtil.valueToAttributes(value, node);
    return node;
  }

  static formats(domNode) {
    return RevisaoUtil.formats(domNode);
  }

  format(name, value) {
    if (name !== this.statics.blotName || !value) return super.format(name, value);
    RevisaoUtil.valueToAttributes(value, this.domNode);
  }

  optimize(context) {
    const blotName = this.statics.blotName;

    if (blotName === this.next?.statics?.blotName) {
      const formatoAtual = this.formats();
      this.next.domNode.setAttribute('date', this.domNode.getAttribute('date'));
      this.next.domNode.setAttribute('usuario', this.domNode.getAttribute('usuario'));
      this.next.format(blotName, formatoAtual[blotName]);
    }

    super.optimize(context);
  }
}

class InsBlot extends InlineRevisionBaseFormat {}
InsBlot.blotName = 'added';
InsBlot.tagName = 'ins';

class DelBlot extends InlineRevisionBaseFormat {}
DelBlot.blotName = 'removed';
DelBlot.tagName = 'del';

const cursorEstaSobreBlotDel = quill => {
  const range = quill.getSelection();
  const blot = range && quill.getLeaf(range.index)[0];
  return blot?.statics.blotName === DelBlot.blotName || blot?.parent?.statics.blotName === DelBlot.blotName;
};

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------------------
// Módulo de revisão

// A classe abaixo adiciona um listener para o evento keydown para ser executado antes do listener padrão do Quill
class CustomKeyboard extends Keyboard {
  listen() {
    this.quill.root.addEventListener('keydown', this.onKeyDown.bind(this));
    this.quill.root.addEventListener('keypress', this.onKeyPress.bind(this));
    super.listen();
  }

  onKeyDown(e) {
    if (this.quill?.revisao?.gerenciarKeydown && this.quill?.revisao?.emRevisao) {
      this.quill.revisao.handleKeyDown(e);
    }
  }

  onKeyPress(e) {
    if (cursorEstaSobreBlotDel(this.quill)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

class CustomClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('cut', this.onCut.bind(this));
  }

  onCut(e) {
    if (this.quill?.revisao?.emRevisao) {
      e.preventDefault();
      e.stopPropagation();

      const range = this.quill.getSelection();
      if (range?.length) {
        this.copiarSelecaoParaClipboard();
        this.quill?.revisao?.handleRemove(range, null, null);
      }
    }
  }

  onPaste(e) {
    if (cursorEstaSobreBlotDel(this.quill)) {
      e.preventDefault();
      e.stopPropagation();
    }
    super.onPaste(e);
  }

  copiarSelecaoParaClipboard() {
    const selection = window.getSelection();

    if (selection) {
      if (navigator.clipboard) {
        // Cria um elemento div temporário para armazenar a seleção
        const tempElement = document.createElement('div');

        // Clona a seleção e a insere no elemento div temporário
        for (let i = 0; i < selection.rangeCount; i++) {
          tempElement.appendChild(selection.getRangeAt(i).cloneContents());
        }

        // Copia o conteúdo do elemento div temporário para a área de transferência
        navigator.clipboard
          .write([
            new ClipboardItem({
              'text/plain': new Blob([tempElement.innerText], { type: 'text/plain' }),
              'text/html': new Blob([tempElement.outerHTML], { type: 'text/html' }),
            }),
          ])
          .finally(() => tempElement.remove());
      } else {
        console.log('Clipboard API não suportada');
        document.execCommand('copy'); // Alternativa para o caso de não suportar a Clipboard API
      }
    }
  }
}

class ModuloRevisao extends Module {
  quill;
  options;
  ignorarEventoTextChange = false;
  emRevisao = false;
  gerenciarKeydown = true;
  usuario;
  modo = '';
  tableModule;
  tableTrick;
  isAbrindoTexto = false;

  constructor(quill, options) {
    super(quill, options);
    this.quill = quill;
    this.options = options;

    if (!options || !Object.keys(options).length) return;

    // this.quill.options.formats.push(...['added', 'removed']);

    this.usuario = options.usuario;
    this.modo = options.modo || '';
    this.emRevisao = options.emRevisao ?? false;
    this.gerenciarKeydown = options.gerenciarKeydown ?? true;
    this.tableModule = options.tableModule;
    this.tableTrick = options.tableTrick;

    this.quill.revisao = this;

    this.addClipboardMatcher();
    this.addKeyboardBindings(this.quill);

    this.quill.on('text-change', this.onTextChange.bind(this));

    this.quill.root.addEventListener('click', this.tratarClick.bind(this));

    if (this.tableModule) {
      const toolbar = this.quill?.getModule('toolbar');

      toolbar.addHandler('table', (value: any): any => {
        const quill = this.quill as any;
        const isInsertTable = (value = ''): any => value.includes('newtable_');
        const isInTable = (quill: any): any => quill && quill.getSelection(true) && quill.getFormat(quill.getSelection(true)).td;

        if (isInsertTable(value) && isInTable(quill)) {
          return false;
        }
        quill?.revisao?.setIgnorarEventoTextChange(true);
        return this.tableTrick.table_handler(value, quill);
      });
    }
  }

  isTagRevisao(param: HTMLElement | string) {
    const tagName = typeof param === 'string' ? param : param?.tagName;
    return ['INS', 'DEL'].includes(tagName);
  }

  getTagRevisaoMaisProxima(elemento: any) {
    if (!elemento || ['BODY', 'HTML'].includes(elemento.tagName)) return null;
    if (this.isTagRevisao(elemento)) return elemento;
    return this.getTagRevisaoMaisProxima(elemento.parentNode);
  }

  tratarClick(event: any) {
    const elRevisao = this.getTagRevisaoMaisProxima(event.target);
    elRevisao && this.mostrarTooltipRevisao(elRevisao, event);
  }

  revisarTodos(aceitar: boolean) {
    this.revisar(this.getRevisoes(), aceitar, true);
  }

  revisar(elementosRevisao: HTMLElement[], aceitar: boolean, todos = false) {
    if (!this.emRevisao) return;

    const elementosValidos = elementosRevisao.filter(el => this.isTagRevisao(el));
    const revisarComDeltaSeguro = elementosValidos.some(elRevisao => this.revisaoPossuiComentario(elRevisao));
    if (revisarComDeltaSeguro) {
      const revisoes = this.getRevisoesAlvo(elementosValidos, aceitar);
      this.revisarPorDelta(revisoes, aceitar);
    } else {
      this.revisarPorBlot(elementosValidos, aceitar);
    }

    //força o revisar quando é "todos" e ainda sobrou revisões no quill
    if (todos && this.getRevisoes().length > 0) {
      this.revisar(this.getRevisoes(), aceitar);
    }
  }

  private revisarPorBlot(elementosRevisao: HTMLElement[], aceitar: boolean): void {
    elementosRevisao.forEach(elRevisao => this.revisarElementoPorBlot(elRevisao, aceitar));
  }

  private getRevisoesAlvo(elementosRevisao: HTMLElement[], aceitar: boolean): { tipo: 'added' | 'removed'; id: string }[] {
    const revisoes: { tipo: 'added' | 'removed'; id: string }[] = [];
    const chaves = new Set<string>();

    elementosRevisao.forEach(elRevisao => {
      const tipo = this.getTipoRevisao(elRevisao);
      const id = this.getIdRevisao(elRevisao);

      if (!tipo || !id) {
        this.revisarElementoPorBlot(elRevisao, aceitar);
        return;
      }

      const chave = `${tipo}:${id}`;
      if (chaves.has(chave)) {
        return;
      }

      chaves.add(chave);
      revisoes.push({ tipo, id });
    });

    return revisoes;
  }

  private revisarElementoPorBlot(elRevisao: HTMLElement, aceitar: boolean): void {
    const isTagIns = elRevisao.tagName === 'INS';
    const blot = Quill.find(elRevisao);
    this.ignorarEventoTextChange = true;

    if (blot !== null) {
      if ((aceitar && !isTagIns) || (!aceitar && isTagIns)) {
        const index = this.quill.getIndex(blot);
        const length = blot.length();
        this.quill.updateContents(new Delta().retain(index).delete(length), 'user');
      } else {
        blot.format(isTagIns ? 'added' : 'removed', false, 'user');
      }
    }
  }

  private revisarPorDelta(revisoes: { tipo: 'added' | 'removed'; id: string }[], aceitar: boolean): void {
    if (!revisoes.length) {
      return;
    }

    const chaves = new Set(revisoes.map(revisao => `${revisao.tipo}:${revisao.id}`));
    const ops: any[] = [];
    let houveAlteracao = false;

    this.quill.getContents().ops.forEach((op: any) => {
      const tipo = op.attributes?.added ? 'added' : op.attributes?.removed ? 'removed' : null;
      const id = tipo ? this.getIdRevisaoFromValue(op.attributes[tipo]) : '';

      if (!tipo || !chaves.has(`${tipo}:${id}`)) {
        ops.push(op);
        return;
      }

      const isAdded = tipo === 'added';
      const excluir = (aceitar && !isAdded) || (!aceitar && isAdded);
      houveAlteracao = true;

      if (excluir) {
        return;
      }

      const attributes = { ...(op.attributes || {}) };
      delete attributes[tipo];
      if (attributes.added === false) {
        delete attributes.added;
      }
      if (attributes.removed === false) {
        delete attributes.removed;
      }

      const opSemRevisao: any = { insert: op.insert };
      if (Object.keys(attributes).length) {
        opSemRevisao.attributes = attributes;
      }
      ops.push(opSemRevisao);
    });

    if (!houveAlteracao) {
      return;
    }

    const range = this.quill.getSelection();
    this.ignorarEventoTextChange = true;
    this.quill.setContents(new Delta(ops), 'user');
    if (range) {
      this.quill.setSelection(Math.min(range.index, this.quill.getLength() - 1), 0, Quill.sources.SILENT);
    }
  }

  padTo2Digits(num: number): string {
    return num.toString().padStart(2, '0');
  }

  private mostrarTooltipRevisao(elRevisao: HTMLElement, event?: MouseEvent): void {
    if (!elRevisao) return;

    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip-revisao');

    const data = new Date(elRevisao.getAttribute('date') || '');
    const exibirBotaoAdicionarComentario = !this.revisaoPossuiComentario(elRevisao);

    tooltip.innerHTML = `
        <style>
        .tooltip-revisao {
          position: absolute;
          border: 1px solid black;
          background-color: white;
          padding: 10px;
          border-radius: 4px;
          z-index: 9999;
          font-size: 0.9rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          max-width: 300px;
          transition: all 0.3s ease-in-out;
        }
        .tooltip-revisao__actions {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
        }
        .tooltip-revisao__actions button {
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid #ccc;
          border-radius: 15px;
          background-color: #eee;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }
        .tooltip-revisao__actions svg {
          fill: currentColor;
          width: 24px;
          height: 24px;
        }
        .tooltip-revisao__actions #button-adicionar-comentario-revisao svg {
          fill: currentColor;
          stroke: none;
          width: 14px;
          height: 14px;
        }
        .tooltip-revisao__actions #button-adicionar-comentario-revisao .ql-fill {
          fill: currentColor;
        }
        .tooltip-revisao button:hover {
          background-color: #ddd;
        }
        .tooltip-revisao button:active {
          background-color: #ccc;
        }
        .tooltip-revisao__body {
          display: flex;
          flex-direction: row;
          gap: 1rem;
        }
        .tooltip-revisao__autor {
          font-weight: bold;
        }
        .tooltip-revisao__data {
          font-size: 0.8rem;
          color: #666;
        }
      </style>
      <div class="tooltip-revisao__body" role="tooltip">
        <div>
          <div class="tooltip-revisao__autor">${elRevisao.getAttribute('usuario')}</div>
          <div class="tooltip-revisao__data">${RevisaoUtil.formatDDMMYYYYAndTime(data)}</div>
        </div>
        <div class="tooltip-revisao__actions">
          <button id="button-rejeitar-revisao" aria-label="Rejeitar revisão" title="Rejeitar revisão">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
          </button>
          <button id="button-aceitar-revisao" aria-label="Aceitar revisão" title="Aceitar revisão">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
            </svg>
          </button>
          ${
            exibirBotaoAdicionarComentario
              ? `
          <button id="button-adicionar-comentario-revisao" aria-label="Adicionar comentário" title="Adicionar comentário">
            ${iconeComentario}
          </button>`
              : ''
          }
        </div>
      </div>
      `;

    tooltip.style.opacity = '0';
    document.body.appendChild(tooltip);

    const fnActionRevisao = (event: any, aceitar: boolean) => {
      this.revisar(this.getElementosMesmaRevisao(elRevisao), aceitar);
      closeTooltip(event);
    };

    tooltip.querySelector('#button-rejeitar-revisao')!.addEventListener('click', (event: any) => {
      event.preventDefault();
      event.stopPropagation();
      fnActionRevisao(event, false);
    });
    tooltip.querySelector('#button-aceitar-revisao')!.addEventListener('click', (event: any) => {
      event.preventDefault();
      event.stopPropagation();
      fnActionRevisao(event, true);
    });
    tooltip.querySelector('#button-adicionar-comentario-revisao')?.addEventListener('click', (event: any) => {
      event.preventDefault();
      event.stopPropagation();
      this.adicionarComentarioNaRevisao(elRevisao);
      closeTooltip(event, false);
    });

    this.ajustaPosicaoTooltip(tooltip, elRevisao, event?.clientY);
    const ajustaTooltipOnResize = (): void => this.ajustaPosicaoTooltip(tooltip, elRevisao, event?.clientY);
    let tooltipFechando = false;

    const closeTooltip = (e: Event, restaurarFocoEditor = true) => {
      if (e.type === 'click') {
        limpaTooltip();
      } else if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Escape') {
        limpaTooltip();
      }
      if (restaurarFocoEditor) {
        setTimeout(() => this.quill.root.focus(), 0);
      }
    };

    const limpaTooltip = () => {
      if (tooltipFechando) {
        return;
      }
      tooltipFechando = true;
      tooltip.style.opacity = '0';
      setTimeout(() => {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
        document.removeEventListener('keydown', closeTooltip);
        window.removeEventListener('resize', ajustaTooltipOnResize);
      }, 300);
    };

    setTimeout(() => {
      document.addEventListener('click', closeTooltip);
      document.addEventListener('keydown', closeTooltip);
      tooltip.style.opacity = '1';
    }, 0);

    window.addEventListener('resize', ajustaTooltipOnResize);
  }

  private adicionarComentarioNaRevisao(elRevisao: HTMLElement): void {
    const range = this.getRangeRevisao(elRevisao);
    if (!range || this.quill?.comentarios?.rangePossuiComentario(range)) {
      return;
    }

    this.quill.setSelection(range.index, range.length, Quill.sources.USER);
    const editor = this.quill.root.closest('lexml-emenda-editor-texto-rico') || this.quill.root;
    editor.dispatchEvent(
      new CustomEvent('abrir-modal-comentario', {
        bubbles: true,
        composed: true,
        detail: {
          modo: this.modo || this.options?.modo || '',
          range,
          texto: this.quill.getText(range.index, range.length),
        },
      })
    );
  }

  private revisaoPossuiComentario(elRevisao: HTMLElement): boolean {
    const ranges = this.getRangesRevisao(elRevisao);
    if (ranges.length) {
      return ranges.some(range => this.quill?.comentarios?.rangePossuiComentario(range));
    }

    const range = this.getRangeElementoRevisao(elRevisao);
    return !!range && this.quill?.comentarios?.rangePossuiComentario(range);
  }

  private getRangeRevisao(elRevisao: HTMLElement): { index: number; length: number } | null {
    const ranges = this.getRangesRevisao(elRevisao);
    if (ranges.length === 1) {
      return ranges[0];
    }

    return this.getRangeElementoRevisao(elRevisao);
  }

  private getRangeElementoRevisao(elRevisao: HTMLElement): { index: number; length: number } | null {
    const blot = Quill.find(elRevisao);
    if (!blot) {
      return null;
    }

    const index = this.quill.getIndex(blot);
    const length = blot.length();
    return length ? { index, length } : null;
  }

  private getRangesRevisao(elRevisao: HTMLElement): { index: number; length: number }[] {
    const tipo = this.getTipoRevisao(elRevisao);
    const idRevisao = this.getIdRevisao(elRevisao);
    if (!tipo || !idRevisao) {
      return [];
    }

    const ranges: { index: number; length: number }[] = [];
    let index = 0;

    this.quill.getContents().ops.forEach((op: any) => {
      const length = this.getOpLength(op);
      const idOp = this.getIdRevisaoFromValue(op.attributes?.[tipo]);
      if (idOp === idRevisao) {
        const rangeAnterior = ranges[ranges.length - 1];
        if (rangeAnterior && rangeAnterior.index + rangeAnterior.length === index) {
          rangeAnterior.length += length;
        } else {
          ranges.push({ index, length });
        }
      }

      index += length;
    });

    return ranges;
  }

  private getTipoRevisao(elRevisao: HTMLElement): 'added' | 'removed' | null {
    if (elRevisao.tagName === 'INS') {
      return 'added';
    }
    if (elRevisao.tagName === 'DEL') {
      return 'removed';
    }
    return null;
  }

  private getIdRevisao(elRevisao: HTMLElement): string {
    const idRevisao = elRevisao.getAttribute('id-revisao');
    if (idRevisao) {
      return idRevisao;
    }

    const tipo = this.getTipoRevisao(elRevisao);
    const blot = Quill.find(elRevisao);
    return tipo && blot?.formats ? this.getIdRevisaoFromValue(blot.formats()?.[tipo]) : '';
  }

  private getIdRevisaoFromValue(value: string): string {
    return value ? `${value}`.split('|')[2] || '' : '';
  }

  private getOpLength(op: any): number {
    return typeof op.insert === 'string' ? op.insert.length : 1;
  }

  private getElementosMesmaRevisao(elRevisao: HTMLElement): HTMLElement[] {
    const idRevisao = elRevisao.getAttribute('id-revisao');
    if (!idRevisao) {
      return [elRevisao];
    }

    return [...this.quill.root.querySelectorAll(`${elRevisao.tagName}[id-revisao="${idRevisao}"]`)] as HTMLElement[];
  }

  private ajustaPosicaoTooltip(tooltip: HTMLElement, button: HTMLElement, clientY?: number): void {
    const rect = this.getRectReferenciaTooltip(button, clientY);
    const offset = 10;

    // Abrir para cima por padrão, a menos que não haja espaço suficiente
    let topOffset = rect.top - tooltip.clientHeight - offset;
    if (topOffset < 0) {
      topOffset = rect.bottom + offset;
    }
    tooltip.style.top = `${topOffset + window.scrollY}px`;

    // Ajustar horizontalmente se estiver muito próximo à borda direita
    let leftOffset = rect.left + rect.width / 2 - tooltip.clientWidth / 2;
    if (leftOffset + tooltip.clientWidth > window.innerWidth) {
      leftOffset = window.innerWidth - tooltip.clientWidth - offset;
    } else if (leftOffset < 0) {
      leftOffset = offset;
    }
    tooltip.style.left = `${leftOffset + window.scrollX}px`;
  }

  private getRectReferenciaTooltip(elRevisao: HTMLElement, clientY?: number): RectReferencia {
    const rectBase = this.getRectLinhaElemento(elRevisao, clientY);
    const fragmentosContinuos = this.getFragmentosContinuosMesmaRevisao(elRevisao);
    const rectsMesmaLinha = fragmentosContinuos
      .map(fragmento => this.getRectLinhaElemento(fragmento.el, clientY, rectBase))
      .filter((rect): rect is RectReferencia => !!rect && this.isMesmaLinha(rect, rectBase));

    return rectsMesmaLinha.length ? this.unirRects(rectsMesmaLinha) : rectBase;
  }

  private getFragmentosContinuosMesmaRevisao(elRevisao: HTMLElement): { el: HTMLElement; index: number; length: number }[] {
    const fragmentos = this.getElementosMesmaRevisao(elRevisao)
      .map(el => {
        const blot = Quill.find(el);
        return blot ? { el, index: this.quill.getIndex(blot), length: blot.length() } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.index - b.index) as { el: HTMLElement; index: number; length: number }[];

    const indiceAtual = fragmentos.findIndex(fragmento => fragmento.el === elRevisao);
    if (indiceAtual < 0) {
      const blot = Quill.find(elRevisao);
      return [{ el: elRevisao, index: blot ? this.quill.getIndex(blot) : 0, length: blot ? blot.length() : 0 }];
    }

    let inicio = indiceAtual;
    while (inicio > 0 && fragmentos[inicio - 1].index + fragmentos[inicio - 1].length === fragmentos[inicio].index) {
      inicio--;
    }

    let fim = indiceAtual;
    while (fim < fragmentos.length - 1 && fragmentos[fim].index + fragmentos[fim].length === fragmentos[fim + 1].index) {
      fim++;
    }

    return fragmentos.slice(inicio, fim + 1);
  }

  private getRectLinhaElemento(el: HTMLElement, clientY?: number, rectReferencia?: RectReferencia): RectReferencia {
    const rects = Array.from(el.getClientRects())
      .map(rect => this.toRectReferencia(rect))
      .filter(rect => rect.width > 0 || rect.height > 0);

    if (!rects.length) {
      return this.toRectReferencia(el.getBoundingClientRect());
    }

    if (rectReferencia) {
      const rectMesmaLinha = rects.find(rect => this.isMesmaLinha(rect, rectReferencia));
      if (rectMesmaLinha) {
        return rectMesmaLinha;
      }
    }

    if (clientY !== undefined) {
      return (
        rects.find(rect => clientY >= rect.top && clientY <= rect.bottom) ||
        rects.reduce((rectMaisProximo, rect) =>
          Math.abs(this.getCentroVertical(rect) - clientY) < Math.abs(this.getCentroVertical(rectMaisProximo) - clientY) ? rect : rectMaisProximo
        )
      );
    }

    return rects[0];
  }

  private unirRects(rects: RectReferencia[]): RectReferencia {
    const top = Math.min(...rects.map(rect => rect.top));
    const right = Math.max(...rects.map(rect => rect.right));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    const left = Math.min(...rects.map(rect => rect.left));
    return {
      top,
      right,
      bottom,
      left,
      width: right - left,
      height: bottom - top,
    };
  }

  private isMesmaLinha(rect: RectReferencia, referencia: RectReferencia): boolean {
    const centroVertical = this.getCentroVertical(rect);
    return centroVertical >= referencia.top - 1 && centroVertical <= referencia.bottom + 1;
  }

  private getCentroVertical(rect: RectReferencia): number {
    return rect.top + rect.height / 2;
  }

  private toRectReferencia(rect: DOMRect): RectReferencia {
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  createTooltip() {
    Array.from(this.querySelectorAll('#tooltipAcceptRefuse')).forEach(el => this.removeChild(el));

    const tooltipElem = document.createElement('tooltip');
    tooltipElem.id = 'tooltipAcceptRefuse';

    document.body.appendChild(tooltipElem);

    const content = document.createRange().createContextualFragment(`
    <style>
    .tooltip {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }

    .tooltip .tooltiptext {
      display: none;
      width: 120px;
      background-color: #333;
      color: #fff;
      text-align: center;
      border-radius: 6px;
      padding: 5px;
      position: absolute;
      z-index: 1;
      top: calc(100% + 5px);
      left: 50%;
      margin-left: -60px;
    }

    </style>
    <div class="tooltip" id="tooltip">
      Hover sobre mim
      <span class="tooltiptext" id="tooltipContent">
        <button onclick="botaoClicado(1)">Botão 1</button>
        <button onclick="botaoClicado(2)">Botão 2</button>
      </span>
    </div>

    <sl-button slot="footer" variant="primary">Fechar</sl-button>
  `);
  }

  handleKeyDown(e) {
    // Não implementado
  }

  addClipboardMatcher() {
    // Handle para tratar colagem de trechos com tag <del>
    this.quill.clipboard.addMatcher('DEL', (node, delta) => {
      if (this.isAbrindoTexto) {
        return delta;
      } else {
        let match = Parchment.query(node);
        if (match == null || match.blotName !== 'removed') {
          return delta;
        }

        const id = generateUUID();
        const ops = delta.ops.reduce((acc, op) => {
          if (op.insert) {
            delete op.attributes.background;
            delete op.attributes.removed;
            if (this.emRevisao) {
              op.attributes.added = this.buildAttributes(id);
            }
            acc.push(op);
          }
          return acc;
        }, []);

        return new Delta(ops);
      }
    });
  }

  addKeyboardBindings(quill) {
    function addBindingOnTop(keyBinding, context, handler) {
      quill.keyboard.addBinding(keyBinding, context, handler);
      const key = Object.keys(quill.keyboard.bindings)
        .map(k => quill.keyboard.bindings[k])
        .flat()
        .find(binding => binding.handler === handler).key;
      const newBinding = (quill.keyboard.bindings[key] || []).pop();
      quill.keyboard.bindings[key].unshift(newBinding);
    }

    addBindingOnTop({ key: 'Backspace' }, null, (range, context) => this.handleRemove(range, context, 'Backspace'));
    addBindingOnTop({ key: 'Delete' }, null, (range, context) => this.handleRemove(range, context, 'Delete'));

    // Undo
    addBindingOnTop({ key: 'z', shortKey: true }, null, (range, context) => this.handleUndo(range, context));

    // Redo
    addBindingOnTop({ key: 'z', shortKey: true, shiftKey: true }, null, (range, context) => this.handleRedo(range, context));
    addBindingOnTop({ key: 'y', shortKey: true }, null, (range, context) => this.handleRedo(range, context));
  }

  handleUndo(range, context) {
    const hasModuloTabela = this.quill.getModule('table') && this.tableModule;

    if (this.emRevisao) {
      this.ignorarEventoTextChange = true;
    }

    if (hasModuloTabela) {
      return this.tableModule.keyboardHandler(this.quill, 'undo', range, context);
    } else {
      this.quill.history.undo();
    }
  }

  handleRedo(range, context) {
    const hasModuloTabela = this.quill.getModule('table') && this.tableModule;

    if (this.emRevisao) {
      this.ignorarEventoTextChange = true;
    }

    if (hasModuloTabela) {
      return this.tableModule.keyboardHandler(this.quill, 'redo', range, context);
    } else {
      this.quill.history.redo();
    }
  }

  buildAttributes(id = '') {
    return this.usuario + '|' + RevisaoUtil.formatDate(new Date()) + ' |' + id;
  }

  handleRemove(range, context, key) {
    const deslocamento = key === 'Delete' ? 1 : -1;
    const quill = this.quill;
    if (this.emRevisao) {
      const blot = quill.getLeaf(range.index)[0];
      const isEmbedBlot = ['image'].includes(blot.statics.blotName);
      const index = (blot.text || isEmbedBlot) && deslocamento === -1 && !range.length ? range.index - 1 : range.index;
      let posicao = index;

      if (index < 0 || index >= quill.getLength()) return true;
      const delta = quill.getContents(index, range.length || 1);
      const id = generateUUID();
      const ops = delta.ops.reduce((acc, op) => {
        const numChars = typeof op.insert === 'string' ? op.insert.length : 1;
        if (op.attributes?.added) {
          acc.push({ delete: numChars });
        } else {
          if (op.attributes?.list && !blot.text) {
            acc.push({ retain: numChars, attributes: { list: false } });
          } else if (!blot.text && !isEmbedBlot) {
            acc.push({ delete: numChars });
          } else {
            acc.push({
              retain: numChars,
              attributes: { ...(op.attributes || {}), removed: this.buildAttributes(id) },
            });

            if (deslocamento === 1) {
              posicao += numChars;
            }
          }
        }
        return acc;
      }, []);
      index && ops.unshift({ retain: index });

      this.ignorarEventoTextChange = true;

      quill.updateContents({ ops }, 'user');
      quill.setSelection(posicao);
      return false;
    }

    return true;
  }

  onTextChange(delta, oldContent, source) {
    const isInsertJaFormatadoEmModoDeRevisao = delta.ops.find(op => op.insert)?.attributes?.added;
    const apenasNovaLinha = delta.ops.length === 2 && delta.ops[0].retain && delta.ops[1].insert === '\n';
    const quill = this.quill;
    if (this.ignorarEventoTextChange || !this.emRevisao || isInsertJaFormatadoEmModoDeRevisao || !delta.ops.length || apenasNovaLinha) {
      this.ignorarEventoTextChange = false;
      return;
    }

    if (quill.history.stack.undo.length === 0) return;

    let numCaracteresRemovidos = 0;

    this.ignorarEventoTextChange = true;

    let itemUndo = quill.history.stack.undo.pop();

    const redo = JSON.parse(JSON.stringify(itemUndo.redo));

    quill.history.cutoff();
    quill.history.ignoreChange = true;
    quill.updateContents(itemUndo.undo, 'silent');
    quill.history.ignoreChange = false;

    if (!quill.history.options?.userOnly) quill.history.stack.undo.pop();

    this.ignorarEventoTextChange = true;

    let rev = { ops: [] };
    let idx = 0;
    const id = generateUUID();
    rev = redo.ops.reduce((acc, op) => {
      const length = op.retain || op.delete || (typeof op.insert === 'string' ? op.insert.length : 1);
      if (op.retain && op.attributes?.list) {
        // idx += 1;
        acc.ops.push({ retain: op.retain, attributes: { ...(op.attributes || {}) } });
        idx += op.retain;
      } else if (op.retain) {
        acc.ops.push({ retain: op.retain, attributes: { ...(op.attributes || {}) } });
        idx += op.retain;
      } else if (op.delete) {
        // Para refazer trechos removidos em modo de revisão é preciso identificar o que está sendo removido
        const contentDeletedRange = oldContent.slice(idx, idx + op.delete);
        contentDeletedRange.ops.forEach(op2 => {
          if (op2.insert && op2.attributes?.added) {
            // Deixa remover conteúdo adicionado em modo de revisão
            acc.ops.push({ delete: op2.insert.length });
          } else if (op2.insert && !op2.attributes?.added) {
            // Não deixa remover conteúdo adicionado FORA modo de revisão
            // Formata como removido em modo de revisão
            const length = typeof op2.insert === 'string' ? op2.insert.length : 1;
            acc.ops.push({ retain: length, attributes: { ...(op2.attributes || {}), removed: this.buildAttributes(id) } });
            idx += length;
            numCaracteresRemovidos += length;
          } else {
            const length = op2.retain || op2.delete || 1;
            acc.ops.push({ retain: length, attributes: { ...(op2.attributes || {}), removed: this.buildAttributes(id) } });
            idx += length;
          }
        });
      } else if (op.insert && !op.attributes?.added) {
        op.attributes = { ...(op.attributes || {}), added: this.buildAttributes(id), removed: false };
        acc.ops.push(op);
        idx += length;
      }
      return acc;
    }, rev);

    quill.history.cutoff();
    quill.updateContents(rev, 'user');

    setTimeout(() => {
      quill.setSelection(idx - numCaracteresRemovidos, 0);
      this.ignorarEventoTextChange = false;
    }, 0);
  }

  setUsuario(usuario) {
    this.usuario = usuario;
  }

  setEmRevisao(emRevisao) {
    this.emRevisao = emRevisao;
  }

  setIgnorarEventoTextChange(ignorarEventoTextChange) {
    this.ignorarEventoTextChange = ignorarEventoTextChange;
  }

  getQuantidadeRevisoes() {
    return this.getRevisoesSemDuplicidade(this.getRevisoes()).length;
  }

  getRevisoes() {
    const cursorCode = 65279;
    return [...this.quill.root.querySelectorAll('ins, del')].filter(el => el.innerText?.charCodeAt(0) !== cursorCode);
  }

  private getRevisoesSemDuplicidade(listElements: any[]) {
    const revisoesSemDuplicidade = [] as any;

    listElements.forEach(element => {
      if (!revisoesSemDuplicidade.find(r => r.getAttribute('id-revisao') === element.getAttribute('id-revisao') && r.nodeName === element.nodeName)) {
        revisoesSemDuplicidade.push(element);
      }
    });

    return revisoesSemDuplicidade;
  }
}

export { CustomClipboard, CustomKeyboard, DelBlot, InsBlot, ModuloRevisao };
