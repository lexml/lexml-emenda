import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const declarationsPath = packageJson.types;
const publicRuntimeValues = ['Emenda', 'LexmlEmendaComponent', 'LexmlEmendaConfig', 'LexmlEmendaParametrosEdicao'];
const registeredCustomElements = [
  'emenda-dividida-modal',
  'lexml-emenda',
  'lexml-emenda-ajuda',
  'lexml-emenda-ajuda-modal',
  'lexml-emenda-alertas',
  'lexml-emenda-alterar-largura-imagem-modal',
  'lexml-emenda-alterar-largura-tabela-coluna-modal',
  'lexml-emenda-articulacao',
  'lexml-emenda-atalhos',
  'lexml-emenda-atalhos-modal',
  'lexml-emenda-autocomplete',
  'lexml-emenda-autocomplete-async',
  'lexml-emenda-autocomplete-norma',
  'lexml-emenda-autoria',
  'lexml-emenda-comando',
  'lexml-emenda-comando-modal',
  'lexml-emenda-data',
  'lexml-emenda-destino',
  'lexml-emenda-editor-texto-rico',
  'lexml-emenda-elemento',
  'lexml-emenda-eta',
  'lexml-emenda-opcoes-impressao',
  'lexml-emenda-substituicao-termo',
  'lexml-emenda-sufixos-modal',
  'lexml-emenda-switch-revisao',
  'lexml-eta-editor',
];

assert.equal(declarationsPath, 'dist/types/src/index.d.ts');
assert.ok(existsSync('dist/index.js'), 'O bundle principal não foi gerado.');
assert.ok(existsSync('dist/index.min.js'), 'O bundle minificado não foi gerado.');
assert.ok(existsSync(declarationsPath), 'As declarações TypeScript não foram geradas.');

const declarations = readFileSync(declarationsPath, 'utf8');
const javascript = readFileSync('dist/index.js', 'utf8');

const parseExportedNames = value =>
  value
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
    .map(specifier => specifier.split(/\s+as\s+/).at(-1));

const declarationExports = [...declarations.matchAll(/^export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?$/gm)]
  .flatMap(match => parseExportedNames(match[1]))
  .sort();

assert.deepEqual(declarationExports, [...publicRuntimeValues].sort(), 'A API pública de tipos divergiu da allowlist.');

const javascriptExportMatch = [...javascript.matchAll(/^export\s*\{([^}]*)\};$/gm)].at(-1);
assert.ok(javascriptExportMatch, 'A lista de exports do bundle não foi encontrada.');
assert.deepEqual(parseExportedNames(javascriptExportMatch[1]).sort(), [...publicRuntimeValues].sort(), 'A API pública de runtime divergiu da allowlist.');

for (const tag of registeredCustomElements) {
  assert.ok(javascript.includes(`customElement('${tag}')`), `O bundle não registra o componente <${tag}>.`);
}

for (const forbiddenReference of ['C:\\Users\\', 'node_modules']) {
  assert.equal(declarations.includes(forbiddenReference), false, `Referência não publicável encontrada no index.d.ts: ${forbiddenReference}`);
}

console.log('Contrato público, tipos e registros do pacote validados com sucesso.');
