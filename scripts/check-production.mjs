import assert from 'node:assert/strict';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')) }, 'production-health');
const uid = process.env.ADMIN_UIDS?.split(',')[0]?.trim();
assert.ok(uid);
assert.equal((await getAuth(app).getUser(uid)).customClaims?.admin, true);
const session = await getAuth(app).createCustomToken(uid);
const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyB09zmFUm505sSDng-7przLhLSEU1RBciM', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: session, returnSecureToken: true }) });
const { idToken } = await response.json();
assert.ok(idToken, 'Staff verification session could not be created');
const origin = 'https://www.thecookieconcept.live';
const health = await fetch(`${origin}/api/admin/health`, { headers: { Authorization: `Bearer ${idToken}` } });
assert.equal(health.status, 200);
const readiness = await health.json();
assert.equal(readiness.ready, true); assert.equal(readiness.emailConfigured, true); assert.equal(readiness.retryConfigured, true);
console.log('PASS: production Firebase authentication, database access, mail configuration and retry configuration.');
for (const [path, method, status] of [['/api/orders', 'POST', 400], ['/api/send-order-email', 'POST', 403], ['/api/admin/manual-order', 'POST', 403], ['/api/internal/order-emails', 'GET', 401], ['/api/admin/order-emails', 'POST', 403]]) {
  const result = await fetch(`${origin}${path}`, { method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
  assert.equal(result.status, status, `Unexpected status for ${path}`);
  console.log(`PASS: ${method} ${path} responds correctly (${status}).`);
}
const cron = await fetch(`${origin}/api/internal/order-emails`, { headers: { Authorization: `Bearer ${process.env.ORDER_EMAIL_RETRY_SECRET}` } });
assert.equal(cron.status, 202);
console.log('PASS: authorized Vercel GET notification retry accepts work.');
const staffRetry = await fetch(`${origin}/api/admin/order-emails`, { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
assert.equal(staffRetry.status, 202);
console.log('PASS: authenticated background admin notification retry accepts work.');
