const Module = Quill.import('core/module');
const Inline = Quill.import('blots/inline');

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

  private getOpLength(op: any): number {
    return typeof op.insert === 'string' ? op.insert.length : 1;
  }

  getTextoComentario(idSequenciaComentario: string): string {
    return this.quill
      .getContents()
      .ops.reduce((texto: string, op: any) => {
        if (typeof op.insert !== 'string' || op.attributes?.[COMENTARIO_FORMAT] !== idSequenciaComentario) {
          return texto;
        }

        return texto + op.insert;
      }, '')
      .trim();
  }
}

export { COMENTARIO_ID_ATTRIBUTE, COMENTARIO_FORMAT, COMENTARIO_TAG, ModuloComentario };
