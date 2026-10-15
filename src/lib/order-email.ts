import type { Order } from '@/context/CartContext';
import { orderDate, orderMapUrl, orderSubtotal } from './order-domain';

export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const amount = (value: number) => `EGP ${Number(value || 0).toFixed(2)}`;

export function renderOrderEmail(order: Order) {
  const e = escapeHtml;
  const pickup = order.deliveryMethod === 'pickup';
  const map = orderMapUrl(order);
  const method = order.paymentMethod ? { cash: pickup ? 'Cash on pickup' : 'Cash on delivery', instapay: 'Instapay', telda: 'Telda' }[order.paymentMethod] : 'Not recorded';
  const details = [
    ['Customer', order.customer?.name || 'Not provided'], ['Phone', order.customer?.phone || 'Not provided'],
    ['Email', order.customer?.email || 'Not provided'], ['Address', order.customer?.address || 'Not provided'],
    ['Notes', order.customer?.notes || 'None'], ['Fulfillment', order.source === 'manual' ? 'Manual sale' : pickup ? 'Pickup' : 'Delivery'],
    ['Schedule', pickup ? order.pickupSnapshot?.hoursNotice || 'See pickup arrangements' : 'Next-day delivery'],
    ['Payment method', method], ['Payment status', order.paymentStatus || 'Not recorded'], ['Order status', order.status],
  ];
  const itemLines = (order.items || []).map(item => {
    const option = item.boxSize ? `Box of ${item.boxSize}` : [item.selectedSize, item.selectedFlavor].filter(Boolean).join(' · ');
    const extras = [...(item.boxFlavors || []).map(f => `${f.name} × ${f.quantity}`), ...(item.selectedCustomizations || []).map(c => `${c.name} (+${amount(c.price)} per item)${c.text ? `: ${c.text}` : ''}`)];
    return { item, option, extras };
  });
  const subtotal = orderSubtotal(order);
  const summary = [['Items subtotal', amount(subtotal)], ['Delivery', amount(order.deliveryFee ?? 0)], ['Discount', `− ${amount(order.discount ?? 0)}${order.promoCode ? ` (${order.promoCode})` : ''}`], ['Total', amount(order.total)]];
  const text = [`The Cookie Concept · Order ${order.id}`, orderDate(order), `Source: ${order.source || 'web'}`, ...details.map(([key, value]) => `${key}: ${value}`), ...(map ? [`Map: ${map}`] : []), '', ...itemLines.flatMap(({ item, option, extras }) => [`${item.quantity} × ${item.name} (${option})`, `Unit price: ${amount(item.price)} · Line total: ${amount(item.price * item.quantity)}`, ...extras]), '', ...summary.map(([key, value]) => `${key}: ${value}`)].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#faf3ef;color:#492b22;font-family:Arial,sans-serif"><div style="max-width:640px;margin:24px auto;background:#fffbf8;border:1px solid #decdc3;border-radius:16px;overflow:hidden"><div style="padding:28px;background:#492b22;color:#faf3ef"><p style="margin:0 0 10px;font-size:12px">THE COOKIE CONCEPT · ${e(order.source || 'web')} ORDER</p><h1 style="margin:0;font:30px Georgia,serif">A little joy, ordered.</h1><p>${e(order.id)}<br>${e(orderDate(order))}</p></div><div style="padding:28px"><h2 style="font:24px Georgia,serif">Order details</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${details.map(([key, value]) => `<tr><th style="text-align:left;vertical-align:top;padding:8px 12px 8px 0;width:125px;border-bottom:1px solid #decdc3">${e(key)}</th><td style="padding:8px 0;overflow-wrap:anywhere;border-bottom:1px solid #decdc3;white-space:pre-wrap">${e(value)}</td></tr>`).join('')}</table>${map ? `<p><a href="${e(map)}" style="color:#a64d50">Open ${pickup ? 'pickup' : 'delivery'} location in Google Maps</a></p>` : ''}<h2 style="font:24px Georgia,serif;margin-top:30px">What to bake</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th align="left">Item / details</th><th align="right">Qty</th><th align="right">Line total</th></tr></thead><tbody>${itemLines.map(({ item, option, extras }) => `<tr><td style="padding:14px 12px 14px 0;border-bottom:1px solid #decdc3"><strong>${e(item.name)}</strong><br>${e(option)}<br><small>Unit price ${e(amount(item.price))}</small>${extras.map(extra => `<div style="margin-top:5px;color:#725749">${e(extra)}</div>`).join('')}</td><td align="right" style="vertical-align:top;padding-top:14px;border-bottom:1px solid #decdc3">${e(item.quantity)}</td><td align="right" style="vertical-align:top;padding-top:14px;white-space:nowrap;border-bottom:1px solid #decdc3">${e(amount(item.price * item.quantity))}</td></tr>`).join('')}</tbody></table><table style="margin:24px 0 0 auto;width:100%;max-width:330px;font-size:14px">${summary.map(([key, value]) => `<tr><th style="text-align:left;padding:7px 0">${e(key)}</th><td style="text-align:right;padding:7px 0">${e(value)}</td></tr>`).join('')}</table><p style="font-size:12px;color:#725749">Prices include selected extras. Payment selection does not confirm payment receipt.</p></div></div></body></html>`;
  return { subject: `${order.source === 'manual' ? 'Manual sale' : pickup ? 'Pickup order' : 'Delivery order'} · ${order.id}`, text, html };
}
