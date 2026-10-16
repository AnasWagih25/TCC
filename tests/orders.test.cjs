const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loader } = require('./helpers/load-ts.cjs');
const { Database } = require('./helpers/firestore.cjs');
const load = loader();
const { validateCheckout, priceOrder } = load('src/lib/order-domain.ts');
const { persistCheckout } = load('src/lib/order-store.ts');
const { defaultPickupSettings: pickup } = load('src/lib/pickup.ts');
const categories = [{ id: 'cake', sizeType: 'normal_mini', isBoxBuilder: false }, { id: 'box', isBoxBuilder: true }];
const cake = { id: 'cake1', name: 'Chocolate cake', description: 'Cookie cake', image: '/cake.jpg', type: 'cake', stock: 5, price: { normal: 400, mini: 250 }, customizations: [{ name: 'Message', price: 20, requiresText: true, pricing: { Mini: 10 } }] };
const box = { id: 'box1', name: 'Cookie box', type: 'box', stock: 4, price: { normal: 0, mini: 0 }, flavors: [{ name: 'Milk', price: 0 }, { name: 'Kinder', price: 5 }], boxPricing: [{ size: 6, price: 270 }], customizations: [] };
const input = overrides => ({ requestId: randomUUID(), receiptToken: randomUUID(), customer: { name: 'Test customer', phone: '01000000000', email: 'test@example.com', address: 'Pickup', notes: '' }, items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 250, selectedCustomizations: [] }], deliveryMethod: 'pickup', paymentMethod: 'cash', promoCode: '', expectedTotal: 250, ...overrides });
const database = () => new Database({ 'products/cake1': cake, 'products/box1': box, 'categories/cake': categories[0], 'categories/box': categories[1], 'settings/pickup': pickup });

test('order, aggregated inventory reservation, and email job commit together', async () => {
  const db = database(); const request = validateCheckout(input());
  const order = await persistCheckout(db, request);
  assert.equal(order.customer.address, `Pickup (${pickup.address})`);
  assert.equal(order.customer.location.lat, pickup.lat);
  assert.equal(order.total, 250); assert.equal(order.deliveryFee, 0);
  assert.equal(db.data.get('products/cake1').stock, 4);
  assert.equal(db.data.get(`orderEmailJobs/${order.id}`).state, 'pending');
  assert.ok(db.data.get(`orders/${order.id}`).receiptHash);
  assert.equal(order.receiptHash, undefined);
});
test('repeated concurrent requests reserve stock once and return one order', async () => {
  const db = database(), request = validateCheckout(input());
  const [first, second] = await Promise.all([persistCheckout(db, request), persistCheckout(db, request)]);
  assert.equal(first.id, second.id); assert.equal(db.data.get('products/cake1').stock, 4);
  assert.equal([...db.data.keys()].filter(key => key.startsWith('orders/')).length, 1);
});
test('a failed database commit saves nothing and stock remains unchanged', async () => {
  const db = database(); db.failCommit = true;
  await assert.rejects(persistCheckout(db, validateCheckout(input())), /Database unavailable/);
  assert.equal(db.data.get('products/cake1').stock, 5);
  assert.equal([...db.data.keys()].filter(key => key.startsWith('orders/')).length, 0);
});
test('stock checks aggregate different sizes and prevent overselling', async () => {
  const db = database(); db.data.get('products/cake1').stock = 1;
  const outcomes = await Promise.allSettled([persistCheckout(db, validateCheckout(input())), persistCheckout(db, validateCheckout(input()))]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(db.data.get('products/cake1').stock, 0);
  const request = input({ items: [{ id: 'cake1', quantity: 3, selectedSize: 'Mini' }, { id: 'cake1', quantity: 3, selectedSize: 'Normal' }], expectedTotal: 1950 });
  assert.throws(() => priceOrder(request, [cake], categories, null, pickup), /Only 5/);
});
test('reusing a reference with another receipt or different details is rejected', async () => {
  const db = database(), request = validateCheckout(input()); await persistCheckout(db, request);
  await assert.rejects(persistCheckout(db, { ...request, receiptToken: randomUUID() }), /different submission/);
  await assert.rejects(persistCheckout(db, { ...request, paymentMethod: 'telda' }), /different submission/);
});
test('server calculates size-specific extras, box surcharges and promo totals', () => {
  const request = input({ items: [{ id: 'cake1', quantity: 2, selectedSize: 'Mini', selectedCustomizations: [{ name: 'Message', price: 0, text: 'Happy day' }] }, { id: 'box1', quantity: 1, selectedSize: 'Normal', boxSize: 6, boxFlavors: [{ name: 'Milk', quantity: 4 }, { name: 'Kinder', quantity: 2 }] }], promoCode: 'QUIRK', expectedTotal: 760 });
  const priced = priceOrder(request, [cake, box], categories, null, pickup);
  assert.equal(priced.subtotal, 800); assert.equal(priced.discount, 40); assert.equal(priced.total, 760);
  assert.equal(priced.items[0].selectedCustomizations[0].price, 10);
});
test('stale prices, bad extras, unfilled boxes, missing personal text, invalid customers and distant delivery are rejected', () => {
  assert.throws(() => priceOrder(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 1 }] }), [cake], categories, null, pickup), /price changed/);
  assert.throws(() => priceOrder(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', selectedCustomizations: [{ name: 'Message' }] }] }), [cake], categories, null, pickup), /text for Message/);
  assert.throws(() => priceOrder(input({ items: [{ id: 'box1', quantity: 1, selectedSize: 'Normal', boxSize: 6, boxFlavors: [{ name: 'Milk', quantity: 1 }] }] }), [box], categories, null, pickup), /exactly 6/);
  assert.throws(() => validateCheckout(input({ customer: { name: 'A', phone: 'abc', email: 'invalid' } })), /phone/);
  assert.throws(() => priceOrder(input({ deliveryMethod: 'delivery', customer: { location: { lat: 0, lng: 0 } } }), [cake], categories, null, pickup), /outside our delivery/);
});

test('lost response retains the prepared reference and bag data for safe retry', async () => {
  const { createOrderSubmitter } = load('src/lib/order-client.ts');
  const stored = new Map(); const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  const bodies = []; let fail = true;
  const submit = createOrderSubmitter(storage, async (_, options) => { const request = JSON.parse(options.body); bodies.push(request); if (fail) { fail = false; throw new Error('Connection lost'); } return { ok: true, json: async () => ({ order: { id: `ORD-${request.requestId}`, items: request.items } }) }; });
  const { requestId, receiptToken, ...details } = input();
  await assert.rejects(submit(details), /Reference: ORD-/); assert.equal(stored.size, 1);
  await assert.rejects(submit({ ...details, paymentMethod: 'telda' }), /previous submission/);
  await submit(details); assert.equal(stored.size, 0); assert.equal(bodies[0].requestId, bodies[1].requestId); assert.equal(bodies[0].receiptToken, bodies[1].receiptToken);
});
test('definitive server rejection allows the customer to correct an order', async () => {
  const { createOrderSubmitter } = load('src/lib/order-client.ts');
  const bodies = []; let reject = true;
  const submit = createOrderSubmitter(null, async (_, options) => { const body = JSON.parse(options.body); bodies.push(body); const ok = !reject; reject = false; return { ok, json: async () => ok ? { order: { id: `ORD-${body.requestId}`, items: body.items } } : { error: 'Out of stock', definitive: true } }; });
  const { requestId, receiptToken, ...details } = input();
  await assert.rejects(submit(details), /Out of stock/); await submit({ ...details, paymentMethod: 'instapay' }); assert.notEqual(bodies[0].requestId, bodies[1].requestId);
});

test('an empty production 500 response preserves recovery and shows a useful service error', async () => {
  const { createOrderSubmitter } = load('src/lib/order-client.ts');
  const stored = new Map();
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  const submit = createOrderSubmitter(storage, async () => new Response(null, { status: 500 }));
  const { requestId, receiptToken, ...details } = input();
  await assert.rejects(submit(details), /ordering service is temporarily unavailable.*Reference: ORD-/);
  assert.equal(stored.size, 1);
});
