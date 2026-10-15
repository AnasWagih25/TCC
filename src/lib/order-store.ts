import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Category, Order, Product, PromoCode } from '@/context/CartContext';
import { type CheckoutRequest, OrderError, priceOrder } from './order-domain';
import { defaultPickupSettings, resolvePickupSettings, type PickupSettings } from './pickup';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');

/** Order, stock reservation, and notification job commit together or not at all. */
export async function persistCheckout(db: Firestore, request: CheckoutRequest): Promise<Order> {
  const id = `ORD-${request.requestId}`;
  const orderRef = db.collection('orders').doc(id);
  const receiptHash = digest(request.receiptToken);
  const requestHash = digest(JSON.stringify(request));
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(orderRef);
    if (existing.exists) {
      const saved = existing.data()!;
      if (saved.receiptHash !== receiptHash || saved.requestHash !== requestHash) throw new OrderError('This order reference belongs to a different submission.', 409);
      const { receiptHash: _receipt, requestHash: _request, ...order } = saved;
      void _receipt; void _request;
      return order as Order;
    }
    const productIds = [...new Set(request.items.map(item => item.id))];
    const productDocs = await transaction.getAll(...productIds.map(productId => db.collection('products').doc(productId)));
    const categoryDocs = await transaction.get(db.collection('categories'));
    const pickupDoc = await transaction.get(db.collection('settings').doc('pickup'));
    const promoDoc = await transaction.get(db.collection('settings').doc('promo'));
    const products = productDocs.filter(doc => doc.exists).map(doc => ({ ...doc.data(), id: doc.id }) as Product);
    const categories = categoryDocs.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Category);
    const pickup = pickupDoc.exists ? resolvePickupSettings(pickupDoc.data() as PickupSettings) : defaultPickupSettings;
    const priced = priceOrder(request, products, categories, promoDoc.exists ? promoDoc.data() as PromoCode : null, pickup);
    const customer = request.deliveryMethod === 'pickup' ? { ...request.customer, address: `Pickup (${pickup.address})`, location: { lat: pickup.lat, lng: pickup.lng } } : request.customer;
    const order: Order = {
      id, date: new Date().toISOString(), source: 'web', deliveryMethod: request.deliveryMethod,
      customer, items: priced.items, subtotal: priced.subtotal, total: priced.total, deliveryFee: priced.deliveryFee,
      discount: priced.discount, promoCode: request.promoCode, paymentMethod: request.paymentMethod, paymentStatus: 'unpaid',
      status: 'pending', email: { status: 'pending', attempts: 0 },
      ...(request.deliveryMethod === 'pickup' ? { pickupSnapshot: pickup } : {}),
    };
    transaction.create(orderRef, { ...order, receiptHash, requestHash });
    for (const [productId, count] of priced.quantities) transaction.update(db.collection('products').doc(productId), { stock: products.find(product => product.id === productId)!.stock - count });
    transaction.create(db.collection('orderEmailJobs').doc(id), { state: 'pending', attempts: 0, nextAttemptAt: 0, leaseUntil: 0 });
    return order;
  });
}
