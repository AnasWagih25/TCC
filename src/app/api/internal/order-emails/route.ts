import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/firebase-admin';
import { retryOrderNotifications } from '@/lib/order-notifications';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const expected = process.env.ORDER_EMAIL_RETRY_SECRET || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ results: await retryOrderNotifications(adminDatabase()) }); }
  catch { return NextResponse.json({ error: 'Notification retry failed.' }, { status: 503 }); }
}
