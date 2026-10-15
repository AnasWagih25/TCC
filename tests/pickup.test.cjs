const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
const compiled = ts.transpileModule(fs.readFileSync('src/lib/pickup.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(compiled, { exports: exportsObject });
const { defaultPickupSettings, resolvePickupSettings } = exportsObject;

test('directions use the same verified pin as the pickup map', () => {
  const destination = new URL(defaultPickupSettings.mapUrl).searchParams.get('destination');
  assert.equal(destination, `${defaultPickupSettings.lat},${defaultPickupSettings.lng}`);
  assert.equal(defaultPickupSettings.address, '2GHX+38V, Second New Cairo, Cairo Governorate 4761201');
});

test('old cloud and cached branch pins migrate without changing pickup hours', () => {
  for (const pin of [{ lat: 29.9775379, lng: 31.3876624 }, { lat: 30.045, lng: 31.48 }]) {
    const result = resolvePickupSettings({ ...defaultPickupSettings, ...pin, address: 'Old branch', mapUrl: 'https://example.com/old', hoursNotice: 'Custom pickup hours' });
    assert.equal(result.lat, 30.0277375);
    assert.equal(result.lng, 31.5482969);
    assert.equal(result.address, defaultPickupSettings.address);
    assert.equal(result.mapUrl, defaultPickupSettings.mapUrl);
    assert.equal(result.hoursNotice, 'Custom pickup hours');
  }
});

test('future administrator location edits are preserved', () => {
  const future = { ...defaultPickupSettings, lat: 30.08, lng: 31.6, address: 'Future branch' };
  assert.equal(resolvePickupSettings(future), future);
  assert.equal(resolvePickupSettings(defaultPickupSettings), defaultPickupSettings);
});
