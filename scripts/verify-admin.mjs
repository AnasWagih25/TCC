import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
const app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')) }, 'verify');
try {
  const pickup = await getFirestore(app).collection('settings').doc('pickup').get();
  console.log(JSON.stringify({ firebaseReadable: pickup.exists, project: app.options.credential.projectId || 'configured' }));
  if (process.argv.includes('--users')) {
    const { users } = await getAuth(app).listUsers(20);
    console.log(JSON.stringify({ existingStaffAccounts: users.map(user => ({ uid: user.uid, email: user.email, adminClaim: user.customClaims?.admin === true, disabled: user.disabled })) }));
  }
  if (process.argv.includes('--smtp')) {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    await transport.verify();
    console.log('SMTP authentication and connection verified. No email was sent.');
  }
} catch (error) { console.error(error instanceof Error ? error.message : 'Verification failed.'); process.exitCode = 1; }
