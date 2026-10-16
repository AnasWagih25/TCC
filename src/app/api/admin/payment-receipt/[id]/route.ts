import { NextResponse } from 'next/server';
import { adminDatabase, adminStorage, requireAdmin } from '@/lib/firebase-admin';
import { normalizeOrderPayment } from '@/lib/admin-orders';

export const runtime = 'nodejs';

/** Receipts never receive public download URLs or customer-readable storage rules. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!/^[\w-]{1,120}$/.test(id)) return NextResponse.json({ error: 'Invalid order reference.' }, { status: 400, headers });
    const order = await adminDatabase().collection('orders').doc(id).get();
    const payment = normalizeOrderPayment(order.data()?.payment);
    if (!order.exists || !payment || !/^payment-receipts\/[a-f0-9-]{36}\.jpg$/i.test(payment.receipt.path)) return NextResponse.json({ error: 'No payment screenshot is available for this order.' }, { status: 404, headers });
    const file = adminStorage().file(payment.receipt.path);
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    if (metadata.contentType !== 'image/jpeg' || !Number.isFinite(size) || size <= 0 || size > 4 * 1024 * 1024) return NextResponse.json({ error: 'The saved payment screenshot could not be opened safely.' }, { status: 422, headers });
    const [bytes] = await file.download();
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Disposition': `inline; filename="payment-${id}.jpg"` } });
  } catch (error) {
    return NextResponse.json({ error: 'The payment screenshot could not be loaded. Check staff access and try again.' }, { status: error instanceof Error && error.message === 'ADMIN_AUTH_REQUIRED' ? 403 : 503, headers });
  }
}
