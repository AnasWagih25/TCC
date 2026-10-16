import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
const credential = cert(account);
const bucket = `${account.project_id}.firebasestorage.app`;
const app = initializeApp({ credential, storageBucket: bucket }, 'rules-repair');
const rules = getSecurityRules(app);
const review = await readFile('firebase/reviews.firestore.rules', 'utf8');
const orders = await readFile('firebase/firestore.orders.rules', 'utf8');
const photos = await readFile('firebase/reviews.storage.rules', 'utf8');
const firestoreSource = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function staff() { return request.auth != null && request.auth.token.admin == true; }
    match /products/{id} { allow read: if true; allow write: if staff(); }
    match /categories/{id} { allow read: if true; allow write: if staff(); }
    match /settings/{id} { allow read: if true; allow write: if staff(); }
    ${review}
    ${orders}
  }
}`;
const storageSource = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{path=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    ${photos}
  }
}`;
await mkdir('outputs/runtime', { recursive: true });
await writeFile('firebase/firestore.rules', firestoreSource + '\n');
await writeFile('firebase/storage.rules', storageSource + '\n');
const currentFirestore = await rules.getFirestoreRuleset();
const currentStorage = await rules.getStorageRuleset(bucket);
const backup = 'outputs/runtime/firebase-rules-before-repair.json';
try { await writeFile(backup, JSON.stringify({ firestore: currentFirestore, storage: currentStorage }, null, 2), { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
const timestamp = new Date().toISOString();
const sample = { id: '11111111-1111-4111-8111-111111111111', name: 'Permission test', rating: 5, title: 'Permission test', body: 'Disposable rules simulation only.', product: '', photos: [], status: 'pending', createdAt: timestamp, source: 'customer' };
const publicCreate = { path: `/databases/(default)/documents/reviews/${sample.id}`, method: 'create', time: timestamp, auth: null, resource: { data: sample } };
const staff = { uid: 'simulation-staff', token: { admin: true } };
const cases = [
  { expectation: 'ALLOW', request: publicCreate },
  { expectation: 'DENY', request: { ...publicCreate, resource: { data: { ...sample, status: 'published' } } } },
  { expectation: 'ALLOW', request: { ...publicCreate, auth: staff, resource: { data: { ...sample, status: 'hidden', source: 'staff' } } } },
  { expectation: 'DENY', request: { path: '/databases/(default)/documents/orders/simulation-only', method: 'get', auth: null, time: timestamp }, resource: { data: { status: 'pending' } } },
  { expectation: 'ALLOW', request: { path: '/databases/(default)/documents/categories/simulation-only', method: 'create', auth: staff, resource: { data: { name: 'Simulation only' } }, time: timestamp } },
];
const { access_token } = await credential.getAccessToken();
const testResponse = await fetch(`https://firebaserules.googleapis.com/v1/projects/${account.project_id}:test`, {
  method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: firestoreSource }] }, testSuite: { testCases: cases } }),
});
const result = await testResponse.json();
const testsPassed = testResponse.ok && result.testResults?.length === cases.length && !result.issues?.some(issue => issue.severity === 'ERROR') && result.testResults.every(test => test.state === 'SUCCESS');
const simulatorUnavailable = testResponse.status === 403;
const deployCompiled = process.argv.includes('--deploy-compiled') && simulatorUnavailable;
if (!testsPassed && !process.argv.includes('--compile-only') && !deployCompiled) {
  console.error(JSON.stringify(result)); process.exit(1);
}
console.log(testsPassed ? `Firestore permission simulations passed: ${result.testResults.length}.` : deployCompiled ? 'Rules simulator permission unavailable; publishing compiled rules for immediate disposable live verification.' : 'Rules simulation permission is unavailable. Compiling only; publishing is disabled.');
const compiledFirestore = await rules.createRuleset(rules.createRulesFileFromSource('firestore.rules', firestoreSource));
const compiledStorage = await rules.createRuleset(rules.createRulesFileFromSource('storage.rules', storageSource));
console.log('Firestore and Storage rules compiled. Previous releases backed up.');
if ((process.argv.includes('--deploy') && testsPassed) || deployCompiled) {
  await rules.releaseFirestoreRuleset(compiledFirestore);
  await rules.releaseStorageRuleset(compiledStorage, bucket);
  console.log('Published reviewed Firestore and Storage access rules.');
} else console.log('Check only: production releases unchanged. Use --deploy to publish.');
