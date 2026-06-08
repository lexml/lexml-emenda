const Module = Quill.import('core/module');
const Inline = Quill.import('blots/inline');
const Delta = Quill.import('delta');

const COMENTARIO_FORMAT = 'comentario';
const COMENTARIO_TAG = 'comentario';
const COMENTARIO_ID_ATTRIBUTE = 'id-sequencia-comentario';

class ComentarioBlot extends Inline {
  static create(value: string): HTMLElement {
    const node = super.create(value) as HTMLElement;
    if (value) {
      node.setAttribute(COMENTARIO_ID_ATTRIBUTE, value);
    }
    return node;
  }

  static formats(domNode: HTMLElement): string | null {
    return domNode.getAttribute(COMENTARIO_ID_ATTRIBUTE);
  }

  format(name: string, value: string): void {
    if (name === COMENTARIO_FORMAT) {
      value ? this.domNode.setAttribute(COMENTARIO_ID_ATTRIBUTE, value) : this.domNode.removeAttribute(COMENTARIO_ID_ATTRIBUTE);
      return;
    }
    super.format(name, value);
  }
}

ComentarioBlot.blotName = COMENTARIO_FORMAT;
ComentarioBlot.tagName = COMENTARIO_TAG;

class ModuloComentario extends Module {
  quill: any;

  static register(): void {
    Quill.register(ComentarioBlot);
  }

  constructor(quill: any, options: any) {
    super(quill, options);
    this.quill = quill;
    this.quill.comentarios = this;
    this.quill.root.addEventListener('paste', this.onPaste, true);
  }

  private onPaste = (event: ClipboardEvent): void => {
    if (event.defaultPrevented || !this.quill.isEnabled()) {
      return;
    }

    const html = event.clipboardData?.getData('text/html') || '';
    if (!this.htmlPossuiComentario(html)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const range = this.quill.getSelection(true);
    if (!range) {
      return;
    }

    const htmlSemComentarios = this.removerComentariosDoHtml(html);
    const texto = event.clipboardData?.getData('text/plain') || '';
    const conteudoColado = htmlSemComentarios ? this.quill.clipboard.convert(htmlSemComentarios) : new Delta().insert(texto);
    const delta = new Delta().retain(range.index).delete(range.length).concat(conteudoColado);

    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection(range.index + conteudoColado.length(), 0, Quill.sources.SILENT);
  };

  private htmlPossuiComentario(html: string): boolean {
    return /<\s*comentario[\s>]/i.test(html) || html.includes(COMENTARIO_ID_ATTRIBUTE);
  }

  private removerComentariosDoHtml(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll(COMENTARIO_TAG).forEach(el => {
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el);
      }
      el.remove();
    });

    container.querySelectorAll(`[${COMENTARIO_ID_ATTRIBUTE}]`).forEach(el => el.removeAttribute(COMENTARIO_ID_ATTRIBUTE));
    container.querySelectorAll('.comentario-selecionado').forEach(el => el.classList.remove('comentario-selecionado'));

    return container.innerHTML;
  }

  adicionar(idSequenciaComentario: string, range = this.quill.getSelection()): boolean {
    if (!idSequenciaComentario || !range?.length || this.rangePossuiComentario(range)) {
      return false;
    }

    this.quill.formatText(range.index, range.length, COMENTARIO_FORMAT, idSequenciaComentario, Quill.sources.USER);
    this.quill.setSelection(range.index, 0, Quill.sources.SILENT);
    return true;
  }

  remover(idSequenciaComentario: string): boolean {
    if (!idSequenciaComentario) {
      return false;
    }

    const ranges = this.getRangesComentario(idSequenciaComentario);
    ranges.forEach(range => this.quill.formatText(range.index, range.length, COMENTARIO_FORMAT, false, Quill.sources.USER));
    return ranges.length > 0;
  }

  removerPorIds(idsSequenciasComentario: string[] = []): boolean {
    const ids = new Set(idsSequenciasComentario.filter(Boolean));
    if (!ids.size) {
      return false;
    }

    const ranges = this.getRangesComentariosPorIds(ids);
    ranges.forEach(range => this.quill.formatText(range.index, range.length, COMENTARIO_FORMAT, false, Quill.sources.SILENT));
    return ranges.length > 0;
  }

  existe(idSequenciaComentario: string): boolean {
    if (!idSequenciaComentario) {
      return false;
    }

    return this.quill.getContents().ops.some((op: any) => op.attributes?.[COMENTARIO_FORMAT] === idSequenciaComentario);
  }

  getIndice(idSequenciaComentario: string): number | undefined {
    if (!idSequenciaComentario) {
      return undefined;
    }

    const range = this.getRangesComentario(idSequenciaComentario)[0];
    return range?.index;
  }

  rangePossuiComentario(range: any): boolean {
    if (!range?.length) {
      return false;
    }

    return this.quill.getContents(range.index, range.length).ops.some((op: any) => op.attributes?.[COMENTARIO_FORMAT]);
  }

  findNodeById(idSequenciaComentario: string): HTMLElement | null {
    return this.quill.root.querySelector(`${COMENTARIO_TAG}[${COMENTARIO_ID_ATTRIBUTE}="${idSequenciaComentario}"]`);
  }

  findNodesById(idSequenciaComentario: string): HTMLElement[] {
    return [...this.quill.root.querySelectorAll(`${COMENTARIO_TAG}[${COMENTARIO_ID_ATTRIBUTE}="${idSequenciaComentario}"]`)] as HTMLElement[];
  }

  private getRangesComentario(idSequenciaComentario: string): { index: number; length: number }[] {
    const ranges: { index: number; length: number }[] = [];
    let index = 0;

    this.quill.getContents().ops.forEach((op: any) => {
      const length = this.getOpLength(op);
      if (op.attributes?.[COMENTARIO_FORMAT] === idSequenciaComentario) {
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

  private getRangesComentariosPorIds(idsSequenciasComentario: Set<string>): { index: number; length: number }[] {
    const ranges: { index: number; length: number }[] = [];
    let index = 0;

    this.quill.getContents().ops.forEach((op: any) => {
      const length = this.getOpLength(op);
      const idSequenciaComentario = op.attributes?.[COMENTARIO_FORMAT];
      if (idSequenciaComentario && idsSequenciasComentario.has(idSequenciaComentario)) {
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

  private getOpLength(op: any): number {
    return typeof op.insert === 'string' ? op.insert.length : 1;
  }

  getTextoComentario(idSequenciaComentario: string): string {
    return this.quill.getContents().ops.reduce((texto: string, op: any) => {
      if (typeof op.insert !== 'string' || op.attributes?.[COMENTARIO_FORMAT] !== idSequenciaComentario) {
        return texto;
      }

      return texto + op.insert;
    }, '');
  }
}

export { COMENTARIO_ID_ATTRIBUTE, COMENTARIO_FORMAT, COMENTARIO_TAG, ModuloComentario };
