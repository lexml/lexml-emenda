import { LitElement, html, TemplateResult } from 'lit';
import { customElement, query } from 'lit/decorators.js';

@customElement('lexml-emenda-ajuda-modal')
export class AjudaModalComponent extends LitElement {
  @query('sl-dialog')
  private slDialog!: any;

  public show(): void {
    this.slDialog.show();
  }

  render(): TemplateResult {
    return html`
      <style>
        :host {
          font-family: var(--sl-font-sans);
        }
      </style>
      <sl-dialog label="Dicas">
        <lexml-emenda-ajuda></lexml-emenda-ajuda>
        <sl-button slot="footer" variant="primary" @click=${(): void => this.slDialog.hide()}>Fechar</sl-button>
      </sl-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lexml-emenda-ajuda-modal': AjudaModalComponent;
  }
}
