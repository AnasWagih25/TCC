import type { CartItem, Category, Order, Product, PromoCode } from '@/context/CartContext';
import type { PickupSettings } from './pickup';
import type { CheckoutPayment } from './payment-types';

export class OrderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type CustomerInfo = Order['customer'];
export type OrderSelection = Pick<CartItem, 'id' | 'quantity' | 'selectedSize' | 'selectedFlavor' | 'boxSize' | 'boxFlavors' | 'selectedCustomizations'> & { price?: number };
export type CheckoutRequest = {
  requestId: string;
  receiptToken: string;
  customer: CustomerInfo;
  items: OrderSelection[];
  deliveryMethod: 'delivery' | 'pickup';
  paymentMethod: 'cash' | 'instapay';
  payment: CheckoutPayment;
  promoCode: string;
  expectedTotal: number;
};
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const validNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function quantity(value: unknown, label: string, max = 100) {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > max) throw new OrderError(`Choose a valid ${label}.`);
  return Number(value);
}
function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new OrderError(`Check ${label}.`);
  return value.trim();
}
export function validateCheckout(value: unknown): CheckoutRequest {
  if (!value || typeof value !== 'object') throw new OrderError('Invalid order request.');
  const data = value as CheckoutRequest;
  if (!/^[a-f0-9-]{36}$/i.test(data.requestId || '') || !/^[a-f0-9-]{36}$/i.test(data.receiptToken || '')) throw new OrderError('Invalid order reference.');
  if (!['delivery', 'pickup'].includes(data.deliveryMethod)) throw new OrderError('Choose a delivery option.');
  const payment = data.payment;
  if (!payment || typeof payment !== 'object' || Array.isArray(payment) || !['deposit', 'full'].includes(payment.plan) || !['cash', 'instapay'].includes(payment.remainingMethod)) throw new OrderError('Choose a 50% InstaPay deposit or full InstaPay payment.');
  if (typeof payment.proofToken !== 'string' || !payment.proofToken.trim() || payment.proofToken.length > 8192) throw new OrderError('Upload and check your InstaPay payment screenshot before placing your order.');
  if (data.paymentMethod !== undefined && !['cash', 'instapay'].includes(data.paymentMethod)) throw new OrderError('Choose cash or InstaPay for your remaining balance.');
  const remainingMethod = payment.plan === 'full' ? 'instapay' : payment.remainingMethod;
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 40) throw new OrderError('Your bag must contain between 1 and 40 selections.');
  for (const item of data.items) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,120}$/.test(item.id)) throw new OrderError('Invalid product.');
    quantity(item.quantity, 'quantity');
    if (!['Normal', 'Mini'].includes(item.selectedSize)) throw new OrderError('Choose a product size.');
    if (item.boxFlavors && (!Array.isArray(item.boxFlavors) || item.boxFlavors.length > 50)) throw new OrderError('Invalid box selections.');
    if (item.selectedCustomizations && (!Array.isArray(item.selectedCustomizations) || item.selectedCustomizations.length > 30)) throw new OrderError('Invalid extras.');
  }
  const customer = data.customer;
  if (!customer || typeof customer !== 'object') throw new OrderError('Add your contact details.');
  const name = text(customer.name, 'your name', 100);
  const phone = text(customer.phone, 'your phone number', 30);
  if (!/^[+\d\s()-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) throw new OrderError('Check your phone number.');
  const email = text(customer.email, 'your email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OrderError('Check your email address.');
  const notes = text(customer.notes ?? '', 'your notes', 2000, false);
  const address = text(customer.address ?? '', 'your address', 500, data.deliveryMethod === 'delivery');
  if (data.deliveryMethod === 'delivery') {
    const pin = customer.location;
    if (!pin || !validNumber(pin.lat) || !validNumber(pin.lng) || Math.abs(pin.lat) > 90 || Math.abs(pin.lng) > 180) throw new OrderError('Pin your delivery address on the map.');
  }
  if (!validNumber(data.expectedTotal) || data.expectedTotal < 0) throw new OrderError('Invalid order total.');
  return { ...data, paymentMethod: remainingMethod, payment: { plan: payment.plan, remainingMethod, proofToken: payment.proofToken }, customer: { name, phone, email, notes, address, ...(customer.location ? { location: customer.location } : {}) }, promoCode: text(data.promoCode ?? '', 'your promo code', 60, false).toUpperCase() };
}

export function deliveryPrice(location: {lat: number; lng: number}, origin: {lat: number; lng: number}) {
  const radians = (n: number) => n * Math.PI / 180;
  const a = Math.sin(radians(location.lat - origin.lat) / 2) ** 2 + Math.cos(radians(origin.lat)) * Math.cos(radians(location.lat)) * Math.sin(radians(location.lng - origin.lng) / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (distance > 65) throw new OrderError('This address is outside our delivery area.');
  return distance <= 14 ? 70 : distance <= 25 ? 80 : distance <= 36 ? 90 : 100;
}

export function priceOrder(request: CheckoutRequest, products: Product[], categories: Category[], promo: PromoCode | null, pickup: PickupSettings) {
  const quantities = new Map<string, number>();
  const items: CartItem[] = request.items.map(selection => {
    const product = products.find(item => item.id === selection.id);
    if (!product) throw new OrderError('A product in your bag is no longer available.', 409);
    if (!product.price || !validNumber(product.price.normal) || !validNumber(product.price.mini)) throw new OrderError('A product needs its prices updated before ordering.', 409);
    const category = categories.find(item => item.id === product.type);
    const count = quantity(selection.quantity, 'quantity');
    quantities.set(product.id, (quantities.get(product.id) || 0) + count);
    let price = 0;
    const extras: CartItem['selectedCustomizations'] = [];
    let boxFlavors: CartItem['boxFlavors'];
    if (category?.isBoxBuilder || selection.boxSize) {
      if (!category?.isBoxBuilder) throw new OrderError('This product is not a cookie box.');
      const box = product.boxPricing?.find(item => item.size === selection.boxSize);
      if (!box || box.price <= 0) throw new OrderError('This box size is no longer available.', 409);
      price = box.price;
      const seen = new Set<string>();
      boxFlavors = (selection.boxFlavors || []).map(flavor => {
        const available = product.flavors?.find(item => item.name === flavor.name);
        if (!available || seen.has(flavor.name)) throw new OrderError('Check your box flavors.');
        seen.add(flavor.name);
        const amount = quantity(flavor.quantity, 'flavor quantity');
        price += available.price * amount;
        return { name: available.name, quantity: amount };
      });
      if (boxFlavors.reduce((sum, flavor) => sum + flavor.quantity, 0) !== box.size) throw new OrderError(`Choose exactly ${box.size} cookies for your box.`);
    } else if (selection.selectedFlavor) {
      const flavor = product.flavors?.find(item => item.name === selection.selectedFlavor);
      if (!flavor) throw new OrderError('This flavor is no longer available.', 409);
      price = flavor.price;
    } else {
      if (selection.selectedSize === 'Mini' && category?.sizeType !== 'normal_mini' && product.price.mini <= 0) throw new OrderError('This size is unavailable.');
      price = selection.selectedSize === 'Mini' ? product.price.mini : product.price.normal;
    }
    const extraNames = new Set<string>();
    for (const selected of selection.selectedCustomizations || []) {
      const extra = product.customizations?.find(item => item.name === selected.name);
      if (!extra || extraNames.has(extra.name)) throw new OrderError('Check the extras in your bag.');
      extraNames.add(extra.name);
      const cost = extra.pricing?.[selection.boxSize ? String(selection.boxSize) : selection.selectedSize] ?? extra.price;
      if (!validNumber(cost) || cost < 0) throw new OrderError('An extra is temporarily unavailable.', 409);
      const message = text(selected.text ?? '', `the text for ${extra.name}`, 500, Boolean(extra.requiresText));
      extras.push({ name: extra.name, price: cost, ...(message ? { text: message } : {}) });
      price += cost;
    }
    if (!validNumber(price) || price <= 0) throw new OrderError('This product is temporarily unavailable.', 409);
    if (validNumber(selection.price) && Math.abs(money(price) - selection.price) > 0.01) throw new OrderError('A price changed. Refresh your bag before placing your order.', 409);
    return { id: product.id, name: product.name, description: product.description || '', image: product.image || '', stock: product.stock, selectedSize: selection.selectedSize, quantity: count, price: money(price), ...(selection.selectedFlavor ? { selectedFlavor: selection.selectedFlavor } : {}), ...(selection.boxSize ? { boxSize: selection.boxSize, boxFlavors } : {}), selectedCustomizations: extras };
  });
  for (const [id, count] of quantities) {
    const product = products.find(item => item.id === id)!;
    if (!Number.isInteger(product.stock) || product.stock < count) throw new OrderError(`Only ${Math.max(0, product.stock || 0)} ${product.name} remain. Update your bag.`, 409);
  }
  const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const deliveryFee = request.deliveryMethod === 'pickup' ? 0 : deliveryPrice(request.customer.location!, pickup);
  let discount = 0;
  if (request.promoCode === 'QUIRK') discount = money(subtotal * 0.05);
  else if (request.promoCode) {
    if (!promo?.isActive || typeof promo.code !== 'string' || promo.code.toUpperCase() !== request.promoCode || !validNumber(promo.discountPercentage) || promo.discountPercentage < 0 || promo.discountPercentage > 100 || !validNumber(promo.maxCap) || promo.maxCap < 0) throw new OrderError('This promo code is no longer available.');
    discount = money(subtotal * promo.discountPercentage / 100);
    if (promo.maxCap > 0) discount = Math.min(discount, promo.maxCap);
  }
  discount = Math.min(subtotal, money(discount));
  const total = money(subtotal + deliveryFee - discount);
  if (Math.abs(total - request.expectedTotal) > 0.01) throw new OrderError('Your total changed. Refresh the page and review your bag before ordering.', 409);
  return { items, quantities, subtotal, deliveryFee, discount, total };
}

export function orderMapUrl(order: Order) {
  const pin = order.customer?.location;
  return pin && validNumber(pin.lat) && validNumber(pin.lng) && Math.abs(pin.lat) <= 90 && Math.abs(pin.lng) <= 180 ? `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}` : null;
}
export function orderSubtotal(order: Order) {
  return money((order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
}
export function orderDate(order: Order) {
  return Number.isFinite(Date.parse(order.date)) ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(order.date)) : 'Date unavailable';
}
