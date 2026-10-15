const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
exports.loader = function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} }; cache.set(file, module.exports);
    const imported = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('.') || name.startsWith('@/')) {
        let target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name);
        if (!path.extname(target)) target += fs.existsSync(`${target}.ts`) ? '.ts' : '.tsx';
        return load(target);
      }
      return require(name);
    };
    vm.runInNewContext(output, { module, exports: module.exports, require: imported, process: { env: {} }, console, Error, URL, Request, Response, AbortController, setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto, Buffer, fetch, ...globals }, { filename: file });
    cache.set(file, module.exports); return module.exports;
  }
  return load;
};
