import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
const project = account.project_id;
const bucket = `${project}.firebasestorage.app`;
const app = initializeApp({ credential: cert(account), storageBucket: bucket }, 'review-verification');
const db = getFirestore(app);
const publicId = randomUUID(), staffId = randomUUID(), categoryId = `diagnostic_${randomUUID()}`;
const photoPath = `review-photos/${publicId}/${randomUUID()}.jpg`;
const field = value => typeof value === 'string' ? { stringValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { mapValue: { fields: fields(value) } };
const fields = value => Object.fromEntries(Object.entries(value).map(([key, value]) => [key, field(value)]));
const request = async (path, method = 'GET', data, token = '') => {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`, { method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify({ fields: fields(data) }) } : {}) });
  return response;
};
const expect = async (label, operation, code) => { const response = await operation; assert.equal(response.status, code, `${label}: ${response.status}: ${response.ok ? '' : await response.text()}`); console.log(`PASS: ${label}`); return response; };
try {
  const uid = process.env.ADMIN_UIDS?.split(',')[0]?.trim();
  assert.ok(uid, 'Existing staff UID required');
  assert.equal((await getAuth(app).getUser(uid)).customClaims?.admin, true);
  const customToken = await getAuth(app).createCustomToken(uid);
  const login = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyB09zmFUm505sSDng-7przLhLSEU1RBciM', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
  const authentication = await login.json();
  assert.ok(authentication.idToken, 'Staff verification session could not be created');
  const token = authentication.idToken;
  const review = { id: publicId, name: 'SYSTEM TEST — REMOVE', rating: 5, title: 'SYSTEM TEST — NOT A CUSTOMER REVIEW', body: 'Temporary permission verification. Never publish this diagnostic record.', product: '', photos: [], status: 'pending', source: 'customer', createdAt: new Date().toISOString() };
  await expect('anonymous pending review creation', request(`reviews/${publicId}?currentDocument.exists=false`, 'PATCH', review), 200);
  await expect('anonymous identical retry', request(`reviews/${publicId}`, 'PATCH', review), 200);
  await expect('pending review remains private', request(`reviews/${publicId}`), 403);
  await expect('anonymous content changes denied', request(`reviews/${publicId}`, 'PATCH', { ...review, title: 'Unauthorized change' }), 403);
  await expect('anonymous publishing denied', request(`reviews/${publicId}`, 'PATCH', { ...review, status: 'published' }), 403);
  await expect('staff can read pending submissions', request(`reviews/${publicId}`, 'GET', undefined, token), 200);
  await expect('staff can moderate a pending review', request(`reviews/${publicId}`, 'PATCH', { ...review, status: 'hidden' }, token), 200);
  await expect('staff can add a hidden review', request(`reviews/${staffId}`, 'PATCH', { ...review, id: staffId, status: 'hidden', source: 'staff' }, token), 200);
  await expect('customer orders are private', request('orders'), 403);
  await expect('anonymous product edits denied', request(`products/${categoryId}`, 'PATCH', { name: 'Forbidden test' }), 403);
  await expect('staff category creation', request(`categories/${categoryId}`, 'PATCH', { name: 'SYSTEM TEST — REMOVE' }, token), 200);
  await expect('staff category update', request(`categories/${categoryId}`, 'PATCH', { name: 'SYSTEM TEST — UPDATED' }, token), 200);
  await expect('staff category deletion', request(`categories/${categoryId}`, 'DELETE', undefined, token), 200);
  const image = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#faf3ef' } }).jpeg().toBuffer();
  const upload = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(photoPath)}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Goog-Upload-Protocol': 'raw' }, body: image });
  assert.equal(upload.status, 200, `Customer photo upload failed: ${await upload.text()}`);
  console.log('PASS: anonymous JPEG review-photo upload');
  console.log('All live review, moderation, category and privacy checks passed. No test reviews were published.');
} finally {
  await Promise.all([db.collection('reviews').doc(publicId).delete(), db.collection('reviews').doc(staffId).delete(), db.collection('categories').doc(categoryId).delete(), getStorage(app).bucket().file(photoPath).delete({ ignoreNotFound: true })]);
  console.log('Removed disposable review, category and photo fixtures.');
}
