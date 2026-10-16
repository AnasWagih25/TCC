import { createHmac, timingSafeEqual } from 'node:crypto';
import { OrderError } from './order-domain';
import type { PaymentReceipt } from './payment-types';
import { amountMatchesPayment } from './payment-types';

const lifetime = 60 * 60 * 1000;
function secret() {
  const key = process.env.PAYMENT_PROOF_SECRET || process.env.ORDER_EMAIL_RETRY_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!key) throw new OrderError('Receipt validation is temporarily unavailable.', 503);
  return key;
}
const signature = (payload: string) => createHmac('sha256', secret()).update(`tcc-payment-proof-v1.${payload}`).digest();

export function signPaymentProof(receipt: PaymentReceipt) {
  const payload = Buffer.from(JSON.stringify({ version: 1, receipt, expires: Date.now() + lifetime })).toString('base64url');
  return `${payload}.${signature(payload).toString('base64url')}`;
}

export function verifyPaymentProof(token: string, expectedAmount: number): PaymentReceipt {
  try {
    if (typeof token !== 'string' || token.length > 6000) throw new Error();
    const [payload, signed, ...extra] = token.split('.');
    if (!payload || !signed || extra.length) throw new Error();
    const supplied = Buffer.from(signed, 'base64url'), expected = signature(payload);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error();
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const receipt = data.receipt as PaymentReceipt;
    if (data.version !== 1 || !Number.isFinite(data.expires) || data.expires < Date.now() || data.expires > Date.now() + lifetime + 1000) throw new Error();
    if (!receipt || !/^[a-f0-9-]{36}$/i.test(receipt.id) || receipt.path !== `payment-receipts/${receipt.id}.jpg` || !/^[a-f0-9]{64}$/.test(receipt.sha256)) throw new Error();
    if (!amountMatchesPayment(receipt.detectedAmount, expectedAmount)) throw new Error();
    if (!Number.isFinite(receipt.confidence) || receipt.confidence < 45 || receipt.confidence > 100 || !Number.isFinite(Date.parse(receipt.uploadedAt))) throw new Error();
    return receipt;
  } catch (error) {
    if (error instanceof OrderError && error.status === 503) throw error;
    throw new OrderError('Upload and scan a receipt matching the selected payment amount. The previous scan may have expired or your total changed.');
  }
}
