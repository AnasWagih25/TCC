const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { loader } = require('./helpers/load-ts.cjs');
const { Database } = require('./helpers/firestore.cjs');
const proofs = new Map();
const checkoutPayment = (amount = 125, plan = 'deposit', remainingMethod = 'cash') => {
  const proofToken = randomUUID();
  proofs.set(proofToken, { id: randomUUID(), path: `payment-proofs/${proofToken}.png`, sha256: createHash('sha256').update(proofToken).digest('hex'), detectedAmount: amount, confidence: 95, uploadedAt: new Date().toISOString() });
  return { plan, remainingMethod, proofToken };
};
const expiredProofs = new Set();
let proofChecks = 0;
const load = loader({ './payment-proof': { verifyPaymentProof: (token, expectedAmount, alternativeExpectedAmount) => {
  proofChecks++;
  const receipt = proofs.get(token);
  if (!receipt || expiredProofs.has(token)) throw new OrderError('Your payment screenshot check expired. Upload it again.');
  const { amountMatchesPayment } = load('src/lib/payment-types.ts');
  if (!amountMatchesPayment(receipt.detectedAmount, expectedAmount) && (alternativeExpectedAmount === undefined || !amountMatchesPayment(receipt.detectedAmount, alternativeExpectedAmount))) throw new OrderError('The payment amount does not match the amount due.');
  return receipt;
} } });
const { OrderError, validateCheckout, priceOrder } = load('src/lib/order-domain.ts');
const { digest, persistCheckout, recoverLegacyCheckout } = load('src/lib/order-store.ts');
const { defaultPickupSettings: pickup } = load('src/lib/pickup.ts');
const categories = [{ id: 'cake', sizeType: 'normal_mini', isBoxBuilder: false }, { id: 'box', isBoxBuilder: true }];
const cake = { id: 'cake1', name: 'Chocolate cake', description: 'Cookie cake', image: '/cake.jpg', type: 'cake', stock: 5, price: { normal: 400, mini: 250 }, customizations: [{ name: 'Message', price: 20, requiresText: true, pricing: { Mini: 10 } }] };
const box = { id: 'box1', name: 'Cookie box', type: 'box', stock: 4, price: { normal: 0, mini: 0 }, flavors: [{ name: 'Milk', price: 0 }, { name: 'Kinder', price: 5 }], boxPricing: [{ size: 6, price: 270 }], customizations: [] };
const input = overrides => ({ requestId: randomUUID(), receiptToken: randomUUID(), customer: { name: 'Test customer', phone: '01000000000', email: 'test@example.com', address: 'Pickup', notes: '' }, items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 250, selectedCustomizations: [] }], deliveryMethod: 'pickup', paymentMethod: 'cash', payment: checkoutPayment(), promoCode: '', expectedTotal: 250, ...overrides });
const database = () => new Database({ 'products/cake1': cake, 'products/box1': box, 'categories/cake': categories[0], 'categories/box': categories[1], 'settings/pickup': pickup });

test('order, aggregated inventory reservation, and email job commit together', async () => {
  const db = database(); const request = validateCheckout(input());
  const order = await persistCheckout(db, request);
  assert.equal(order.customer.address, `Pickup (${pickup.address})`);
  assert.equal(order.customer.location.lat, pickup.lat);
  assert.equal(order.total, 250); assert.equal(order.deliveryFee, 0);
  assert.equal(order.payment.amountSubmitted, 125); assert.equal(order.payment.remainingAmount, 125);
  assert.equal(order.payment.status, 'pending_review'); assert.equal(order.paymentStatus, 'unpaid');
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
test('deposit calculations round up cents and include the server-priced final delivery and discount total', async () => {
  const { paymentAmounts } = load('src/lib/payment-types.ts');
  assert.equal(paymentAmounts(250.01, 'deposit').amountDue, 125.01);
  assert.equal(paymentAmounts(250.01, 'deposit').remainingAmount, 125);
  const db = database();
  const request = validateCheckout(input({ deliveryMethod: 'delivery', customer: { name: 'Test', phone: '01000000000', email: 'test@example.com', address: 'Near bakery', location: { lat: pickup.lat, lng: pickup.lng } }, promoCode: 'QUIRK', expectedTotal: 307.5, payment: checkoutPayment(153.75, 'deposit', 'instapay') }));
  const order = await persistCheckout(db, request);
  assert.equal(order.payment.amountSubmitted, 153.75); assert.equal(order.payment.remainingAmount, 153.75);
  assert.equal(order.paymentMethod, 'instapay'); assert.equal(order.payment.remainingMethod, 'instapay');
});
test('full InstaPay payment leaves no balance and waits for staff confirmation', async () => {
  const order = await persistCheckout(database(), validateCheckout(input({ payment: checkoutPayment(250, 'full', 'cash') })));
  assert.equal(order.payment.plan, 'full'); assert.equal(order.payment.amountSubmitted, 250);
  assert.equal(order.payment.remainingAmount, 0); assert.equal(order.payment.remainingMethod, 'instapay');
  assert.equal(order.paymentMethod, 'instapay'); assert.equal(order.paymentStatus, 'unpaid');
});
test('rounded-up transfers persist the actual amount and subtract it from the remaining order balance', async () => {
  for (const [plan, sent, balance] of [['deposit', 126, 124.01], ['full', 251, 0]]) {
    const db = database(); db.data.get('products/cake1').price.mini = 250.01;
    const request = validateCheckout(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 250.01 }], expectedTotal: 250.01, payment: checkoutPayment(sent, plan) }));
    const order = await persistCheckout(db, request);
    assert.equal(order.payment.amountSubmitted, sent); assert.equal(order.payment.receipt.detectedAmount, sent); assert.equal(order.payment.remainingAmount, balance);
    assert.equal(db.data.get(`paymentProofClaims/${order.payment.receipt.sha256}`).amount, sent);
    assert.equal(order.payment.status, 'pending_review'); assert.equal(order.paymentStatus, 'unpaid');
    assert.equal(db.data.get('products/cake1').stock, 4);
  }
});
test('EGP 5 and 10 rounded deposits preserve actual payments and upgrade fully covered transfers', async () => {
  for (const [requestedPlan, sent, savedPlan, balance] of [['deposit', 193, 'deposit', 192], ['deposit', 195, 'deposit', 190], ['deposit', 200, 'deposit', 185], ['deposit', 385, 'full', 0], ['deposit', 390, 'full', 0]]) {
    const db = database(); db.data.get('products/cake1').price.mini = 385;
    const request = validateCheckout(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 385 }], expectedTotal: 385, payment: checkoutPayment(sent, requestedPlan, 'cash') }));
    const saved = await persistCheckout(db, request);
    assert.equal(saved.payment.plan, savedPlan); assert.equal(saved.payment.amountSubmitted, sent); assert.equal(saved.payment.remainingAmount, balance);
    assert.equal(saved.payment.remainingMethod, savedPlan === 'full' ? 'instapay' : 'cash');
    assert.equal(saved.paymentMethod, savedPlan === 'full' ? 'instapay' : 'cash');
    assert.equal(saved.paymentStatus, 'unpaid'); assert.equal(saved.payment.status, 'pending_review');
    const recovered = await persistCheckout(db, request);
    assert.equal(recovered.id, saved.id); assert.equal(db.data.get('products/cake1').stock, 4);
  }
});
test('rounded deposit selections become full when their transfers cover a tiny order', async () => {
  const db = database(); db.data.get('products/cake1').price.mini = 0.99;
  const request = validateCheckout(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 0.99 }], expectedTotal: 0.99, payment: checkoutPayment(1, 'deposit') }));
  const saved = await persistCheckout(db, request);
  assert.equal(saved.payment.plan, 'full'); assert.equal(saved.payment.remainingAmount, 0); assert.equal(saved.payment.remainingMethod, 'instapay');
});
test('a full payment selection with only a rounded deposit or excess payment creates no order', async () => {
  for (const [plan, amount] of [['full', 195], ['deposit', 194], ['deposit', 400]]) {
    const db = database(); db.data.get('products/cake1').price.mini = 385;
    const request = validateCheckout(input({ items: [{ id: 'cake1', quantity: 1, selectedSize: 'Mini', price: 385 }], expectedTotal: 385, payment: checkoutPayment(amount, plan) }));
    await assert.rejects(persistCheckout(db, request), /amount does not match|selected payment option/);
    assert.equal(db.data.get('products/cake1').stock, 5);
    assert.equal([...db.data.keys()].filter(key => /^(orders|paymentProofClaims|orderEmailJobs)\//.test(key)).length, 0);
  }
});
test('missing screenshots, missing plans, Telda and invalid proof fields cannot enter checkout', () => {
  assert.throws(() => validateCheckout(input({ payment: undefined })), /50% InstaPay/);
  assert.throws(() => validateCheckout(input({ payment: { plan: 'deposit', remainingMethod: 'cash', proofToken: '' } })), /screenshot/);
  assert.throws(() => validateCheckout(input({ payment: { plan: 'deposit', remainingMethod: 'telda', proofToken: 'token' } })), /50% InstaPay/);
  assert.throws(() => validateCheckout(input({ paymentMethod: 'telda' })), /remaining balance/);
});
test('invalid or incorrect payment proof saves no order, email job, receipt claim or inventory change', async () => {
  for (const payment of [{ plan: 'deposit', remainingMethod: 'cash', proofToken: 'unsigned' }, checkoutPayment(1)]) {
    const db = database();
    await assert.rejects(persistCheckout(db, validateCheckout(input({ payment }))), /screenshot check expired|amount does not match/);
    assert.equal(db.data.get('products/cake1').stock, 5);
    assert.equal([...db.data.keys()].filter(key => /^(orders|orderEmailJobs|paymentProofClaims)\//.test(key)).length, 0);
  }
});
test('saved identical submissions recover after proof expiry without checking or reusing stock again', async () => {
  const db = database(), request = validateCheckout(input());
  const saved = await persistCheckout(db, request), count = proofChecks;
  expiredProofs.add(request.payment.proofToken);
  const recovered = await persistCheckout(db, request);
  assert.equal(recovered.id, saved.id); assert.equal(proofChecks, count);
  assert.equal(db.data.get('products/cake1').stock, 4);
});
test('one screenshot cannot fund two orders, even with separately checked tokens submitted concurrently', async () => {
  const db = database(), payment = checkoutPayment(), secondPayment = checkoutPayment();
  proofs.get(secondPayment.proofToken).sha256 = proofs.get(payment.proofToken).sha256;
  const results = await Promise.allSettled([persistCheckout(db, validateCheckout(input({ payment }))), persistCheckout(db, validateCheckout(input({ payment: secondPayment })))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(results.find(result => result.status === 'rejected').reason.message, /already been submitted/);
  assert.equal(db.data.get('products/cake1').stock, 4);
});
test('a failed database commit saves nothing and stock remains unchanged', async () => {
  const db = database(); db.failCommit = true;
  await assert.rejects(persistCheckout(db, validateCheckout(input())), /Database unavailable/);
  assert.equal(db.data.get('products/cake1').stock, 5);
  assert.equal([...db.data.keys()].filter(key => key.startsWith('orders/')).length, 0);
  assert.equal([...db.data.keys()].filter(key => key.startsWith('paymentProofClaims/')).length, 0);
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

test('pre-deposit saved orders recover with their original private receipt without mutating stock or jobs', async () => {
  const db = database(), legacy = input(); delete legacy.payment;
  const id = `ORD-${legacy.requestId}`;
  db.data.set(`orders/${id}`, { id, source: 'web', customer: legacy.customer, items: [{ id: 'cake1', quantity: 1 }], total: 250, status: 'pending', receiptHash: digest(legacy.receiptToken), requestHash: digest(JSON.stringify(legacy)) });
  db.data.set(`orderEmailJobs/${id}`, { state: 'pending', attempts: 0 });
  db.data.get('products/cake1').stock = 4;
  const before = JSON.stringify([...db.data]);
  const recovered = await recoverLegacyCheckout(db, legacy);
  assert.equal(recovered.id, id); assert.equal(recovered.receiptHash, undefined); assert.equal(recovered.requestHash, undefined);
  assert.equal(JSON.stringify([...db.data]), before);
});

test('legacy recovery rejects guessed references, wrong capabilities, modern orders and explicit empty payment fields', async () => {
  const db = database(), legacy = input(); delete legacy.payment;
  const id = `ORD-${legacy.requestId}`, stored = { id, source: 'web', receiptHash: digest(legacy.receiptToken) };
  db.data.set(`orders/${id}`, stored);
  assert.equal(await recoverLegacyCheckout(db, { ...legacy, requestId: randomUUID() }), null);
  assert.equal(await recoverLegacyCheckout(db, { ...legacy, receiptToken: randomUUID() }), null);
  assert.equal(await recoverLegacyCheckout(db, { ...legacy, payment: null }), null);
  db.data.set(`orders/${id}`, { ...stored, payment: { plan: 'full' } });
  assert.equal(await recoverLegacyCheckout(db, legacy), null);
  db.data.set(`orders/${id}`, { ...stored, source: 'manual' });
  assert.equal(await recoverLegacyCheckout(db, legacy), null);
  const neverRead = { runTransaction() { throw new Error('Invalid capabilities must not look up orders.'); } };
  assert.equal(await recoverLegacyCheckout(neverRead, { requestId: '../orders', receiptToken: randomUUID() }), null);
  assert.equal(await recoverLegacyCheckout(neverRead, { requestId: 'a'.repeat(36), receiptToken: randomUUID() }), null);
});
