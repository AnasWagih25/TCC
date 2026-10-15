const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const { Database } = require('./helpers/firestore.cjs');
const order = { id: 'ORD-test', date: '2026-10-16T10:30:00Z', source: 'web', deliveryMethod: 'pickup', customer: { name: '<img src=x onerror=alert(1)>', phone: '01000000000', email: 'test@example.com', address: '2GHX+38V, Second New Cairo', notes: 'Call <before> arrival & ring', location: { lat: 30.0277375, lng: 31.5482969 } }, pickupSnapshot: { hoursNotice: 'Next day, 12–8 PM' }, items: [{ name: 'Cookie box', quantity: 2, price: 300, boxSize: 6, boxFlavors: [{ name: 'Kinder', quantity: 6 }], selectedCustomizations: [{ name: 'Message', price: 20, text: '<Happy & sweet>' }] }], total: 570, deliveryFee: 0, discount: 30, promoCode: 'QUIRK', paymentMethod: 'instapay', paymentStatus: 'unpaid', status: 'pending' };
test('email contains all saved selection, contact, financial and fulfillment details with escaped customer text', () => {
  const { renderOrderEmail } = loader()('src/lib/order-email.ts'); const mail = renderOrderEmail(order);
  for (const value of ['01000000000', 'test@example.com', '2GHX+38V', 'Box of 6', 'Kinder', 'Message', 'EGP 600.00', 'EGP 570.00', 'EGP 0.00', 'EGP 30.00', 'Instapay', 'unpaid', '30.0277375,31.5482969', 'Next day']) assert.ok(mail.text.includes(value), value);
  assert.ok(mail.html.includes('&lt;Happy &amp; sweet&gt;')); assert.ok(!mail.html.includes('<img src=x')); assert.ok(!mail.html.includes('EGP 70.00')); assert.ok(!mail.html.includes('NaN'));
});
test('failed SMTP keeps the order and queues a retry with visible failure details', async () => {
  const load = loader({ nodemailer: { createTransport: () => ({ sendMail: async () => { throw new Error('SMTP offline'); } }) } }, { process: { env: { EMAIL_USER: 'mailer@example.com', EMAIL_PASS: 'test-only' } } });
  const db = new Database({ 'orders/ORD-test': order, 'orderEmailJobs/ORD-test': { state: 'pending', attempts: 0 } });
  const result = await load('src/lib/order-notifications.ts').sendOrderNotification(db, 'ORD-test');
  assert.equal(result.status, 'failed'); assert.equal(db.data.get('orders/ORD-test').total, 570); assert.equal(db.data.get('orders/ORD-test').email.lastError, 'SMTP offline'); assert.ok(db.data.get('orderEmailJobs/ORD-test').nextAttemptAt > Date.now());
});
test('SMTP acceptance is tracked, repeated workers do not resend a sent job', async () => {
  let sent = 0; const load = loader({ nodemailer: { createTransport: () => ({ sendMail: async message => { sent++; assert.equal(message.to, 'magdyhala906@gmail.com'); return { accepted: [message.to], rejected: [], messageId: 'message-test' }; } }) } }, { process: { env: { EMAIL_USER: 'mailer@example.com', EMAIL_PASS: 'test-only' } } });
  const db = new Database({ 'orders/ORD-test': order, 'orderEmailJobs/ORD-test': { state: 'pending', attempts: 0 } }); const notify = load('src/lib/order-notifications.ts').sendOrderNotification;
  await Promise.all([notify(db, 'ORD-test'), notify(db, 'ORD-test')]); assert.equal(sent, 1); assert.equal(db.data.get('orders/ORD-test').email.status, 'sent');
  await notify(db, 'ORD-test'); assert.equal(sent, 1);
});

test('scheduled retries recover expired jobs and leave future attempts untouched', async () => {
  let sent = 0;
  const load = loader({ nodemailer: { createTransport: () => ({ sendMail: async () => { sent++; return { accepted: ['bakery@example.com'], rejected: [], messageId: 'retried' }; } }) } }, { process: { env: { EMAIL_USER: 'mailer@example.com', EMAIL_PASS: 'test-only' } } });
  const db = new Database({ 'orders/ORD-test': order, 'orderEmailJobs/ORD-test': { state: 'sending', attempts: 1, leaseUntil: Date.now() - 1, nextAttemptAt: Date.now() - 1 }, 'orders/ORD-future': { ...order, id: 'ORD-future' }, 'orderEmailJobs/ORD-future': { state: 'failed', attempts: 1, nextAttemptAt: Date.now() + 60000, leaseUntil: 0 } });
  await load('src/lib/order-notifications.ts').retryOrderNotifications(db);
  assert.equal(sent, 1); assert.equal(db.data.get('orders/ORD-test').email.status, 'sent'); assert.equal(db.data.get('orderEmailJobs/ORD-future').state, 'failed');
});

test('SMTP acceptance with an ambiguous status write is flagged for review rather than automatically resent', async () => {
  const load = loader({ nodemailer: { createTransport: () => ({ sendMail: async () => ({ accepted: ['bakery@example.com'], rejected: [], messageId: 'accepted' }) }) } }, { process: { env: { EMAIL_USER: 'mailer@example.com', EMAIL_PASS: 'test-only' } } });
  const db = new Database({ 'orders/ORD-test': order, 'orderEmailJobs/ORD-test': { state: 'pending', attempts: 0, nextAttemptAt: 0 } });
  const transaction = db.runTransaction.bind(db); let calls = 0;
  db.runTransaction = operation => ++calls === 2 ? Promise.reject(new Error('Connection lost recording status')) : transaction(operation);
  await load('src/lib/order-notifications.ts').sendOrderNotification(db, 'ORD-test');
  assert.equal(db.data.get('orderEmailJobs/ORD-test').needsReview, true); assert.ok(db.data.get('orders/ORD-test').email.lastError.includes('accepted'));
});
