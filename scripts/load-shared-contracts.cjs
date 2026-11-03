// Offline TypeScript test loader. SQL tooling must not load a mobile/UI harness.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../shared/contracts/v1');
const cache = new Map();
function loadSharedContract(name) {
  const file = path.resolve(root, `${name}.ts`);
  if (!file.startsWith(root + path.sep)) throw new Error('Shared-contract import outside boundary');
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS }, fileName: file }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(specifier) {
    if (!specifier.startsWith('./')) throw new Error('External shared-contract import');
    return loadSharedContract(specifier);
  } }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
module.exports = { loadSharedContract };
