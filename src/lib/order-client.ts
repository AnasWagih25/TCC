import type { Order } from '@/context/CartContext';
import type { CheckoutRequest } from './order-domain';

type Input = Omit<CheckoutRequest, 'requestId' | 'receiptToken'>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Prepared = { fingerprint: string; request: CheckoutRequest };
const storageKey = 'tcc_pending_checkout_v1';

export function createOrderSubmitter(storage: StoragePort | null, send: typeof fetch = fetch, uuid = () => crypto.randomUUID()) {
  let prepared: Prepared | null = null;
  try { prepared = JSON.parse(storage?.getItem(storageKey) || 'null'); } catch { /* An invalid cache cannot place an order. */ }
  return async (input: Input): Promise<Order> => {
    const fingerprint = JSON.stringify(input);
    if (prepared && prepared.fingerprint !== fingerprint) throw new Error('A previous submission is awaiting confirmation. Restore its details and retry, or contact the bakery with the reference shown below.');
    if (!prepared) {
      prepared = { fingerprint, request: { ...input, requestId: uuid(), receiptToken: uuid() } };
      try { storage?.setItem(storageKey, JSON.stringify(prepared)); } catch { /* In-memory retries still reuse this reference. */ }
    }
    const reference = `ORD-${prepared.request.requestId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await send('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prepared.request), signal: controller.signal });
      const result = await response.json();
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
