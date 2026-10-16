import { copyFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createWorker, type Worker } from 'tesseract.js';
import { scanGeminiReceipt } from './payment-gemini';

// These runtime assets are explicitly included in the function trace in next.config.ts.
const modulesPath = path.join(process.cwd(), 'node_modules');
let languageReady: Promise<string> | undefined;

function localLanguages() {
  languageReady ||= (async () => {
    const languagePath = await mkdtemp(path.join(os.tmpdir(), 'tcc-receipt-ocr-'));
    await Promise.all(['eng', 'ara'].map(language => copyFile(
      path.join(modulesPath, '@tesseract.js-data', language, '4.0.0', `${language}.traineddata.gz`),
      path.join(languagePath, `${language}.traineddata.gz`),
    )));
    return languagePath;
  })().catch(error => { languageReady = undefined; throw error; });
  return languageReady;
}

export async function scanPaymentReceipt(image: Buffer) {
  if (process.env.GEMINI_API_KEY?.trim()) return scanGeminiReceipt(image);
  const languagePath = await localLanguages();
  let worker: Worker | undefined;
  let finished = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const run = async () => {
      worker = await createWorker(['eng', 'ara'], 1, {
        langPath: languagePath, cacheMethod: 'none',
        workerPath: path.join(modulesPath, 'tesseract.js', 'src', 'worker-script', 'node', 'index.js'),
        errorHandler: () => { /* Errors reach the request; never log receipt text. */ },
      });
      if (finished) { await worker.terminate(); throw new Error('Receipt scan expired.'); }
      await worker.setParameters({ preserve_interword_spaces: '1' });
      const result = await worker.recognize(image);
      return { text: result.data.text, confidence: result.data.confidence };
    };
    return await Promise.race([run(), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Receipt scanning took too long. Please try a clearer screenshot.')), 45000);
    })]);
  } finally {
    finished = true;
    clearTimeout(timeout);
    await worker?.terminate();
  }
}
