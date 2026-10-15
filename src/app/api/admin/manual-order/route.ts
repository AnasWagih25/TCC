import { after, NextResponse } from 'next/server';
import { adminDatabase, requireAdmin } from '@/lib/firebase-admin';
import type { Order, Product } from '@/context/CartContext';
import { digest } from '@/lib/order-store';
import { OrderError, money } from '@/lib/order-domain';
import { sendOrderNotification } from '@/lib/order-notifications';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request);
    const body = await request.text();
    if (body.length > 10000) throw new OrderError('Sale details are too large.');
    const data = JSON.parse(body);
    if (!/^[a-f0-9-]{36}$/i.test(data.requestId) || !/^[\w-]{1,120}$/.test(data.productId) || typeof data.customerName !== 'string' || !data.customerName.trim() || data.customerName.length > 100 || !Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 100 || !Number.isFinite(data.total) || data.total <= 0 || data.total > 1000000 || !['cash', 'instapay', 'telda'].includes(data.paymentMethod) || !['paid', 'unpaid'].includes(data.paymentStatus) || !['fulfilled', 'pending'].includes(data.status)) throw new OrderError('Check the manual sale details.');
    for (const [field, max] of [['phone', 30], ['email', 254], ['notes', 2000]] as const) if (typeof data[field] !== 'string' || data[field].length > max) throw new OrderError(`Check ${field}.`);
    const id = `MAN-${data.requestId}`;
    const db = adminDatabase();
    const saved = await db.runTransaction(async transaction => {
      const orderRef = db.collection('orders').doc(id);
      const existing = await transaction.get(orderRef);
      const hash = digest(JSON.stringify(data));
      if (existing.exists) { if (existing.data()!.requestHash !== hash || existing.data()!.createdBy !== user.uid) throw new OrderError('This reference has different details. Close the form to start a separate sale.', 409); return { id }; }
      const productRef = db.collection('products').doc(data.productId);
      const productDoc = await transaction.get(productRef);
      const product = productDoc.data() as Product | undefined;
      if (!product || product.stock < data.quantity) throw new OrderError('Not enough stock for this sale.', 409);
      const order: Order = { id, date: new Date().toISOString(), source: 'manual', customer: { name: data.customerName.trim(), phone: data.phone.trim(), email: data.email.trim(), address: 'Manual sale · fulfillment arranged by staff', notes: data.notes.trim() }, items: [{ id: productDoc.id, name: product.name, description: product.description || '', stock: product.stock, image: product.image || '', selectedSize: 'Normal', quantity: data.quantity, price: data.total / data.quantity }], subtotal: money(data.total), total: money(data.total), deliveryFee: 0, discount: 0, status: data.status, paymentMethod: data.paymentMethod, paymentStatus: data.paymentStatus, email: { status: 'pending', attempts: 0 } };
      transaction.create(orderRef, { ...order, requestHash: hash, createdBy: user.uid });
      transaction.update(productRef, { stock: product.stock - data.quantity });
      transaction.create(db.collection('orderEmailJobs').doc(id), { state: 'pending', attempts: 0, nextAttemptAt: 0, leaseUntil: 0 });
      return { id };
    });
    after(async () => { try { await sendOrderNotification(db, saved.id); } catch { /* Durable job will be retried. */ } });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const auth = error instanceof Error && error.message === 'ADMIN_AUTH_REQUIRED';
    return NextResponse.json({ error: error instanceof OrderError ? error.message : auth ? 'Server administrator access is required. Check your admin claim or ADMIN_UIDS.' : 'The sale could not be confirmed. Retry the same details. Check server Firebase configuration if this persists.' }, { status: error instanceof OrderError ? error.status : auth ? 403 : 503 });
  }
}
