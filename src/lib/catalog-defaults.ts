import type { Category } from '@/context/CartContext';
export const defaultCategories: Category[] = [
  { id: 'cookie', name: 'Cookie', hasDescription: false, flavorType: 'single', sizeType: 'none', isBoxBuilder: false },
  { id: 'cake', name: 'Cookie Cake', hasDescription: true, flavorType: 'none', sizeType: 'normal_mini', isBoxBuilder: false },
  { id: 'item', name: 'Cookie Boxes', hasDescription: true, flavorType: 'array', sizeType: 'box_sizes', isBoxBuilder: true },
];
