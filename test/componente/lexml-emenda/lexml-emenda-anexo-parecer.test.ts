/* eslint-disable @typescript-eslint/no-unused-expressions */
import { elementUpdated, expect, fixture, html } from '@open-wc/testing';
import { LexmlEmendaComponent } from '../../../src/components/lexml-emenda.component';
import { Emenda } from '../../../src/model/emenda/emenda';
import { LexmlEmendaConfig } from '../../../src/model/lexmlEmendaConfig';

describe('LexmlEmendaComponent - anexo de parecer', () => {
  it('Deveria ter anexoParecer desativado por padrão', () => {
    expect(new LexmlEmendaConfig().anexoParecer).to.be.false;
    expect(new Emenda().anexoParecer).to.be.false;
  });

  it('Não deveria devolver dados que não se aplicam ao anexo de parecer', () => {
    const component = new LexmlEmendaComponent() as any;
    const emenda = new Emenda();
    emenda.justificativa = '<p>Justificativa</p>';
    emenda.justificativaAntesRevisao = '<p>Justificativa anterior</p>';
    emenda.local = 'Sala da comissão';
    emenda.data = '2026-08-19';
    emenda.autoria!.parlamentares = [{ identificacao: '1' } as any];
    emenda.notasRodape = [{ id: '1', numero: 1, texto: 'Nota' }];

    component.removerDadosNaoAplicaveisAoAnexoParecer(emenda);

    expect(emenda).not.to.have.property('justificativa');
    expect(emenda).not.to.have.property('justificativaAntesRevisao');
    expect(emenda).not.to.have.property('local');
    expect(emenda).not.to.have.property('data');
    expect(emenda).not.to.have.property('autoria');
    expect(emenda).not.to.have.property('notasRodape');
  });

  it('Deveria ocultar justificação, notas, data e autoria no modo anexo de parecer', async () => {
    const component = await fixture<LexmlEmendaComponent>(html`<lexml-emenda></lexml-emenda>`);
    (component as any).anexoParecer = true;
    await elementUpdated(component);

    expect(component.querySelector('sl-tab[panel="justificativa"]')).to.be.null;
    expect(component.querySelector('sl-tab[panel="notas"]')).to.be.null;
    expect((component.querySelector('sl-tab-panel[name="justificativa"]') as HTMLElement).style.display).to.equal('none');
    expect(component.querySelector('sl-tab-panel[name="notas"]')).to.be.null;
    expect(component.querySelector('sl-tab[panel="autoria"]')?.textContent?.trim()).to.equal('Destino e Impressão');
    expect((component.querySelector('lexml-emenda-data')?.parentElement as HTMLElement).style.display).to.equal('none');
    expect((component.querySelector('lexml-emenda-autoria')?.parentElement as HTMLElement).style.display).to.equal('none');
    expect(component.querySelector('lexml-emenda-destino')).not.to.be.null;
    expect(component.querySelector('lexml-emenda-opcoes-impressao')).not.to.be.null;
  });

  it('Não deveria validar a ausência de justificação no modo anexo de parecer', () => {
    const component = new LexmlEmendaComponent() as any;
    component.anexoParecer = true;
    component.modo = 'emendaTextoLivre';
    const emenda = new Emenda();
    emenda.comandoEmendaTextoLivre.texto = 'Texto da emenda';
    emenda.justificativa = '';

    const pendencias = component.getPendenciasPreenchimentoEmenda(emenda);

    expect(pendencias).not.to.include('Não foi informado um texto de justificação.');
  });
});
