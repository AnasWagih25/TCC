import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { adminDatabase, adminStorage, serverFirebaseConfigured } from '@/lib/firebase-admin';
import { scanPaymentReceipt } from '@/lib/payment-ocr';
import { readReceiptAmount } from '@/lib/payment-receipt-text';
import { signPaymentProof } from '@/lib/payment-proof';
import { matchPaymentPlan, paymentAmounts, type PaymentReceipt } from '@/lib/payment-types';

export const runtime = 'nodejs';
export const maxDuration = 60;
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!serverFirebaseConfigured()) return response({ error: 'Receipt scanning is temporarily unavailable.' }, 503);
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const source = new URL(origin);
      const host = request.headers.get('host') || new URL(request.url).host;
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== host) return response({ error: 'Open checkout on this website to upload your receipt.' }, 403);
    } catch { return response({ error: 'Open checkout on this website to upload your receipt.' }, 403); }
  }
  if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024) return response({ error: 'Choose a screenshot smaller than 4 MB.' }, 413);
  try {
    const form = await request.formData();
    const file = form.get('file');
    const total = Number(form.get('total'));
    if (!Number.isFinite(total) || total <= 0 || total > 1000000) return response({ error: 'Review your order total before scanning.' }, 400);
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 100 || file.size > 3.8 * 1024 * 1024) return response({ error: 'Upload a JPG, PNG or WebP screenshot smaller than 3.8 MB.' }, 400);
    const db = adminDatabase();
    const bucket = Math.floor(Date.now() / 600000);
    const client = createHash('sha256').update((request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()).digest('hex');
    const limitRef = db.collection('paymentProofLimits').doc(`${client}-${bucket}`);
    const allowed = await db.runTransaction(async transaction => {
      const current = await transaction.get(limitRef);
      const count = Number(current.data()?.count || 0);
      if (count >= 8) return false;
      transaction.set(limitRef, { count: count + 1, expiresAt: new Date(Date.now() + 86400000) });
      return true;
    });
    if (!allowed) return response({ error: 'Too many scans. Please wait a few minutes before trying again.' }, 429);
    const source = Buffer.from(await file.arrayBuffer());
    const decoded = sharp(source, { limitInputPixels: 16000000, animated: false }).rotate();
    const metadata = await decoded.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1 || !metadata.width || !metadata.height || metadata.width < 180 || metadata.height < 180) return response({ error: 'Use a complete, readable JPG, PNG or WebP transaction screenshot.' }, 400);
    const image = await decoded.resize({ width: 2000, height: 2600, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
    const scanImage = await sharp(image).resize({ width: 1400, height: 3200, fit: 'inside' }).grayscale().normalize().png().toBuffer();
    const scan = await scanPaymentReceipt(scanImage);
    const detected = readReceiptAmount(scan.text);
    if (scan.confidence < 45 || detected.amount === null) return response({ error: detected.reason || 'The screenshot is not clear enough to read reliably. Please upload a sharper transaction confirmation.' }, 422);
    const deposit = paymentAmounts(total, 'deposit').amountDue;
    const plan = matchPaymentPlan(total, detected.amount);
    if (!plan) return response({ error: `The screenshot shows EGP ${detected.amount.toFixed(2)}. Your deposit is EGP ${deposit.toFixed(2)}, or pay EGP ${total.toFixed(2)} in full. Either amount may be rounded up to the next whole pound. Upload the matching transaction.`, detectedAmount: detected.amount }, 422);
    const id = randomUUID();
    const receipt: PaymentReceipt = { id, path: `payment-receipts/${id}.jpg`, sha256: createHash('sha256').update(image).digest('hex'), detectedAmount: detected.amount, confidence: scan.confidence, uploadedAt: new Date().toISOString() };
    await adminStorage().file(receipt.path).save(image, { resumable: false, contentType: 'image/jpeg', metadata: { cacheControl: 'private, no-store', metadata: { purpose: 'order-payment-proof' } } });
    return response({ proofToken: signPaymentProof(receipt), receipt, plan });
  } catch (error) {
    console.error('Payment screenshot validation failed:', error instanceof Error ? error.name : 'Unknown error');
    return response({ error: 'We couldn’t scan this screenshot. Try a clear JPG or PNG showing the transfer amount and currency. No order has been placed.' }, 503);
  }
}
