const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const { selectedExtras, missingExtraText, boxPrice } = loader()('src/lib/menu-options.ts');

const product = {
  boxPricing: [{ size: 4, price: 270 }, { size: 6, price: 380 }],
  flavors: [{ name: 'Kinder', price: 15 }, { name: 'Belgian', price: 0 }],
  customizations: [
    { name: 'Writing', price: 55, pricing: { Normal: 55, Mini: 35, 4: 20, 6: 30 }, requiresText: true },
    { name: 'Ribbon', price: 10 },
  ],
};

test('extras use each cake or box size price, including a zero-price override', () => {
  for (const [size, expected] of [['Normal', 55], ['Mini', 35], ['4', 20], ['6', 30]]) {
    assert.equal(selectedExtras(product, size, { Writing: true }, { Writing: 'Hello' })[0].price, expected);
  }
  const free = { customizations: [{ name: 'Gift note', price: 10, pricing: { 4: 0 } }] };
  assert.equal(selectedExtras(free, '4', { 'Gift note': true }, {})[0].price, 0);
});

test('box total includes quantity-based flavor upgrades and size-priced extras', () => {
  const extras = selectedExtras(product, '6', { Writing: true, Ribbon: true }, { Writing: 'Happy birthday!' });
  const result = boxPrice(product, 6, { Kinder: 2, Belgian: 4 }, extras);
  assert.equal(result.base, 380);
  assert.equal(result.flavors, 30);
  assert.equal(result.additions, 40);
  assert.equal(result.total, 450);
});

test('only selected writing requires nonblank text, and saved wording is trimmed', () => {
  assert.equal(missingExtraText(product, { Writing: true }, { Writing: '   ' }), true);
  assert.equal(missingExtraText(product, { Writing: false, Ribbon: true }, {}), false);
  assert.equal(missingExtraText(product, { Writing: true }, { Writing: '  Sara  ' }), false);
  const extras = selectedExtras(product, 'Mini', { Writing: true, Ribbon: true }, { Writing: '  Sara  ', Ribbon: 'stale text' });
  assert.equal(extras[0].text, 'Sara');
  assert.equal('text' in extras[1], false);
});
