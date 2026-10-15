const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const load = loader();
const { reconcileProductEdit } = load('src/lib/catalog-edit.ts');
const { normalizeAdminOrder, orderIssues, ordersCsv } = load('src/lib/admin-orders.ts');
const { remainingCart } = load('src/lib/order-client.ts');

test('editing a price preserves stock reserved by an order while the editor was open', () => {
  const original = { id: 'p1', stock: 5, price: { normal: 400 } };
  const saved = reconcileProductEdit({ ...original, stock: 4 }, { ...original, price: { normal: 450 } }, original);
  assert.equal(saved.stock, 4); assert.equal(saved.price.normal, 450);
});
test('conflicting stock, product revisions, deleted products and reused IDs are rejected', () => {
  const original = { id: 'p1', stock: 5, updatedAt: 'old' };
  assert.throws(() => reconcileProductEdit({ ...original, stock: 4 }, { ...original, stock: 9 }, original), /Stock changed/);
  assert.throws(() => reconcileProductEdit({ ...original, updatedAt: 'new' }, original, original), /product changed/);
  assert.throws(() => reconcileProductEdit(null, original, original), /removed/);
  assert.throws(() => reconcileProductEdit(original, original), /already uses/);
});
test('legacy and malformed orders stay visible without crashing or inventing missing data', () => {
  const order = normalizeAdminOrder('real-document-id', { id: 'incorrect-embedded-id', customer: null, items: [null, { name: { bad: true }, quantity: 'wrong', selectedCustomizations: [{ name: {}, text: {} }], boxFlavors: [null] }], deliveryMethod: 'uber' });
  assert.equal(order.id, 'real-document-id'); assert.equal(order.deliveryMethod, 'delivery'); assert.equal(order.customer.name, 'Customer not recorded'); assert.equal(order.items[0].name, 'Item name not recorded'); assert.equal(order.items[0].selectedCustomizations[0].text, ''); assert.ok(orderIssues(order).includes('Total not recorded'));
});
test('CSV preserves all customization text and protects formula-like customer fields', () => {
  const order = normalizeAdminOrder('ORD-1', { date: new Date().toISOString(), status: 'pending', total: 40, customer: { name: '=HYPERLINK("evil")', phone: '+20100000000' }, items: [{ name: 'Cookie', price: 20, quantity: 2, selectedSize: 'Mini', selectedCustomizations: [{ name: 'Text', text: 'Happy "day"', price: 5 }] }] });
  const csv = ordersCsv([order]); assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes("'+20100000000")); assert.ok(csv.includes('Happy ""day""')); assert.ok(csv.includes('unit 20'));
});
test('recovering an interrupted order removes only its selections and preserves newly added bag items', () => {
  const confirmed = { id: 'p1', selectedSize: 'Mini', quantity: 1, selectedCustomizations: [] };
  const cart = [{ ...confirmed, quantity: 3 }, { id: 'p2', selectedSize: 'Normal', quantity: 2 }];
  const result = remainingCart(cart, [confirmed]); assert.equal(result[0].quantity, 2); assert.equal(result[1].quantity, 2); assert.equal(cart[0].quantity, 3);
});

test('slow saves unlock controls without falsely reporting that a write failed permanently', async () => {
  const { confirmWrite } = load('src/lib/confirm-write.ts');
  await assert.rejects(confirmWrite(new Promise(() => {}), 5), /may still finish/);
  assert.equal(await confirmWrite(Promise.resolve('confirmed'), 20), 'confirmed');
});

test('confirmed personal messages clear from the bag even when the server trims surrounding spaces', () => {
  const item = { id: 'p1', selectedSize: 'Normal', quantity: 1, selectedCustomizations: [{ name: 'Writing', price: 55, text: '  Happy birthday  ' }] };
  assert.equal(remainingCart([item], [{ ...item, selectedCustomizations: [{ name: 'Writing', price: 55, text: 'Happy birthday' }] }]).length, 0);
});

test('Google Maps parsing uses the destination pin instead of its camera and handles encoded coordinates safely', () => {
  const { parseGoogleMapsUrl } = load('src/lib/maps.ts');
  assert.equal(parseGoogleMapsUrl('https://www.google.com/maps/place/X/@29.9,31.3,17z/data=!3d30.0277375!4d31.5482969').lat, 30.0277375);
  assert.equal(parseGoogleMapsUrl('https://www.google.com/maps/dir/?api=1&destination=30%2C31').lng, 31);
  assert.equal(parseGoogleMapsUrl('%invalid').coordinatesFound, false);
  assert.equal(parseGoogleMapsUrl('999,999').coordinatesFound, false);
});
