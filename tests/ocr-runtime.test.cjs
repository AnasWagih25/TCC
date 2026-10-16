const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loader } = require('./helpers/load-ts.cjs');

test('the explicitly traced serverless worker files can run real English and Arabic receipt OCR in isolation', { timeout: 30000 }, () => {
  const root = path.resolve(__dirname, '..');
  const config = loader()(path.join(root, 'next.config.ts')).default;
  const patterns = config.outputFileTracingIncludes['/api/payment-proof'];
  assert.ok(Array.isArray(patterns) && patterns.length, 'Receipt worker tracing must remain configured.');
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'tcc-traced-ocr-test-'));
  try {
    const copied = new Set();
    for (const pattern of patterns) {
      for (const relative of fs.globSync(pattern, { cwd: root })) {
        if (copied.has(relative) || !fs.statSync(path.join(root, relative)).isFile()) continue;
        const destination = path.join(isolated, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(root, relative), destination);
        copied.add(relative);
      }
    }
    const worker = path.join(isolated, 'node_modules/tesseract.js/src/worker-script/node/index.js');
    const source = path.join(root, 'outputs/payments/synthetic-deposit.png');
    assert.ok(fs.existsSync(source), 'The synthetic transfer screenshot fixture is required.');
    assert.ok(fs.existsSync(worker), 'The dynamically loaded Node OCR worker must be traced.');
    const languages = path.join(isolated, 'languages');
    fs.mkdirSync(languages);
    for (const language of ['eng', 'ara']) fs.copyFileSync(path.join(isolated, `node_modules/@tesseract.js-data/${language}/4.0.0/${language}.traineddata.gz`), path.join(languages, `${language}.traineddata.gz`));
    const script = path.join(isolated, 'run-isolated-ocr.cjs');
    fs.writeFileSync(script, `
const { createWorker } = require(${JSON.stringify(require.resolve('tesseract.js'))});
(async () => {
  let worker;
  try {
    worker = await createWorker(['eng', 'ara'], 1, {
      workerPath: ${JSON.stringify(worker)},
      langPath: ${JSON.stringify(languages)},
      cacheMethod: 'none',
      errorHandler: error => { throw error; },
    });
    const result = await worker.recognize(${JSON.stringify(source)});
    process.stdout.write(JSON.stringify({ text: result.data.text, confidence: result.data.confidence }));
  } finally {
    if (worker) await worker.terminate();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
`);
    const output = execFileSync(process.execPath, [script], { cwd: isolated, env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' }, timeout: 20000, maxBuffer: 1024 * 1024, encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.ok(result.confidence >= 45, `The traced worker must read the fixture reliably; confidence was ${result.confidence}.`);
    assert.match(result.text, /32[.,]50/);
    assert.match(result.text, /EGP/i);
  } finally {
    fs.rmSync(isolated, { recursive: true, force: true });
  }
});
