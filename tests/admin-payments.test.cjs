const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const { Database } = require('./helpers/firestore.cjs');

const receipt = { id: '3c67613f-6d89-46ee-bb63-c79ef4db6353', path: 'payment-receipts/3c67613f-6d89-46ee-bb63-c79ef4db6353.jpg', sha256: 'a'.repeat(64), detectedAmount: 285, confidence: 91, uploadedAt: '2026-10-16T10:00:00Z' };
const payment = { plan: 'deposit', amountSubmitted: 285, remainingAmount: 285, remainingMethod: 'cash', status: 'pending_review', receipt };
const order = { id: 'ORD-test', total: 570, payment, paymentMethod: 'instapay', paymentStatus: 'unpaid', status: 'pending', date: '2026-10-16T10:00:00Z', source: 'web', deliveryMethod: 'delivery', customer: { name: 'Test', phone: '01000000000', email: '', address: 'Cairo', notes: '' }, items: [{ id: 'p1', name: 'Cookie cake', price: 500, quantity: 1 }], deliveryFee: 70, discount: 0 };
const responseMocks = { 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } } };
const context = { params: Promise.resolve({ id: 'ORD-test' }) };
const request = action => new Request('https://example.com/api/admin/payments/ORD-test', { method: 'POST', body: JSON.stringify({ action }) });
function paymentRoute(db, auth = async () => ({ uid: 'staff' })) {
  return loader({ ...responseMocks, '@/lib/firebase-admin': { adminDatabase: () => db, requireAdmin: auth } })('src/app/api/admin/payments/[id]/route.ts');
}

test('only staff can inspect payment screenshots or change transfer review', async () => {
  const denied = async () => { throw new Error('ADMIN_AUTH_REQUIRED'); };
  assert.equal((await paymentRoute({}, denied).POST(request('verify_transfer'), context)).status, 403);
  const route = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: denied } })('src/app/api/admin/payment-receipt/[id]/route.ts');
  assert.equal((await route.GET(new Request('https://example.com'), context)).status, 403);
});

test('a deposit must be verified before the balance can be collected, and full payment is never inferred from OCR alone', async () => {
  const db = new Database({ 'orders/ORD-test': order });
  const route = paymentRoute(db);
  assert.equal((await route.POST(request('receive_balance'), context)).status, 409);
  assert.equal(db.data.get('orders/ORD-test').paymentStatus, 'unpaid');
  assert.equal((await route.POST(request('verify_transfer'), context)).status, 200);
  let saved = db.data.get('orders/ORD-test');
  assert.equal(saved.payment.status, 'verified'); assert.equal(saved.paymentStatus, 'unpaid'); assert.equal(saved.payment.verifiedBy, 'staff'); assert.equal(saved.payment.remainingAmount, 285);
  assert.equal((await route.POST(request('receive_balance'), context)).status, 200);
  saved = db.data.get('orders/ORD-test');
  assert.equal(saved.paymentStatus, 'paid'); assert.equal(saved.payment.balanceReceivedBy, 'staff'); assert.equal(saved.payment.remainingAmount, 285);
  const recordedAt = saved.payment.balanceReceivedAt;
  assert.equal((await route.POST(request('receive_balance'), context)).status, 200);
  assert.equal(db.data.get('orders/ORD-test').payment.balanceReceivedAt, recordedAt);
});

test('staff confirmation records a full transfer as paid and rejected transfers remain unpaid', async () => {
  const db = new Database({ 'orders/ORD-test': { ...order, payment: { ...payment, plan: 'full', amountSubmitted: 570, remainingAmount: 0, receipt: { ...receipt, detectedAmount: 570 } } } });
  const route = paymentRoute(db);
  assert.equal((await route.POST(request('reject_transfer'), context)).status, 200);
  assert.equal(db.data.get('orders/ORD-test').paymentStatus, 'unpaid');
  assert.equal(db.data.get('orders/ORD-test').payment.status, 'rejected');
  assert.equal((await route.POST(request('verify_transfer'), context)).status, 200);
  assert.equal(db.data.get('orders/ORD-test').paymentStatus, 'paid');
  assert.equal((await route.POST(request('reject_transfer'), context)).status, 409);
});

test('staff can confirm rounded-up deposits and full transfers with their actual reduced balances', async () => {
  for (const [plan, amountSubmitted, remainingAmount, status] of [['deposit', 126, 124.01, 'unpaid'], ['full', 251, 0, 'paid']]) {
    const db = new Database({ 'orders/ORD-test': { ...order, total: 250.01, payment: { ...payment, plan, amountSubmitted, remainingAmount, receipt: { ...receipt, detectedAmount: amountSubmitted } } } });
    const route = paymentRoute(db);
    assert.equal((await route.POST(request('verify_transfer'), context)).status, 200);
    assert.equal(db.data.get('orders/ORD-test').paymentStatus, status);
    assert.equal(db.data.get('orders/ORD-test').payment.remainingAmount, remainingAmount);
    if (plan === 'deposit') assert.equal((await route.POST(request('receive_balance'), context)).status, 200);
  }
});

test('staff cannot confirm rounded transfers with a stale half balance or arbitrary excess payment', async () => {
  for (const [amountSubmitted, remainingAmount] of [[126, 125], [126.01, 124], [127, 123.01]]) {
    const db = new Database({ 'orders/ORD-test': { ...order, total: 250.01, payment: { ...payment, amountSubmitted, remainingAmount, receipt: { ...receipt, detectedAmount: amountSubmitted } } } });
    assert.equal((await paymentRoute(db).POST(request('verify_transfer'), context)).status, 409);
    assert.equal(db.data.get('orders/ORD-test').payment.status, 'pending_review');
  }
});

test('inconsistent transfer amounts and malformed payment actions cannot update an order', async () => {
  const db = new Database({ 'orders/ORD-test': { ...order, payment: { ...payment, amountSubmitted: 1 } } });
  const route = paymentRoute(db);
  assert.equal((await route.POST(request('verify_transfer'), context)).status, 409);
  assert.equal((await route.POST(request('mark_paid'), context)).status, 400);
  assert.equal(db.data.get('orders/ORD-test').payment.status, 'pending_review');
});

test('a failed payment-status commit is reported as unconfirmed and preserves the original review', async () => {
  const db = new Database({ 'orders/ORD-test': order }); db.failCommit = true;
  assert.equal((await paymentRoute(db).POST(request('verify_transfer'), context)).status, 503);
  assert.equal(db.data.get('orders/ORD-test').payment.status, 'pending_review');
  assert.equal(db.data.get('orders/ORD-test').paymentStatus, 'unpaid');
});

test('staff receipt reads return private bytes without exposing public download URLs', async () => {
  let openedPath = '';
  const route = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: async () => ({ uid: 'staff' }), adminDatabase: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => order }) }) }) }), adminStorage: () => ({ file: path => { openedPath = path; return { getMetadata: async () => [{ contentType: 'image/jpeg', size: 3 }], download: async () => [Buffer.from([1, 2, 3])] }; } }) } })('src/app/api/admin/payment-receipt/[id]/route.ts');
  const result = await route.GET(new Request('https://example.com'), context);
  assert.equal(result.status, 200); assert.equal(openedPath, receipt.path);
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [1, 2, 3]);
});

test('receipt reads reject paths outside the exact private receipt directory', async () => {
  let storageOpened = false;
  const route = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: async () => ({ uid: 'staff' }), adminDatabase: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ ...order, payment: { ...payment, receipt: { ...receipt, path: 'payment-receipts/../secret.jpg' } } }) }) }) }) }), adminStorage: () => { storageOpened = true; } } })('src/app/api/admin/payment-receipt/[id]/route.ts');
  assert.equal((await route.GET(new Request('https://example.com'), context)).status, 404);
  assert.equal(storageOpened, false);
});

test('an invalid or oversized receipt object is rejected before its bytes are downloaded', async () => {
  let downloaded = false;
  const route = loader({ ...responseMocks, '@/lib/firebase-admin': { requireAdmin: async () => ({ uid: 'staff' }), adminDatabase: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => order }) }) }) }), adminStorage: () => ({ file: () => ({ getMetadata: async () => [{ contentType: 'image/svg+xml', size: 8 * 1024 * 1024 }], download: async () => { downloaded = true; return []; } }) }) } })('src/app/api/admin/payment-receipt/[id]/route.ts');
  assert.equal((await route.GET(new Request('https://example.com'), context)).status, 422);
  assert.equal(downloaded, false);
});

test('email and CSV distinguish amount matching from funds confirmation and keep receipt paths private', () => {
  const load = loader();
  const mail = load('src/lib/order-email.ts').renderOrderEmail(order);
  for (const value of ['50% deposit via Instapay', 'EGP 285.00', 'Transfer awaiting staff review', 'Screenshot amount matched', 'bank transfer still needs staff confirmation', 'Cash on delivery', '/admin/dashboard?orderId=ORD-test']) assert.ok(mail.text.includes(value), value);
  assert.ok(!mail.text.includes(receipt.path)); assert.ok(!mail.html.includes(receipt.path));
  const { ordersCsv, normalizeAdminOrder } = load('src/lib/admin-orders.ts');
  const normalized = normalizeAdminOrder(order.id, order);
  assert.equal(normalized.payment.receipt.detectedAmount, 285);
  const csv = ordersCsv([normalized]);
  assert.ok(csv.includes('Submitted transfer')); assert.ok(csv.includes('Screenshot amount')); assert.ok(csv.includes('Transfer awaiting staff review')); assert.ok(!csv.includes(receipt.path));
  const malformed = normalizeAdminOrder(order.id, { ...order, payment: { receipt: null } });
  assert.equal(malformed.payment, undefined); assert.ok(malformed.dataIssues.includes('Payment details incomplete'));
});
