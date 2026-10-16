const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { loader } = require('./helpers/load-ts.cjs');

function harness(env = { PAYMENT_PROOF_SECRET: 'test-receipt-signing-key-only' }) {
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  const load = loader({}, { process: { env }, Date: Clock });
  return { ...load('src/lib/payment-proof.ts'), advance: milliseconds => { now += milliseconds; } };
}
function receipt(overrides = {}) {
  const id = randomUUID();
  return { id, path: `payment-receipts/${id}.jpg`, sha256: createHash('sha256').update(id).digest('hex'), detectedAmount: 125.01, confidence: 95, uploadedAt: new Date().toISOString(), ...overrides };
}

test('a signed receipt retains only its authenticated metadata and binds the expected amount', () => {
  const { signPaymentProof, verifyPaymentProof } = harness();
  const metadata = receipt(), token = signPaymentProof(metadata);
  assert.equal(JSON.stringify(verifyPaymentProof(token, 125.01)), JSON.stringify(metadata));
  assert.throws(() => verifyPaymentProof(token, 125), /matching the selected payment amount/);
  assert.throws(() => verifyPaymentProof(token, 250.02), /matching the selected payment amount/);
});

test('changing the amount, screenshot path, hash or expiry invalidates the signature', () => {
  const { signPaymentProof, verifyPaymentProof } = harness();
  const token = signPaymentProof(receipt());
  const [payload, signature] = token.split('.');
  const original = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  for (const mutate of [data => { data.receipt.detectedAmount = 250; }, data => { data.receipt.path = 'images/stolen.jpg'; }, data => { data.receipt.sha256 = 'a'.repeat(64); }, data => { data.expires += 1000; }]) {
    const data = structuredClone(original); mutate(data);
    const forged = Buffer.from(JSON.stringify(data)).toString('base64url') + '.' + signature;
    assert.throws(() => verifyPaymentProof(forged, data.receipt.detectedAmount), /Upload and scan/);
  }
});

test('receipt scans expire after one hour and future-dated proofs cannot extend that window', () => {
  const clock = harness(), token = clock.signPaymentProof(receipt());
  clock.advance(59 * 60 * 1000);
  assert.equal(clock.verifyPaymentProof(token, 125.01).detectedAmount, 125.01);
  clock.advance(60001);
  assert.throws(() => clock.verifyPaymentProof(token, 125.01), /expired/);
  const future = harness(), futureToken = future.signPaymentProof(receipt());
  future.advance(-60000);
  assert.throws(() => future.verifyPaymentProof(futureToken, 125.01), /Upload and scan/);
});

test('proofs signed by another deployment key and malformed payloads fail closed', () => {
  const first = harness(), second = harness({ PAYMENT_PROOF_SECRET: 'another-key' });
  const token = first.signPaymentProof(receipt());
  assert.throws(() => second.verifyPaymentProof(token, 125.01), /Upload and scan/);
  for (const broken of ['', 'a.b.c', '.', 'a'.repeat(6001), 'bad.bad']) assert.throws(() => first.verifyPaymentProof(broken, 125.01), /Upload and scan/);
});

test('even server-signed receipts need a private image path, valid hash, finite amount and usable OCR confidence', () => {
  const { signPaymentProof, verifyPaymentProof } = harness();
  for (const override of [{ path: 'images/public.jpg' }, { sha256: 'wrong' }, { detectedAmount: 0 }, { detectedAmount: null }, { confidence: 44.9 }, { confidence: 101 }, { uploadedAt: 'not a date' }]) {
    assert.throws(() => verifyPaymentProof(signPaymentProof(receipt(override)), 125.01), /Upload and scan/);
  }
  const token = signPaymentProof(receipt());
  assert.throws(() => verifyPaymentProof(token, Number.NaN), /Upload and scan/);
});

test('missing receipt signing configuration returns an explicit temporary-unavailability error', () => {
  const { signPaymentProof } = harness({});
  assert.throws(() => signPaymentProof(receipt()), error => error.status === 503 && /temporarily unavailable/.test(error.message));
});
