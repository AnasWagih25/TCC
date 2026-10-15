import { NextResponse } from 'next/server';
import { adminDatabase, requireAdmin } from '@/lib/firebase-admin';
import { sendOrderNotification } from '@/lib/order-notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const { orderId } = await request.json();
    if (typeof orderId !== 'string' || !/^[\w-]{1,100}$/.test(orderId)) return NextResponse.json({ error: 'Invalid order reference.' }, { status: 400 });
    // Build email exclusively from the persisted order.
    const result = await sendOrderNotification(adminDatabase(), orderId);
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'ADMIN_AUTH_REQUIRED';
    return NextResponse.json({ error: unauthorized ? 'Administrator access is required.' : 'The notification could not be retried. Check server configuration and try again.' }, { status: unauthorized ? 403 : 503 });
  }
}
