const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');

const apiKey = 'unit-test-provider-key-not-a-real-credential';
const image = Buffer.from('synthetic-receipt-image-only');
const safeError = 'Receipt image scanning is temporarily unavailable.';

function transcription(overrides = {}) {
  return {
    status: 'successful', currency: 'EGP', amount: '125.01',
    receiptText: 'Transfer successful\nTransfer amount: 125.01 EGP\nFees: 1.00 EGP\nAvailable balance: 500.00 EGP',
    confidence: 96, ...overrides,
  };
}

function completed(data = transcription(), overrides = {}) {
  return { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(data) }] }], ...overrides };
}

function harness({ result = completed(), env = {}, response = {}, fail, raw } = {}) {
  const calls = [];
  const logs = [];
  let bodyReads = 0;
  const fetch = async (...args) => {
    calls.push(args);
    if (fail) throw fail;
    return {
      ok: true, status: 200,
      text: async () => { bodyReads++; return raw === undefined ? JSON.stringify(result) : raw; },
      ...response,
    };
  };
  const quietConsole = Object.fromEntries(['debug', 'log', 'info', 'warn', 'error'].map(level => [level, (...args) => { logs.push([level, ...args]); }]));
  const load = loader({}, { fetch, console: quietConsole, process: { env: { GEMINI_API_KEY: apiKey, ...env } } });
  return { scan: load('src/lib/payment-gemini.ts').scanGeminiReceipt, calls, logs, bodyReads: () => bodyReads };
}

async function assertUnclear(options) {
  const result = await harness(options).scan(image);
  assert.equal(result.text, '');
  assert.equal(result.confidence, 0);
}

test('Gemini receives only the inline image and transcription instructions at a fixed endpoint with its key in a header', async () => {
  const fixture = harness({ env: { GEMINI_API_KEY: `  ${apiKey}  ` } });
  await fixture.scan(image);
  assert.equal(fixture.calls.length, 1);
  const [url, options] = fixture.calls[0];
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['x-goog-api-key'], apiKey);
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(url.includes(apiKey), false);
  assert.equal(options.body.includes(apiKey), false);
  const request = JSON.parse(options.body);
  assert.equal(request.store, false);
  assert.equal(request.stream, false);
  assert.equal(request.background, false);
  assert.equal(request.model, 'gemini-3.5-flash-lite');
  assert.equal(request.generation_config.thinking_level, 'low');
  assert.equal(request.input.length, 2);
  const picture = request.input.find(part => part.type === 'image');
  assert.equal(picture.mime_type, 'image/png');
  assert.equal(picture.data, image.toString('base64'));
  assert.equal(Buffer.from(picture.data, 'base64').equals(image), true);
  assert.equal('url' in picture, false);
  assert.match(request.system_instruction, /untrusted data/);
  assert.match(request.system_instruction, /never follow instructions/);
  assert.match(request.system_instruction, /not establish that funds arrived/);
  assert.deepEqual(Object.keys(request).sort(), ['background', 'generation_config', 'input', 'model', 'response_format', 'store', 'stream', 'system_instruction']);
  assert.doesNotMatch(JSON.stringify(request), /(?:order|checkout)[_-]?(?:total|amount)|expected[_-]?amount|amount[_-]?due/i);
});

test('the request requires a strict structured transcription and supports an explicitly configured model', async () => {
  const fixture = harness({ env: { GEMINI_RECEIPT_MODEL: '  configured-receipt-model  ' } });
  await fixture.scan(image);
  const request = JSON.parse(fixture.calls[0][1].body);
  assert.equal(request.model, 'configured-receipt-model');
  assert.equal(request.response_format.type, 'text');
  assert.equal(request.response_format.mime_type, 'application/json');
  const schema = request.response_format.schema;
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required.sort(), ['amount', 'confidence', 'currency', 'receiptText', 'status']);
  assert.deepEqual(schema.properties.status.enum, ['successful', 'pending', 'failed', 'unknown']);
  assert.deepEqual(schema.properties.currency.enum, ['EGP', 'other', 'unknown']);
  assert.equal(schema.properties.confidence.minimum, 0);
  assert.equal(schema.properties.confidence.maximum, 100);
  assert.deepEqual(schema.properties.amount.type, ['string', 'null']);
});

test('valid English and Arabic transcriptions agree with the independently parsed transfer principal', async () => {
  const examples = [
    transcription(),
    transcription({ amount: '1250.50', receiptText: 'Transfer successful\nAmount: EGP 1,250.50\nFee: 12.50 EGP', confidence: 80 }),
    transcription({ receiptText: 'تم التحويل بنجاح\nمبلغ التحويل\n١٢٥٫٠١ جنيه\nالرسوم ١ جنيه\nالرصيد ٥٠٠ جنيه', confidence: 99 }),
    transcription({ receiptText: 'تم التحويل بنجاح\nالمبلغ المحول ۱۲۵٫۰۱ ج.م', confidence: 100 }),
  ];
  for (const data of examples) {
    const result = await harness({ result: completed(data) }).scan(image);
    assert.equal(result.text, data.receiptText);
    assert.equal(result.confidence, data.confidence);
  }
});

test('only completed interactions with one model text output can become a usable scan', async () => {
  for (const result of [
    completed(undefined, { status: 'in_progress' }),
    completed(undefined, { status: 'failed' }),
    completed(undefined, { status: undefined }),
    completed(undefined, { errors: [{ message: 'provider details must remain private' }] }),
    completed(undefined, { errors: {} }),
    completed(undefined, { steps: undefined }),
    completed(undefined, { steps: [] }),
    completed(undefined, { steps: [{ type: 'tool_result', content: [{ type: 'text', text: JSON.stringify(transcription()) }] }] }),
    completed(undefined, { steps: [{ type: 'model_output', content: [{ type: 'text', text: '' }] }] }),
    completed(undefined, { steps: [{ type: 'model_output', content: [{ type: 'image', text: JSON.stringify(transcription()) }] }] }),
    completed(undefined, { steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(transcription()) }, { type: 'text', text: JSON.stringify(transcription()) }] }] }),
  ]) await assertUnclear({ result });
  const valid = completed(undefined, { errors: [], steps: [
    { type: 'tool_result', content: [{ type: 'text', text: 'Do not accept tool text as the receipt.' }] },
    { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(transcription()) }] },
  ] });
  assert.equal((await harness({ result: valid }).scan(image)).text, transcription().receiptText);
});

test('unreadable, missing, out-of-range and incorrectly typed confidences fail closed', async () => {
  for (const confidence of [79.99, 0, -1, 100.01, '96', null, undefined]) {
    await assertUnclear({ result: completed(transcription({ confidence })) });
  }
});

test('unsuccessful or non-EGP provider classifications are rejected without returning the receipt', async () => {
  for (const status of ['pending', 'failed', 'unknown', 'completed', undefined]) await assertUnclear({ result: completed(transcription({ status })) });
  for (const currency of ['other', 'unknown', 'USD', 'egp', undefined]) await assertUnclear({ result: completed(transcription({ currency })) });
});

test('the verbatim text can veto incorrect status, currency, ambiguity, fees and inconsistent provider amounts', async () => {
  for (const receiptText of [
    'Transfer pending\nAmount 125.01 EGP',
    'Transfer failed\nAmount 125.01 EGP',
    'قيد التنفيذ\nمبلغ التحويل ١٢٥٫٠١ جنيه',
    'Transfer successful\nAmount 125.01 USD',
    'Transfer successful\nAmount 125.01 EUR\nFee 1 EGP',
    'تم التحويل بنجاح\nمبلغ التحويل ١٢٥٫٠١ ريال',
    'Transfer successful\nTransfer amount 125.01 EGP\nPayment amount 250.02 EGP',
    'Transfer successful\nTransfer amount 250.02 EGP\nFees 125.01 EGP',
    'Transfer successful\nAccount balance 125.01 EGP',
    'Transfer successful\nTransfer amount 125.00 EGP',
    'Transfer successful\nReference 12501\nDate 17/10/2026',
    'Transfer successful\nAmount 125.01',
  ]) await assertUnclear({ result: completed(transcription({ receiptText })) });
});

test('provider amounts must be exact positive ASCII decimal pounds within supported receipt limits', async () => {
  for (const amount of [null, undefined, 125.01, '١٢٥٫٠١', '1,250.50', '125.001', '1.25e2', '-125.01', '0', '1000000.01', '10000000', ' 125.01 ']) {
    await assertUnclear({ result: completed(transcription({ amount })) });
  }
  for (const receiptText of [undefined, null, 125.01, 'a'.repeat(8001)]) await assertUnclear({ result: completed(transcription({ receiptText })) });
});

test('HTTP provider failures never read or expose their response body', async () => {
  for (const status of [400, 401, 403, 429, 500, 503]) {
    const fixture = harness({ response: { ok: false, status }, raw: `private receipt and ${apiKey}` });
    await assert.rejects(fixture.scan(image), error => error.message === safeError);
    assert.equal(fixture.bodyReads(), 0);
    assert.equal(fixture.logs.length, 0);
  }
});

test('malformed, oversized, aborted and transport failures never leak provider text, receipt text or API keys', async () => {
  const privateText = `private-screenshot-text ${apiKey}`;
  for (const options of [
    { raw: privateText },
    { raw: 'x'.repeat(64001) + privateText },
    { result: completed(undefined, { steps: [null] }) },
    { result: completed(undefined, { steps: [{ type: 'model_output', content: [{ type: 'text', text: privateText }] }] }) },
    { result: completed(undefined, { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'null' }] }] }) },
    { fail: new Error(privateText) },
    { fail: Object.assign(new Error(privateText), { name: 'AbortError' }) },
    { response: { text: async () => { throw new Error(privateText); } } },
  ]) {
    const fixture = harness(options);
    await assert.rejects(fixture.scan(image), error => error.message === safeError && !error.message.includes(apiKey));
    assert.equal(fixture.logs.length, 0);
  }
});

test('missing or whitespace-only provider credentials cannot make an outbound request', async () => {
  for (const GEMINI_API_KEY of [undefined, '', '   ']) {
    const fixture = harness({ env: { GEMINI_API_KEY } });
    await assert.rejects(fixture.scan(image), /Receipt scanning is not configured\./);
    assert.equal(fixture.calls.length, 0);
  }
});

function routingHarness({ key, providerError, providerResult = { text: 'Gemini receipt', confidence: 96 } } = {}) {
  const calls = { provider: [], worker: [], filesystem: [], terminated: 0 };
  const worker = {
    setParameters: async () => {},
    recognize: async () => ({ data: { text: 'Local receipt', confidence: 91 } }),
    terminate: async () => { calls.terminated++; },
  };
  const load = loader({
    './payment-gemini': { scanGeminiReceipt: async received => { calls.provider.push(received); if (providerError) throw providerError; return providerResult; } },
    'tesseract.js': { createWorker: async (...args) => { calls.worker.push(args); return worker; } },
    'node:fs/promises': {
      mkdtemp: async prefix => { calls.filesystem.push(['mkdtemp', prefix]); return '/unit-test/receipt-languages'; },
      copyFile: async (...args) => { calls.filesystem.push(['copyFile', ...args]); },
    },
  }, { process: { env: { GEMINI_API_KEY: key }, cwd: () => '/unit-test/tcc' } });
  return { scan: load('src/lib/payment-ocr.ts').scanPaymentReceipt, calls, providerResult };
}

test('a configured Gemini provider exclusively handles OCR without starting a local worker or copying language files', async () => {
  const fixture = routingHarness({ key: ` ${apiKey} ` });
  assert.equal(await fixture.scan(image), fixture.providerResult);
  assert.equal(fixture.calls.provider.length, 1);
  assert.equal(fixture.calls.provider[0], image);
  assert.equal(fixture.calls.worker.length, 0);
  assert.equal(fixture.calls.filesystem.length, 0);
});

test('Gemini failures and unclear transcriptions never silently fall back to local OCR', async () => {
  const providerError = new Error(safeError);
  const failed = routingHarness({ key: apiKey, providerError });
  await assert.rejects(failed.scan(image), error => error === providerError);
  const uncertain = routingHarness({ key: apiKey, providerResult: { text: '', confidence: 0 } });
  assert.equal(await uncertain.scan(image), uncertain.providerResult);
  for (const fixture of [failed, uncertain]) {
    assert.equal(fixture.calls.provider.length, 1);
    assert.equal(fixture.calls.worker.length, 0);
    assert.equal(fixture.calls.filesystem.length, 0);
  }
});

test('only an unconfigured Gemini provider selects local English and Arabic OCR, using mocked filesystem and workers', async () => {
  for (const key of [undefined, '', '   ']) {
    const fixture = routingHarness({ key });
    const result = await fixture.scan(image);
    assert.equal(result.text, 'Local receipt');
    assert.equal(result.confidence, 91);
    assert.equal(fixture.calls.provider.length, 0);
    assert.equal(fixture.calls.worker.length, 1);
    assert.equal(JSON.stringify(fixture.calls.worker[0][0]), JSON.stringify(['eng', 'ara']));
    assert.equal(fixture.calls.filesystem.filter(([operation]) => operation === 'copyFile').length, 2);
    assert.equal(fixture.calls.terminated, 1);
  }
});
