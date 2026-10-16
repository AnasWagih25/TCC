const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');

function harness({ amount = 125, confidence = 95, configured = true, rateCount = 0, width = 400, format = 'jpeg', pages = 1, saveFails = false } = {}) {
  const calls = { scans: 0, saves: [], signatures: [], limitWrites: 0 };
  const sharp = () => ({
    rotate() { return this; }, resize() { return this; }, flatten() { return this; }, jpeg() { return this; }, grayscale() { return this; }, normalize() { return this; }, png() { return this; },
    metadata: async () => ({ width, height: 800, format, pages }),
    toBuffer: async () => Buffer.from('normalized-private-receipt-image'),
  });
  const load = loader({
    sharp,
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/firebase-admin': {
      serverFirebaseConfigured: () => configured,
      adminDatabase: () => ({ collection: () => ({ doc: id => ({ id }) }), runTransaction: async callback => callback({ get: async () => ({ data: () => ({ count: rateCount }) }), set: () => { rateCount++; calls.limitWrites++; } }) }),
      adminStorage: () => ({ file: path => ({ save: async (buffer, options) => { calls.saves.push({ path, buffer, options }); if (saveFails) throw new Error('Storage offline'); } }) }),
    },
    '@/lib/payment-ocr': { scanPaymentReceipt: async () => { calls.scans++; return { text: `Transfer successful\nAmount ${amount.toFixed(2)} EGP`, confidence }; } },
    '@/lib/payment-proof': { signPaymentProof: receipt => { calls.signatures.push(receipt); return 'signed-receipt-token'; } },
  }, { File, console: { error() {} } });
  return { POST: load('src/app/api/payment-proof/route.ts').POST, calls };
}
function request({ total = 250, origin = 'https://www.thecookieconcept.live', mime = 'image/png', length, url = 'https://www.thecookieconcept.live/api/payment-proof', host } = {}) {
  const body = new FormData();
  body.set('total', String(total));
  body.set('file', new File([Buffer.alloc(500)], 'deposit.png', { type: mime }));
  return new Request(url, { method: 'POST', headers: { origin, ...(host ? { host } : {}), ...(length ? { 'content-length': String(length) } : {}) }, body });
}

test('matched deposits upload confidential metadata and receive a signed proof with the detected plan', async () => {
  const { POST, calls } = harness({ amount: 125.01 });
  const result = await POST(request({ total: 250.01 })), data = await result.json();
  assert.equal(result.status, 200); assert.equal(data.plan, 'deposit'); assert.equal(data.proofToken, 'signed-receipt-token');
  assert.equal(data.receipt.detectedAmount, 125.01); assert.match(data.receipt.sha256, /^[a-f0-9]{64}$/);
  assert.match(calls.saves[0].path, /^payment-receipts\/[a-f0-9-]{36}\.jpg$/);
  assert.equal(calls.saves[0].options.metadata.cacheControl, 'private, no-store');
  assert.equal(calls.saves[0].options.contentType, 'image/jpeg');
  assert.equal(data.receipt.url, undefined); assert.equal(data.receipt.text, undefined);
  assert.equal(calls.signatures.length, 1); assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('full InstaPay screenshots are identified as full payment', async () => {
  const { POST } = harness({ amount: 250.01 });
  const result = await POST(request({ total: 250.01 }));
  assert.equal(result.status, 200); assert.equal((await result.json()).plan, 'full');
});

test('rounded-up screenshots select the correct plan while amounts between accepted values fail', async () => {
  for (const [amount, plan] of [[126, 'deposit'], [251, 'full']]) {
    const { POST } = harness({ amount }), result = await POST(request({ total: 250.01 }));
    const data = await result.json();
    assert.equal(result.status, 200); assert.equal(data.plan, plan); assert.equal(data.receipt.detectedAmount, amount);
  }
  for (const amount of [125, 125.5, 126.01, 252]) {
    const { POST, calls } = harness({ amount }), result = await POST(request({ total: 250.01 }));
    assert.equal(result.status, 422); assert.equal(calls.saves.length, 0); assert.equal(calls.signatures.length, 0);
  }
  const tiny = harness({ amount: 1 }), result = await tiny.POST(request({ total: 0.99 }));
  assert.equal(result.status, 200); assert.equal((await result.json()).plan, 'full');
});

test('receipt scans accept EGP 5 and 10 rounding and report full coverage as full payment', async () => {
  for (const [amount, plan] of [[192.5, 'deposit'], [193, 'deposit'], [195, 'deposit'], [200, 'deposit'], [385, 'full'], [390, 'full']]) {
    const { POST } = harness({ amount }), result = await POST(request({ total: 385 }));
    const data = await result.json();
    assert.equal(result.status, 200); assert.equal(data.plan, plan); assert.equal(data.receipt.detectedAmount, amount);
  }
  for (const amount of [192.49, 194, 196, 201, 400]) {
    const { POST, calls } = harness({ amount }), result = await POST(request({ total: 385 }));
    const data = await result.json();
    assert.equal(result.status, 422); assert.equal(calls.saves.length, 0); assert.equal(calls.signatures.length, 0);
    assert.doesNotMatch(data.error, /rounded|rounding|whole pound/i);
  }
});

test('wrong amounts and unclear OCR never create a saved receipt or signed proof', async () => {
  for (const options of [{ amount: 500 }, { confidence: 44 }]) {
    const { POST, calls } = harness(options), result = await POST(request());
    assert.equal(result.status, 422); assert.equal(calls.saves.length, 0); assert.equal(calls.signatures.length, 0);
  }
});

test('rate limits reject additional scans before OCR and upload', async () => {
  const { POST, calls } = harness({ rateCount: 8 }), result = await POST(request());
  assert.equal(result.status, 429); assert.equal(calls.scans, 0); assert.equal(calls.saves.length, 0); assert.equal(calls.limitWrites, 0);
});

test('unconfigured services, foreign origins, oversized uploads and unsupported images fail before OCR', async () => {
  const cases = [{ options: { configured: false }, input: {}, status: 503 }, { options: {}, input: { origin: 'https://unrelated.example' }, status: 403 }, { options: {}, input: { length: 5 * 1024 * 1024 }, status: 413 }, { options: {}, input: { mime: 'image/gif' }, status: 400 }, { options: {}, input: { total: 0 }, status: 400 }];
  for (const example of cases) {
    const { POST, calls } = harness(example.options), result = await POST(request(example.input));
    assert.equal(result.status, example.status); assert.equal(calls.scans, 0); assert.equal(calls.saves.length, 0);
  }
});

test('small unreadable images and failed private uploads cannot receive a payment proof', async () => {
  const small = harness({ width: 150 }), smallResult = await small.POST(request());
  assert.equal(smallResult.status, 400); assert.equal(small.calls.scans, 0); assert.equal(small.calls.signatures.length, 0);
  const failure = harness({ saveFails: true }), failedResult = await failure.POST(request());
  assert.equal(failedResult.status, 503); assert.equal(failure.calls.signatures.length, 0);
});

test('decoded screenshot formats are checked independently of a claimed PNG MIME type', async () => {
  for (const format of ['svg', 'gif', 'pdf', 'tiff', 'unknown']) {
    const { POST, calls } = harness({ format }), result = await POST(request({ mime: 'image/png' }));
    assert.equal(result.status, 400, format); assert.equal(calls.scans, 0); assert.equal(calls.saves.length, 0); assert.equal(calls.signatures.length, 0);
  }
  for (const format of ['jpeg', 'png', 'webp']) {
    const { POST } = harness({ format }), result = await POST(request());
    assert.equal(result.status, 200, format);
  }
});

test('animated and multipage screenshots fail before OCR, storage or signing', async () => {
  for (const format of ['webp', 'png']) {
    const { POST, calls } = harness({ format, pages: 2 }), result = await POST(request());
    assert.equal(result.status, 400, format); assert.equal(calls.scans, 0); assert.equal(calls.saves.length, 0); assert.equal(calls.signatures.length, 0);
  }
});

test('same-origin uploads use the incoming browser Host when Next rewrites its internal request URL', async () => {
  const { POST, calls } = harness();
  const result = await POST(request({ origin: 'http://127.0.0.1:3100', host: '127.0.0.1:3100', url: 'http://localhost:3100/api/payment-proof' }));
  assert.equal(result.status, 200); assert.equal(calls.scans, 1); assert.equal(calls.saves.length, 1);
});

test('foreign hosts, malformed origins and non-HTTP origins fail before receipt scanning', async () => {
  for (const origin of ['https://unrelated.example', 'http://127.0.0.1:3101', 'not a valid origin', 'null', 'ftp://127.0.0.1:3100']) {
    const { POST, calls } = harness();
    const result = await POST(request({ origin, host: '127.0.0.1:3100', url: 'http://localhost:3100/api/payment-proof' }));
    assert.equal(result.status, 403, origin); assert.equal(calls.scans, 0); assert.equal(calls.saves.length, 0); assert.equal(calls.limitWrites, 0);
  }
});
