import { after, NextResponse } from 'next/server';
import { adminDatabase, serverFirebaseConfigured } from '@/lib/firebase-admin';
import { OrderError, validateCheckout } from '@/lib/order-domain';
import { persistCheckout, recoverLegacyCheckout } from '@/lib/order-store';
import { sendOrderNotification } from '@/lib/order-notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!serverFirebaseConfigured()) return NextResponse.json({ error: 'Ordering is temporarily unavailable. Your bag is safe. Please contact the bakery.', definitive: true }, { status: 503 });
  try {
    const body = await request.text();
    if (body.length > 64000) return NextResponse.json({ error: 'Order is too large.', definitive: true }, { status: 413 });
    const data = JSON.parse(body);
    if (data && typeof data === 'object' && !Array.isArray(data) && !Object.hasOwn(data, 'payment')) {
      const recovered = await recoverLegacyCheckout(adminDatabase(), data);
      if (recovered) return NextResponse.json({ order: recovered }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    const input = validateCheckout(data);
    const db = adminDatabase();
    const order = await persistCheckout(db, input);
    after(async () => { try { await sendOrderNotification(db, order.id); } catch (error) { console.error('Order notification remains queued:', error instanceof Error ? error.message : 'Unknown failure'); } });
    return NextResponse.json({ order }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message, definitive: true }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid order request.', definitive: true }, { status: 400 });
    console.error('Order persistence failed:', error instanceof Error ? error.message : 'Unknown failure');
    return NextResponse.json({ error: 'We could not confirm this order yet. Retry with the same details; your order reference will be reused.', definitive: false }, { status: 503 });
  }
}
