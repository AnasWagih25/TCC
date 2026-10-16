import { after, NextResponse } from 'next/server';
import { adminDatabase, requireAdmin } from '@/lib/firebase-admin';
import { retryOrderNotifications } from '@/lib/order-notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDatabase();
    after(async () => {
      try { await retryOrderNotifications(db); }
      catch (error) { console.error('Notification queue remains pending:', error instanceof Error ? error.message : 'Unknown failure'); }
    });
    return NextResponse.json({ queued: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Notification queue could not be checked.' }, { status: error instanceof Error && error.message === 'ADMIN_AUTH_REQUIRED' ? 403 : 503 });
  }
}
