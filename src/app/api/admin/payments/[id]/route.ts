import { NextResponse } from 'next/server';
import { adminDatabase, requireAdmin } from '@/lib/firebase-admin';
import { normalizeOrderPayment } from '@/lib/admin-orders';
import { money, OrderError } from '@/lib/order-domain';
import { paymentAmounts } from '@/lib/payment-types';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await requireAdmin(request);
    const { id } = await params;
    if (!/^[\w-]{1,120}$/.test(id)) throw new OrderError('Invalid order reference.');
    const body = await request.text();
    if (body.length > 200) throw new OrderError('Invalid payment action.');
    let action: unknown;
    try { action = JSON.parse(body).action; } catch { throw new OrderError('Invalid payment action.'); }
    if (!['verify_transfer', 'reject_transfer', 'receive_balance'].includes(String(action))) throw new OrderError('Choose a payment action.');
    const db = adminDatabase();
    await db.runTransaction(async transaction => {
      const ref = db.collection('orders').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new OrderError('This order could not be found.', 404);
      const order = snapshot.data()!;
      const payment = normalizeOrderPayment(order.payment);
      if (!payment || typeof order.total !== 'number' || !Number.isFinite(order.total)) throw new OrderError('This order has incomplete payment details. Review it before recording a transfer.', 409);
      const expected = paymentAmounts(order.total, payment.plan);
      if (money(payment.amountSubmitted) !== expected.amountDue || money(payment.remainingAmount) !== expected.remainingAmount || money(payment.receipt.detectedAmount) !== expected.amountDue) throw new OrderError('The saved transfer amounts do not match this order. Review its details.', 409);
      const now = new Date().toISOString();
      let paymentStatus = order.paymentStatus;
      if (action === 'verify_transfer') {
        if (payment.status === 'verified') return;
        payment.status = 'verified'; payment.verifiedAt = now; payment.verifiedBy = user.uid;
        paymentStatus = payment.plan === 'full' ? 'paid' : 'unpaid';
      } else if (action === 'reject_transfer') {
        if (payment.status === 'verified') throw new OrderError('This transfer has already been verified. Review the recorded payment before changing it.', 409);
        payment.status = 'rejected'; payment.rejectedAt = now; paymentStatus = 'unpaid';
      } else {
        if (payment.status !== 'verified' || payment.plan !== 'deposit' || payment.remainingAmount <= 0) throw new OrderError('Verify the deposit before recording the remaining balance.', 409);
        if (order.paymentStatus === 'paid') return;
        payment.balanceReceivedAt = now; payment.balanceReceivedBy = user.uid; paymentStatus = 'paid';
      }
      transaction.update(ref, { payment, paymentStatus, updatedAt: now, updatedBy: user.uid });
    });
    return NextResponse.json({ saved: true }, { headers });
  } catch (error) {
    const auth = error instanceof Error && error.message === 'ADMIN_AUTH_REQUIRED';
    return NextResponse.json({ error: error instanceof OrderError ? error.message : auth ? 'Staff sign-in is required.' : 'The payment update could not be confirmed. Retry the same action.' }, { status: error instanceof OrderError ? error.status : auth ? 403 : 503, headers });
  }
}
