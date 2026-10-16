import type { Order } from '@/context/CartContext';
import type { CheckoutRequest } from './order-domain';

type Input = Omit<CheckoutRequest, 'requestId' | 'receiptToken'>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Prepared = { fingerprint: string; request: CheckoutRequest };
const storageKey = 'tcc_pending_checkout_v1';

export function pendingCheckout(storage: StoragePort | null): CheckoutRequest | null {
  try { return (JSON.parse(storage?.getItem(storageKey) || 'null') as Prepared | null)?.request || null; } catch { return null; }
}

function selectionKey(item: CheckoutRequest['items'][number]) {
  return JSON.stringify([item.id, item.selectedSize, item.selectedFlavor || '', item.boxSize || 0, [...(item.boxFlavors || [])].sort((a, b) => a.name.localeCompare(b.name)).map(f => [f.name, f.quantity]), [...(item.selectedCustomizations || [])].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.name, c.price, (c.text || '').trim()])]);
}
export function remainingCart<T extends CheckoutRequest['items'][number]>(cart: T[], confirmed: CheckoutRequest['items']) {
  const remaining = new Map<string, number>();
  for (const item of confirmed) remaining.set(selectionKey(item), (remaining.get(selectionKey(item)) || 0) + item.quantity);
  return cart.flatMap(item => {
    const key = selectionKey(item), consumed = Math.min(item.quantity, remaining.get(key) || 0);
    remaining.set(key, (remaining.get(key) || 0) - consumed);
    return item.quantity > consumed ? [{ ...item, quantity: item.quantity - consumed }] : [];
  });
}

export function createOrderSubmitter(storage: StoragePort | null, send: typeof fetch = fetch, uuid = () => crypto.randomUUID()) {
  let prepared: Prepared | null = null;
  try { prepared = JSON.parse(storage?.getItem(storageKey) || 'null'); } catch { /* An invalid cache cannot place an order. */ }
  return async (input: Input): Promise<Order> => {
    const fingerprint = JSON.stringify(input);
    if (prepared && prepared.fingerprint !== fingerprint) throw new Error(`A previous submission is awaiting confirmation. Use “Check previous submission” to recover it. Reference: ORD-${prepared.request.requestId}`);
    if (!prepared) {
      prepared = { fingerprint, request: { ...input, requestId: uuid(), receiptToken: uuid() } };
      try { storage?.setItem(storageKey, JSON.stringify(prepared)); } catch { /* In-memory retries still reuse this reference. */ }
    }
    const reference = `ORD-${prepared.request.requestId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await send('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prepared.request), signal: controller.signal });
      const result = await response.json().catch(() => {
        throw new Error(response.status >= 500
          ? 'The ordering service is temporarily unavailable. Your bag is safe. Please try again shortly.'
          : 'The server returned an unreadable confirmation. Please try again.');
      });
      if (!response.ok || !result.order) {
        if (result.definitive === true) {
          prepared = null;
          try { storage?.removeItem(storageKey); } catch { /* The active tab already discarded it. */ }
        }
        throw new Error(result.error || 'The order could not be confirmed.');
      }
      if (result.order.id !== reference || !Array.isArray(result.order.items) || !result.order.items.length) throw new Error('The order response could not be verified.');
      prepared = null;
      try { storage?.removeItem(storageKey); } catch { /* Confirmed in the active tab. */ }
      return result.order as Order;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The connection was interrupted.';
      throw new Error(prepared ? `${message} Retry the same details. Reference: ${reference}` : message);
    } finally { clearTimeout(timer); }
  };
}
