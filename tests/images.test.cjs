const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

function renderImage(input) {
  let imageProps;
  const NextImage = props => {
    imageProps = props;
    return React.createElement('img', { src: props.src, alt: props.alt });
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/OptimizedImage.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require: name => name === 'next/image' ? { default: NextImage, __esModule: true } : name === '@/context/CartContext' ? { resolveImageUrl: value => value || '/images/preview.png' } : require(name) });
  renderToStaticMarkup(React.createElement(exports.default, input));
  return imageProps;
}
test('inline and blob images retain the same fill layout as uploaded images', () => {
  for (const src of ['data:image/png;base64,aGVsbG8=', 'blob:http://localhost/test', 'https://example.com/cake.jpg']) {
    const props = renderImage({ src, alt: 'Cookie cake', fill: true, objectFit: 'contain' });
    assert.equal(props.fill, true);
    assert.equal(props.width, undefined);
    assert.equal(props.height, undefined);
    assert.equal(props.style.objectFit, 'contain');
    assert.equal(props.unoptimized, !src.startsWith('https:'));
    assert.equal(props.src, src);
    assert.equal(typeof props.onError, 'function');
  }
});
test('local images keep optimization and explicitly requested dimensions', () => {
  const props = renderImage({ src: '/images/classic1.png', alt: 'Classic cake', width: 52, height: 52 });
  assert.equal(props.unoptimized, false);
  assert.equal(props.width, 52);
  assert.equal(props.height, 52);
});
test('empty and invalid image values render the bakery fallback safely', () => {
  for (const src of ['', '   ', null]) {
    const props = renderImage({ src, alt: 'Cookie cake' });
    assert.equal(props.src, '/images/preview.png');
  }
});
