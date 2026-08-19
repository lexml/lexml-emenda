export class LexmlEmendaConfig {
  anexoParecer = false;
  urlConsultaParlamentares = 'api/parlamentares';
  urlAutocomplete = 'api/autocomplete-norma';
  urlComissoes?: string;
  tamanhoMaximoAnexo = 5120; //5MB
  tamanhoMaximoImagem = 2048; //2MB
}
