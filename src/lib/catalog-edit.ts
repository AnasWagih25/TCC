import type { Product } from '@/context/CartContext';
export function reconcileProductEdit(current: Product | null, draft: Product, original?: Pick<Product, 'stock' | 'updatedAt'>): Product {
  if (current && !original) throw new Error('A product already uses this ID. Reopen the product and try again.');
  if (!current && original) throw new Error('This product was removed while you were editing.');
  if (current && original) {
    if ((current.updatedAt || '') !== (original.updatedAt || '')) throw new Error('This product changed while you were editing. Reopen it to review the latest version.');
    const stockEdited = draft.stock !== original.stock;
    if (stockEdited && current.stock !== original.stock) throw new Error('Stock changed while you were editing. Reopen this product before changing its stock.');
    return { ...draft, stock: stockEdited ? draft.stock : current.stock, updatedAt: new Date().toISOString() };
  }
  return { ...draft, updatedAt: new Date().toISOString() };
}
