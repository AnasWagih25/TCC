export type PaymentPlan = 'deposit' | 'full';
export type RemainingPaymentMethod = 'cash' | 'instapay';

export type CheckoutPayment = {
  plan: PaymentPlan;
  remainingMethod: RemainingPaymentMethod;
  proofToken: string;
};

/** Private receipt metadata; screenshots are served only through a staff-only endpoint. */
export type PaymentReceipt = {
  id: string;
  path: string;
  sha256: string;
  detectedAmount: number;
  confidence: number;
  uploadedAt: string;
};

export type OrderPayment = {
  plan: PaymentPlan;
  amountSubmitted: number;
  remainingAmount: number;
  remainingMethod: RemainingPaymentMethod;
  status: 'pending_review' | 'verified' | 'rejected';
  receipt: PaymentReceipt;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  balanceReceivedAt?: string;
  balanceReceivedBy?: string;
};

/** Both checkout and the server use the final total after delivery and discounts. */
export function paymentAmounts(total: number, plan: PaymentPlan) {
  const totalCents = Math.round((total + Number.EPSILON) * 100);
  const dueCents = plan === 'full' ? totalCents : Math.ceil(totalCents / 2);
  return { amountDue: dueCents / 100, remainingAmount: (totalCents - dueCents) / 100 };
}

function cents(value: number) {
  if (!Number.isFinite(value) || value < 0) return null;
  const result = Math.round(value * 100);
  return Number.isSafeInteger(result) && Math.abs(value * 100 - result) < 0.0000001 ? result : null;
}

/** Optional rounding only ever increases the required transfer to its next whole pound. */
export function amountMatchesPayment(received: number, required: number) {
  const receivedCents = cents(received), requiredCents = cents(required);
  return receivedCents !== null && requiredCents !== null && requiredCents > 0 &&
    (receivedCents === requiredCents || receivedCents === Math.ceil(requiredCents / 100) * 100);
}

/** A transfer covering the full total always wins when tiny totals make both plans match. */
export function matchPaymentPlan(total: number, received: number): PaymentPlan | null {
  if (cents(total) === null || total <= 0) return null;
  if (amountMatchesPayment(received, total)) return 'full';
  return amountMatchesPayment(received, paymentAmounts(total, 'deposit').amountDue) ? 'deposit' : null;
}

export function remainingAfterPayment(total: number, received: number) {
  const totalCents = cents(total), receivedCents = cents(received);
  if (totalCents === null || receivedCents === null) throw new RangeError('Payment amounts must be valid Egyptian pounds and piastres.');
  return Math.max(0, totalCents - receivedCents) / 100;
}
