const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loader } = require('./helpers/load-ts.cjs');
const { Database } = require('./helpers/firestore.cjs');
const request = () => new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify({ requestId: randomUUID(), receiptToken: randomUUID(), customer: { name: 'Test', phone: '01000000000', email: 'test@example.com', address: '', notes: '' }, items: [{ id: 'p1', quantity: 1, selectedSize: 'Mini' }], deliveryMethod: 'pickup', paymentMethod: 'cash', payment: { plan: 'deposit', remainingMethod: 'cash', proofToken: 'signed-test-proof' }, promoCode: '', expectedTotal: 250 }) });
const responseMocks = { 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: () => {} } };
test('checkout never returns a successful order when persistence fails', async () => {
  const load = loader({ ...responseMocks, '@/lib/firebase-admin': { serverFirebaseConfigured: () => true, adminDatabase: () => ({}) }, '@/lib/order-store': { persistCheckout: async () => { throw new Error('Database unavailable'); } }, '@/lib/order-notifications': { sendOrderNotification: async () => {} } }, { console: { error() {} } });
  const response = await load('src/app/api/orders/route.ts').POST(request()); assert.equal(response.status, 503); const data = await response.json(); assert.equal(data.order, undefined); assert.equal(data.definitive, false);
});
test('checkout confirms persisted orders before email and retains queued work when mail fails', async () => {
  const callbacks = [];
  const load = loader({ 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: callback => callbacks.push(callback) }, '@/lib/firebase-admin': { serverFirebaseConfigured: () => true, adminDatabase: () => ({}) }, '@/lib/order-store': { persistCheckout: async () => ({ id: 'ORD-saved', items: [{ name: 'Cookie' }] }) }, '@/lib/order-notifications': { sendOrderNotification: async () => { throw new Error('SMTP offline'); } } }, { console: { error() {} } });
  const response = await load('src/app/api/orders/route.ts').POST(request()); assert.equal(response.status, 201); assert.equal((await response.json()).order.id, 'ORD-saved'); assert.equal(callbacks.length, 1); await callbacks[0]();
});
test('unconfigured checkout fails explicitly without claiming success', async () => {
  const load = loader({ ...responseMocks, '@/lib/firebase-admin': { serverFirebaseConfigured: () => false }, '@/lib/order-store': { persistCheckout: async () => { throw new Error('Unconfigured checkout must not write orders.'); } } });
  const response = await load('src/app/api/orders/route.ts').POST(request()); assert.equal(response.status, 503); assert.equal((await response.json()).definitive, true);
});
test('public email payloads cannot send email or replace persisted order data', async () => {
  let called = false;
  const load = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: async () => { throw new Error('ADMIN_AUTH_REQUIRED'); } }, '@/lib/order-notifications': { sendOrderNotification: async () => { called = true; } } });
  const response = await load('src/app/api/send-order-email/route.ts').POST(new Request('http://localhost/api/send-order-email', { method: 'POST', body: JSON.stringify({ orderId: 'ORD-1', total: 1 }) })); assert.equal(response.status, 403); assert.equal(called, false);
});

test('Vercel GET cron and external POST retries require a valid configured secret', async () => {
  const callbacks = [];
  const load = loader({ 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: fn => callbacks.push(fn) }, '@/lib/firebase-admin': { adminDatabase: () => ({}) }, '@/lib/order-notifications': { retryOrderNotifications: async () => [] } }, { process: { env: { CRON_SECRET: 'test-cron-secret' } } });
  const route = load('src/app/api/internal/order-emails/route.ts');
  assert.equal((await route.GET(new Request('https://example.com/api/internal/order-emails'))).status, 401);
  assert.equal((await route.GET(new Request('https://example.com/api/internal/order-emails', { headers: { Authorization: 'Bearer wrong' } }))).status, 401);
  assert.equal((await route.GET(new Request('https://example.com/api/internal/order-emails', { headers: { Authorization: 'Bearer test-cron-secret' } }))).status, 202);
  assert.equal(callbacks.length, 1); await callbacks[0]();
});

test('background dashboard retries are staff-only and keep work after the response', async () => {
  const callbacks = [];
  const mocks = { 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: fn => callbacks.push(fn) }, '@/lib/order-notifications': { retryOrderNotifications: async () => [] } };
  const denied = loader({ ...mocks, '@/lib/firebase-admin': { requireAdmin: async () => { throw new Error('ADMIN_AUTH_REQUIRED'); } } });
  assert.equal((await denied('src/app/api/admin/order-emails/route.ts').POST(new Request('https://example.com/api/admin/order-emails'))).status, 403);
  const allowed = loader({ ...mocks, '@/lib/firebase-admin': { requireAdmin: async () => ({}), adminDatabase: () => ({}) } });
  assert.equal((await allowed('src/app/api/admin/order-emails/route.ts').POST(new Request('https://example.com/api/admin/order-emails'))).status, 202);
  assert.equal(callbacks.length, 1); await callbacks[0]();
});

test('legacy saved checkout recovery returns only the existing order and does not queue another notification', async () => {
  const { digest, recoverLegacyCheckout } = loader()('src/lib/order-store.ts');
  const callbacks = [], requestId = randomUUID(), receiptToken = randomUUID(), id = `ORD-${requestId}`;
  const db = new Database({ [`orders/${id}`]: { id, source: 'web', total: 250, items: [{ id: 'cake1', quantity: 1 }], receiptHash: digest(receiptToken), requestHash: 'old-private-request-hash' } });
  let persisted = 0, sent = 0;
  const load = loader({
    'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: callback => callbacks.push(callback) },
    '@/lib/firebase-admin': { serverFirebaseConfigured: () => true, adminDatabase: () => db },
    '@/lib/order-store': { recoverLegacyCheckout, persistCheckout: async () => { persisted++; throw new Error('Recovery must not place a new order.'); } },
    '@/lib/order-notifications': { sendOrderNotification: async () => { sent++; } },
  });
  const response = await load('src/app/api/orders/route.ts').POST(new Request('https://example.com/api/orders', { method: 'POST', body: JSON.stringify({ requestId, receiptToken }) }));
  const data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.order.id, id);
  assert.equal(data.order.receiptHash, undefined); assert.equal(data.order.requestHash, undefined);
  assert.equal(persisted, 0); assert.equal(sent, 0); assert.equal(callbacks.length, 0);
  assert.equal(db.data.size, 1);
});

test('missing payment never creates orders through legacy recovery for wrong secrets or unknown references', async () => {
  const { digest, recoverLegacyCheckout } = loader()('src/lib/order-store.ts');
  const requestId = randomUUID(), receiptToken = randomUUID(), id = `ORD-${requestId}`;
  const db = new Database({ [`orders/${id}`]: { id, source: 'web', receiptHash: digest(receiptToken), total: 250 } });
  let persisted = 0, queued = 0;
  const load = loader({
    'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) }, after: () => { queued++; } },
    '@/lib/firebase-admin': { serverFirebaseConfigured: () => true, adminDatabase: () => db },
    '@/lib/order-store': { recoverLegacyCheckout, persistCheckout: async () => { persisted++; } },
    '@/lib/order-notifications': { sendOrderNotification: async () => {} },
  });
  const body = await request().json(); delete body.payment;
  const before = JSON.stringify([...db.data]);
  for (const changes of [{ requestId, receiptToken: randomUUID() }, { requestId: randomUUID(), receiptToken }, { requestId, receiptToken, payment: null }]) {
    const response = await load('src/app/api/orders/route.ts').POST(new Request('https://example.com/api/orders', { method: 'POST', body: JSON.stringify({ ...body, ...changes }) }));
    const data = await response.json();
    assert.equal(response.status, 400); assert.equal(data.order, undefined); assert.match(data.error, /50% InstaPay/);
  }
  assert.equal(persisted, 0); assert.equal(queued, 0); assert.equal(JSON.stringify([...db.data]), before);
});
