const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { cert, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { loader } = require('../tests/helpers/load-ts.cjs');
const load = loader();
const { persistCheckout } = load('src/lib/order-store.ts');
const { validateCheckout } = load('src/lib/order-domain.ts');
const { defaultPickupSettings, resolvePickupSettings } = load('src/lib/pickup.ts');
const { defaultCategories } = load('src/lib/catalog-defaults.ts');
const app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')) }, 'order-verification');
const db = getFirestore(app);
const root = db.collection('verificationRuns').doc(`order-flow-${randomUUID()}`);
const scoped = { collection: name => root.collection(name), runTransaction: operation => db.runTransaction(async transaction => await operation({ get: transaction.get.bind(transaction), getAll: transaction.getAll.bind(transaction), create: (reference, data) => transaction.create(reference, structuredClone(data)), update: (reference, data) => transaction.update(reference, structuredClone(data)) })) };
(async () => {
  let unsubscribe = () => {};
  let timer;
  try {
    await root.set({ purpose: 'Disposable isolated order verification', createdAt: new Date().toISOString() });
    await scoped.collection('categories').doc('cake').set({ id: 'cake', sizeType: 'normal_mini', isBoxBuilder: false });
    await scoped.collection('products').doc('verification-cookie').set({ id: 'verification-cookie', name: 'Verification sample', description: 'Fictional test data', stock: 2, image: '', type: 'cake', price: { normal: 400, mini: 250 } });
    await scoped.collection('settings').doc('pickup').set(defaultPickupSettings);
    const request = validateCheckout({ requestId: randomUUID(), receiptToken: randomUUID(), customer: { name: 'Verification sample', phone: '01000000000', email: 'verification@example.invalid', address: '', notes: 'Isolated disposable verification. No email is sent.' }, items: [{ id: 'verification-cookie', quantity: 1, selectedSize: 'Mini', price: 250 }], deliveryMethod: 'pickup', paymentMethod: 'cash', promoCode: '', expectedTotal: 250 });
    const observed = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Live order observation timed out.')), 20000);
      unsubscribe = scoped.collection('orders').onSnapshot(snapshot => { if (snapshot.docs.some(document => document.id === `ORD-${request.requestId}`)) resolve(true); }, reject);
    });
    const [first, retry] = await Promise.all([persistCheckout(scoped, request), persistCheckout(scoped, request)]);
    await observed;
    clearTimeout(timer);
    assert.equal(first.id, retry.id);
    assert.equal((await scoped.collection('products').doc('verification-cookie').get()).data().stock, 1);
    assert.equal((await scoped.collection('orders').get()).size, 1);
    assert.equal((await scoped.collection('orderEmailJobs').get()).size, 1);
    assert.equal((await scoped.collection('orderEmailJobs').doc(first.id).get()).data().state, 'pending');
    console.log('PASS: real Firestore transaction, stock reservation, duplicate request, durable email job, and live order observation.');
    if (process.argv.includes('--migrate-pickup')) {
      const result = await db.runTransaction(async transaction => {
        const reference = db.collection('settings').doc('pickup');
        const current = await transaction.get(reference);
        const value = current.exists ? current.data() : defaultPickupSettings;
        const resolved = resolvePickupSettings(value);
        if (!current.exists || resolved !== value) {
          transaction.set(reference, resolved);
          return 'Updated the previously requested pickup location; pickup hours preserved.';
        }
        return 'Pickup settings already current; no change needed.';
      });
      console.log(result);
      const categories = await db.collection('categories').get();
      if (categories.empty) {
        const batch = db.batch();
        for (const category of defaultCategories) batch.create(db.collection('categories').doc(category.id), structuredClone(category));
        await batch.commit();
        console.log('Restored the three existing built-in menu categories; no products changed.');
      } else console.log(`Catalog categories present: ${categories.size}. No category changes needed.`);
    }
  } finally {
    clearTimeout(timer); unsubscribe();
    await db.recursiveDelete(root);
    console.log('Isolated verification records removed. Real orders and product stock were not changed.');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
