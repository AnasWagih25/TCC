import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
const app = initializeApp({ credential: cert(account), storageBucket: `${account.project_id}.firebasestorage.app` }, 'live-test-inspection');
const db = getFirestore(app);
const id = process.argv.find(value => value.startsWith('ORD-'));
const cleanup = process.argv.includes('--cleanup');
if (id) {
  const reference = db.collection('orders').doc(id);
  let snapshot = await reference.get();
  assert.ok(snapshot.exists, 'Test order not found');
  let order = snapshot.data();
  assert.equal(order.customer.name, 'SYSTEM TEST — DO NOT PREPARE');
  assert.match(order.customer.notes, /^AUTHORIZED SYSTEM TEST/);
  assert.equal(order.customer.email, 'diagnostic@example.invalid');
  assert.equal(order.customer.phone, '01000000000');
  assert.equal(order.deliveryMethod, 'pickup'); assert.equal(order.paymentMethod, 'cash'); assert.equal(order.paymentStatus, 'unpaid');
  assert.equal(order.items.length, 1); assert.equal(order.items[0].id, 'p1'); assert.equal(order.items[0].quantity, 1);
  assert.equal(order.items[0].price, 395); assert.equal(order.items[0].selectedSize, 'Normal');
  assert.equal(order.items[0].selectedCustomizations[0].text, 'SYSTEM TEST — DO NOT BAKE');
  assert.equal(order.subtotal, 395); assert.equal(order.discount, 19.75); assert.equal(order.deliveryFee, 0); assert.equal(order.total, 375.25); assert.equal(order.promoCode, 'QUIRK');
  for (let attempt = 0; order.email?.status !== 'sent' && attempt < 15; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    snapshot = await reference.get(); order = snapshot.data();
    if (order.email?.status === 'failed') throw new Error(`Test notification failed: ${order.email.lastError}`);
  }
  assert.equal(order.email.status, 'sent', 'Notification has not been accepted by SMTP');
  const job = (await db.collection('orderEmailJobs').doc(id).get()).data();
  assert.equal(job.state, 'sent'); assert.equal(job.attempts, 1);
  const proof = { orderId: id, createdAt: order.date, source: order.source, item: order.items[0].name, unitPrice: 395, quantity: 1, subtotal: order.subtotal, discount: order.discount, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, fulfillment: order.deliveryMethod, customTextPreserved: true, contactsAndNotesVerified: true, pickupSnapshotVerified: Boolean(order.pickupSnapshot?.address && order.customer.location?.lat), email: { status: order.email.status, attempts: job.attempts, sentAt: order.email.sentAt }, inboxDeliveryVerified: false, cleanedUp: false };
  if (cleanup) {
    await db.runTransaction(async transaction => {
      const current = await transaction.get(reference);
      if (!current.exists) return;
      const saved = current.data();
      assert.equal(saved.customer.name, 'SYSTEM TEST — DO NOT PREPARE');
      const totals = new Map();
      for (const item of saved.items) totals.set(item.id, (totals.get(item.id) || 0) + item.quantity);
      const products = await transaction.getAll(...[...totals.keys()].map(key => db.collection('products').doc(key)));
      for (const product of products) { assert.ok(product.exists); transaction.update(product.ref, { stock: product.data().stock + totals.get(product.id) }); }
      transaction.delete(reference); transaction.delete(db.collection('orderEmailJobs').doc(id));
    });
    proof.cleanedUp = true;
  }
  await mkdir('outputs/runtime', { recursive: true });
  await writeFile('outputs/runtime/live-order-proof.json', JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
}
if (cleanup) {
  for (const title of ['SYSTEM TEST 20261016 — DO NOT PUBLISH', 'SYSTEM STAFF TEST 20261016 — DO NOT PUBLISH']) {
    const reviews = await db.collection('reviews').where('title', '==', title).get();
    for (const review of reviews.docs) {
      assert.equal(review.data().name, 'SYSTEM TEST — REMOVE');
      assert.notEqual(review.data().status, 'published');
      for (const url of review.data().photos || []) {
        const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1] || '');
        assert.ok(path.startsWith(`review-photos/${review.id}/`));
        await getStorage(app).bucket().file(path).delete({ ignoreNotFound: true });
      }
      await review.ref.delete();
      console.log(`Removed disposable ${review.data().source} review and its photos.`);
    }
  }
  console.log('Only the explicitly marked diagnostic fixtures were removed. Purchased test stock was restored without overwriting concurrent sales.');
}
