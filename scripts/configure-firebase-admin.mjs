import { chmod, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const path = args[0];
const uidIndex = args.indexOf('--admin-uid');
const uid = uidIndex >= 0 ? args[uidIndex + 1] : '';
if (!path || (uidIndex >= 0 && !uid)) {
  console.error('Usage: node scripts/configure-firebase-admin.mjs /path/to/private-key.json --admin-uid YOUR_STAFF_USER_ID [--grant-admin]');
  process.exit(1);
}
try {
  const key = JSON.parse(await readFile(path, 'utf8'));
  if (key.project_id !== 'thecc-1e732' || typeof key.client_email !== 'string' || typeof key.private_key !== 'string') throw new Error('Choose a service-account key for thecc-1e732.');
  const account = { project_id: key.project_id, client_email: key.client_email, private_key: key.private_key };
  const json = JSON.stringify(account);
  if (json.includes("'")) throw new Error('Unsupported character in credential.');
  const app = initializeApp({ credential: cert(account) }, 'setup');
  const staff = uid ? await getAuth(app).getUser(uid) : null;
  if (args.includes('--grant-admin') && staff) {
    await getAuth(app).setCustomUserClaims(uid, { ...staff.customClaims, admin: true });
  }
  let env = '';
  try { env = await readFile('.env.local', 'utf8'); } catch { /* First setup. */ }
  const values = { FIREBASE_SERVICE_ACCOUNT_JSON: `'${json}'`, FIREBASE_PROJECT_ID: 'thecc-1e732', ...(uid ? { ADMIN_UIDS: uid } : {}), ...(!/^ORDER_EMAIL_RETRY_SECRET=.+$/m.test(env) ? { ORDER_EMAIL_RETRY_SECRET: randomBytes(32).toString('hex') } : {}) };
  for (const [name, value] of Object.entries(values)) {
    const line = `${name}=${value}`;
    const expression = new RegExp(`^${name}=.*$`, 'm');
    env = expression.test(env) ? env.replace(expression, () => line) : `${env.trimEnd()}\n${line}\n`;
  }
  await writeFile('.env.local', env, { mode: 0o600 });
  await chmod('.env.local', 0o600);
  console.log('Server Firebase configuration saved privately to .env.local. No key was printed.');
  console.log(args.includes('--grant-admin') && staff ? 'Admin claim assigned to the selected staff user. Sign out and back in to refresh it.' : uid ? 'Server admin UID configured. Existing Firestore rules still determine browser access.' : 'Server access configured. Staff authorization remains unchanged.');
  console.log('Restart the development server. Set these same variables in hosting before deploying.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Setup failed.');
  process.exitCode = 1;
}
