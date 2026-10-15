import type { CartItem, Order } from '@/context/CartContext';

const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const string = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
export function normalizeAdminOrder(id: string, raw: Record<string, unknown>): Order {
  const customer = raw.customer && typeof raw.customer === 'object' ? raw.customer as Record<string, unknown> : {};
  let date = string(raw.date);
  if (!date && raw.date && typeof (raw.date as { toDate?: unknown }).toDate === 'function') date = (raw.date as { toDate: () => Date }).toDate().toISOString();
  const items = Array.isArray(raw.items) ? raw.items.filter(item => item && typeof item === 'object').map(item => ({ ...item, id: string(item.id), name: string(item.name, 'Item name not recorded'), quantity: number(item.quantity), price: number(item.price), selectedCustomizations: Array.isArray(item.selectedCustomizations) ? item.selectedCustomizations.filter(Boolean) : [], boxFlavors: Array.isArray(item.boxFlavors) ? item.boxFlavors.filter(Boolean) : [] })) as CartItem[] : [];
  return { ...raw, id, date, customer: { ...customer, name: string(customer.name, 'Customer not recorded'), phone: string(customer.phone), email: string(customer.email), address: string(customer.address), notes: string(customer.notes) }, items, total: number(raw.total), deliveryFee: number(raw.deliveryFee), discount: number(raw.discount), status: raw.status === 'fulfilled' ? 'fulfilled' : 'pending' } as Order;
}
export function orderIssues(order: Order) {
  return [!Number.isFinite(Date.parse(order.date)) && 'Order date missing', !order.items.length && 'Items missing', order.items.some(item => item.quantity < 1) && 'Item quantity missing', !order.customer.name || order.customer.name === 'Customer not recorded' ? 'Customer name missing' : false, order.source !== 'manual' && !order.customer.phone && 'Phone missing', !order.paymentMethod && 'Payment method not recorded'].filter(Boolean) as string[];
}
export function ordersCsv(orders: Order[]) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = [['Order', 'Date', 'Source', 'Status', 'Customer', 'Phone', 'Email', 'Fulfillment', 'Address', 'Latitude', 'Longitude', 'Notes', 'Items and extras', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Payment', 'Payment status', 'Email status'], ...orders.map(order => [order.id, order.date, order.source || 'web', order.status, order.customer.name, order.customer.phone, order.customer.email, order.deliveryMethod || 'Not recorded', order.customer.address, order.customer.location?.lat, order.customer.location?.lng, order.customer.notes, order.items.map(item => `${item.quantity} × ${item.name} / ${item.boxSize ? `Box ${item.boxSize}` : item.selectedSize || 'Not recorded'} ${item.selectedFlavor || ''}; ${(item.boxFlavors || []).map(f => `${f.name} × ${f.quantity}`).join(', ')}; ${(item.selectedCustomizations || []).map(c => `${c.name}: ${c.text || ''} (+${c.price})`).join(', ')}; unit ${item.price}`).join('\n'), order.items.reduce((sum, item) => sum + item.price * item.quantity, 0), order.deliveryFee ?? 0, order.discount ?? 0, order.total, order.paymentMethod || 'Not recorded', order.paymentStatus || 'Not recorded', order.email?.status || 'Not tracked'])];
  return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
