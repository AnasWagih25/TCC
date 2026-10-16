import { timingSafeEqual } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/firebase-admin';
import { retryOrderNotifications } from '@/lib/order-notifications';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const authorized = [process.env.ORDER_EMAIL_RETRY_SECRET, process.env.CRON_SECRET].some(expected => expected && Buffer.byteLength(expected) === Buffer.byteLength(received) && timingSafeEqual(Buffer.from(expected), Buffer.from(received)));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = adminDatabase();
    after(async () => { try { await retryOrderNotifications(db); } catch (error) { console.error('Notification retry remains pending:', error instanceof Error ? error.message : 'Unknown failure'); } });
    return NextResponse.json({ queued: true }, { status: 202 });
  }
  catch { return NextResponse.json({ error: 'Notification retry failed.' }, { status: 503 }); }
}
// Vercel Cron invokes GET; Netlify and other schedulers can continue using POST.
export const GET = POST;
