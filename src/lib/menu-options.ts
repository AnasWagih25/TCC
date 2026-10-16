import type { Product } from '@/context/CartContext';

export function selectedExtras(product: Product, size: string, selected: Record<string, boolean>, texts: Record<string, string>) {
  return (product.customizations || []).filter(extra => selected[extra.name]).map(extra => ({
    name: extra.name,
    price: extra.pricing?.[size] ?? extra.price,
    ...(extra.requiresText ? { text: (texts[extra.name] || '').trim() } : {}),
  }));
}

export function missingExtraText(product: Product, selected: Record<string, boolean>, texts: Record<string, string>) {
  return (product.customizations || []).some(extra => selected[extra.name] && extra.requiresText && !(texts[extra.name] || '').trim());
}

export function boxPrice(product: Product, size: number | null, selections: Record<string, number>, extras: { price: number }[]) {
  const base = product.boxPricing?.find(option => option.size === size)?.price ?? 0;
  const flavors = (product.flavors || []).reduce((sum, flavor) => sum + flavor.price * (selections[flavor.name] || 0), 0);
  const additions = extras.reduce((sum, extra) => sum + extra.price, 0);
  return { base, flavors, additions, total: Math.round((base + flavors + additions) * 100) / 100 };
}
