const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loader } = require('./helpers/load-ts.cjs');
const request = () => new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify({ requestId: randomUUID(), receiptToken: randomUUID(), customer: { name: 'Test', phone: '01000000000', email: 'test@example.com', address: '', notes: '' }, items: [{ id: 'p1', quantity: 1, selectedSize: 'Mini' }], deliveryMethod: 'pickup', paymentMethod: 'cash', promoCode: '', expectedTotal: 250 }) });
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
  const load = loader({ ...responseMocks, '@/lib/firebase-admin': { serverFirebaseConfigured: () => false } });
  const response = await load('src/app/api/orders/route.ts').POST(request()); assert.equal(response.status, 503); assert.equal((await response.json()).definitive, true);
});
test('public email payloads cannot send email or replace persisted order data', async () => {
  let called = false;
  const load = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: async () => { throw new Error('ADMIN_AUTH_REQUIRED'); } }, '@/lib/order-notifications': { sendOrderNotification: async () => { called = true; } } });
  const response = await load('src/app/api/send-order-email/route.ts').POST(new Request('http://localhost/api/send-order-email', { method: 'POST', body: JSON.stringify({ orderId: 'ORD-1', total: 1 }) })); assert.equal(response.status, 403); assert.equal(called, false);
});
