import { NextResponse } from 'next/server';
import { adminDatabase, requireAdmin, serverFirebaseConfigured } from '@/lib/firebase-admin';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!serverFirebaseConfigured()) return NextResponse.json({ ready: false, error: 'Server Firebase access is not configured. Follow ADMIN_SETUP.md before enabling checkout.' }, { status: 503 });
  try {
    await requireAdmin(request);
    await adminDatabase().collection('settings').doc('pickup').get();
    return NextResponse.json({ ready: true, emailConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS), retryConfigured: Boolean(process.env.ORDER_EMAIL_RETRY_SECRET) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ ready: false, error: 'Server access could not be verified. Check Firebase credentials and your admin claim or ADMIN_UIDS.' }, { status: 503 }); }
}
