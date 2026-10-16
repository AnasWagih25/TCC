import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
const credential = cert(account);
const app = initializeApp({ credential }, 'runtime-diagnostic');
const db = getFirestore(app);
const project = account.project_id;
try {
  for (const name of ['products', 'categories']) {
    const snapshot = await db.collection(name).get();
    console.log(JSON.stringify({ collection: name, data: snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, name: data.name, type: data.type, price: data.price, stock: data.stock, sizeType: data.sizeType, isBoxBuilder: data.isBoxBuilder, flavors: data.flavors, boxPricing: data.boxPricing };
    }) }));
  }
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'reviews' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } }, limit: 1 } }),
  });
  const publicResult = await response.json();
  console.log(JSON.stringify({ publicReviewRead: response.status, error: publicResult.error?.message }));
  const { access_token } = await credential.getAccessToken();
  const releases = await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, { headers: { Authorization: `Bearer ${access_token}` } });
  const result = await releases.json();
  console.log(JSON.stringify({ rulesRead: releases.status, error: result.error?.message, releases: result.releases?.map(item => ({ name: item.name, rulesetName: item.rulesetName })) }));
  if (releases.ok) {
    for (const release of result.releases || []) {
      const read = await fetch(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, { headers: { Authorization: `Bearer ${access_token}` } });
      const rules = await read.json();
      console.log(JSON.stringify({ release: release.name, source: rules.source?.files, error: rules.error?.message }));
    }
  }
} catch (error) { console.error(error instanceof Error ? error.message : 'Diagnostic failed'); process.exitCode = 1; }
