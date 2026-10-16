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
