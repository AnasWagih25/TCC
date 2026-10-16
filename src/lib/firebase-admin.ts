import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function serverFirebaseConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIRESTORE_EMULATOR_HOST);
}

function adminApp() {
  const existing = getApps().find(app => app.name === 'tcc-server');
  if (existing) return existing;
  if (!serverFirebaseConfigured()) throw new Error('Server Firebase access is not configured.');
  const account = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'thecc-1e732',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'thecc-1e732.firebasestorage.app',
    credential: account ? cert(JSON.parse(account)) : applicationDefault(),
  }, 'tcc-server');
}

export const adminDatabase = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
export const adminStorage = () => getStorage(adminApp()).bucket();

export async function requireAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) throw new Error('ADMIN_AUTH_REQUIRED');
  const user = await adminAuth().verifyIdToken(token, true).catch(() => { throw new Error('ADMIN_AUTH_REQUIRED'); });
  const uids = (process.env.ADMIN_UIDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (user.admin !== true && !uids.includes(user.uid)) throw new Error('ADMIN_AUTH_REQUIRED');
  return user;
}
