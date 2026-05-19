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

  getTextoComentario(idSequenciaComentario: string): string {
    return this.findNodesById(idSequenciaComentario)
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join(' ');
  }
}

export { COMENTARIO_ID_ATTRIBUTE, COMENTARIO_FORMAT, COMENTARIO_TAG, ModuloComentario };
