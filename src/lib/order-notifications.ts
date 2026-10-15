import nodemailer from 'nodemailer';
import type { Firestore } from 'firebase-admin/firestore';
import type { Order } from '@/context/CartContext';
import { renderOrderEmail } from './order-email';

export async function sendOrderNotification(db: Firestore, orderId: string) {
  const orderRef = db.collection('orders').doc(orderId);
  const jobRef = db.collection('orderEmailJobs').doc(orderId);
  const claimed = await db.runTransaction(async transaction => {
    const [orderDoc, jobDoc] = await transaction.getAll(orderRef, jobRef);
    if (!orderDoc.exists) throw new Error('Order not found.');
    const job = jobDoc.data();
    if (job?.state === 'sent' || (job?.state === 'sending' && job.leaseUntil > Date.now())) return null;
    const attempts = Number(job?.attempts || 0) + 1;
    transaction.set(jobRef, { state: 'sending', attempts, leaseUntil: Date.now() + 120000, nextAttemptAt: 0 }, { merge: true });
    transaction.update(orderRef, { email: { status: 'sending', attempts } });
    return { order: { ...orderDoc.data(), id: orderDoc.id } as Order, attempts };
  });
  if (!claimed) return { status: 'unchanged' };
  let accepted = false;
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('Order email credentials are missing.');
    const to = process.env.ORDER_NOTIFY_TO || 'magdyhala906@gmail.com';
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });
    const info = await transporter.sendMail({ ...renderOrderEmail(claimed.order), from: `"The Cookie Concept" <${process.env.EMAIL_USER}>`, to, messageId: `<${orderId}@orders.thecookieconcept.local>` });
    if (!info.accepted?.length || info.rejected?.length) throw new Error('The email server did not accept the order notification.');
    accepted = true;
    const sentAt = new Date().toISOString();
    const batch = db.batch();
    batch.set(jobRef, { state: 'sent', attempts: claimed.attempts, sentAt, messageId: info.messageId, leaseUntil: 0 });
    batch.update(orderRef, { email: { status: 'sent', attempts: claimed.attempts, sentAt, messageId: info.messageId } });
    await batch.commit();
    return { status: 'sent' };
  } catch (error) {
    const lastError = accepted ? 'Email accepted; saving its status failed. Check the inbox before retrying.' : error instanceof Error ? error.message : 'Email could not be sent.';
    const batch = db.batch();
    batch.set(jobRef, { state: 'failed', attempts: claimed.attempts, lastError, leaseUntil: 0, nextAttemptAt: Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(claimed.attempts - 1, 6)), needsReview: accepted }, { merge: true });
    batch.update(orderRef, { email: { status: 'failed', attempts: claimed.attempts, lastError } });
    await batch.commit();
    return { status: 'failed' };
  }
}

export async function retryOrderNotifications(db: Firestore) {
  const jobs = await db.collection('orderEmailJobs').where('state', 'in', ['pending', 'failed', 'sending']).limit(10).get();
  const results = [];
  for (const job of jobs.docs) {
    const data = job.data();
    if (data.needsReview || data.nextAttemptAt > Date.now() || data.leaseUntil > Date.now()) continue;
    results.push({ id: job.id, ...await sendOrderNotification(db, job.id) });
  }
  return results;
}
