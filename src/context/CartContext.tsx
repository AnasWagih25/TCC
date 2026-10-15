'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultCategories } from '@/lib/catalog-defaults';
import { confirmWrite } from '@/lib/confirm-write';
import { reconcileProductEdit } from '@/lib/catalog-edit';
import { createOrderSubmitter, pendingCheckout, remainingCart } from '@/lib/order-client';
import { money, type CustomerInfo } from '@/lib/order-domain';
import { defaultPickupSettings, resolvePickupSettings, type PickupSettings } from '@/lib/pickup';
export { defaultPickupSettings, type PickupSettings } from '@/lib/pickup';

export type Category = {
  id: string;
  name: string;
  hasDescription: boolean;
  flavorType: 'none' | 'single' | 'array';
  sizeType: 'none' | 'normal_mini' | 'box_sizes';
  isBoxBuilder: boolean;
};

export type ProductPrice = {
  normal: number;
  mini: number;
};

export type Flavor = {
  name: string;
  image: string;
  price: number;
};

export type Product = {
  updatedAt?: string;
  id: string;
  name: string;
  description: string;
  price: ProductPrice;
  stock: number;
  image: string;
  images?: string[];
  type?: string;
  badge?: string;
  flavors?: Flavor[];
  boxSizes?: number[]; // Legacy, keeping for backwards compat if needed
  boxPricing?: { size: number; price: number }[];
  flavor?: string;
  customizations?: { 
    name: string; 
    price: number;
    pricing?: Record<string, number>; 
    requiresText?: boolean;
  }[];
};

/** Resolve an image string to a displayable URL */
export function resolveImageUrl(img: string): string {
  if (!img) return '/images/preview.png';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:') || img.startsWith('/')) {
    return img;
  }
  return `/images/${img}`;
}

export type BoxFlavorSelection = { name: string; quantity: number };

export type CartItem = Omit<Product, 'price'> & { 
  quantity: number; 
  selectedSize: 'Normal' | 'Mini'; 
  selectedFlavor?: string;
  boxSize?: number;
  boxFlavors?: BoxFlavorSelection[];
  selectedCustomizations?: { name: string; price: number; text?: string }[];
  price: number; 
};

export type PromoCode = {
  code: string;
  discountPercentage: number;
  maxCap: number;
  isActive: boolean;
};

export { parseGoogleMapsUrl } from '@/lib/maps';

export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as T;
  if (Array.isArray(obj)) return obj.map(item => cleanForFirestore(item)).filter(item => item !== undefined) as T;
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) if (value !== undefined) cleaned[key] = cleanForFirestore(value);
    return cleaned as T;
  }
  return obj;
}

function cachedValue<T>(kind: 'localStorage' | 'sessionStorage', key: string, fallback: T): T {
  try { const raw = window[kind].getItem(key); if (raw === null) return fallback; const value = JSON.parse(raw); if (Array.isArray(fallback) && !Array.isArray(value)) return fallback; if (typeof fallback === 'boolean' && typeof value !== 'boolean') return fallback; if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && (!value || typeof value !== 'object' || Array.isArray(value))) return fallback; return value as T; } catch { return fallback; }
}

export type Order = {
  id: string;
  date: string;
  source?: 'web' | 'manual';
  deliveryMethod?: 'delivery' | 'pickup';
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    location?: { lat: number; lng: number };
  };
  items: CartItem[];
  total: number;
  deliveryFee?: number;
  discount?: number;
  subtotal?: number;
  promoCode?: string;
  paymentMethod?: 'cash' | 'instapay' | 'telda';
  paymentStatus?: 'unpaid' | 'paid';
  pickupSnapshot?: PickupSettings;
  email?: { status: 'pending' | 'sending' | 'sent' | 'failed'; attempts?: number; lastError?: string; sentAt?: string; messageId?: string };
  status: 'pending' | 'fulfilled';
};

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Classic Belgian Milk Chocolate', description: 'Our signature cookie cake loaded with Belgian milk chocolate chunks.', price: { normal: 399, mini: 250 }, stock: 50, image: 'classic1.png', images: ['classic1.png'] },
  { id: 'p2', name: 'Double Chocolate', description: 'For the ultimate chocolate lover. Dark cocoa dough with semi-sweet chocolate.', price: { normal: 399, mini: 250 }, stock: 40, image: 'double.png', images: ['double.png'] },
  { id: 'p3', name: 'Kinder Chocolate', description: 'Rich dough packed with Kinder chocolate bars and a creamy center.', price: { normal: 499, mini: 300 }, stock: 35, image: 'kinder 1.png', images: ['kinder 1.png'] }
];

type CartContextType = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  heroImage: string;
  heroRotationEnabled: boolean;
  addToCart: (productId: string, size: 'Normal' | 'Mini', flavorName?: string, selectedCustomizations?: { name: string; price: number; text?: string }[]) => { success: boolean; message: string };
  addBoxToCart: (productId: string, boxSize: number, selections: BoxFlavorSelection[], selectedCustomizations?: { name: string; price: number; text?: string }[]) => { success: boolean; message: string };
  updateQuantity: (index: number, change: number) => { success: boolean; message: string };
  removeFromCart: (index: number) => void;
  placeOrder: (customerInfo: CustomerInfo, deliveryFee?: number, discount?: number, deliveryMethod?: 'delivery' | 'pickup', promoCode?: string, paymentMethod?: 'cash' | 'instapay' | 'telda') => Promise<Order>;
  updateProduct: (product: Product, original?: Pick<Product, 'stock' | 'updatedAt'>) => Promise<void>;
  deleteProduct: (index: number) => Promise<void>;
  updateHeroImage: (url: string, animated?: boolean) => Promise<void>;
  updateHeroRotation: (enabled: boolean) => Promise<void>;
  retryPendingOrder: () => Promise<Order>;
  promoSettings: PromoCode | null;
  updatePromoSettings: (promo: PromoCode) => Promise<void>;
  pickupSettings: PickupSettings;
  updatePickupSettings: (settings: PickupSettings) => Promise<void>;
  categories: Category[];
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroImage, setHeroImage] = useState('/images/preview.png');
  const [heroRotationEnabled, setHeroRotationEnabled] = useState(true);
  const [promoSettings, setPromoSettings] = useState<PromoCode | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickupSettings, setPickupSettings] = useState<PickupSettings>(defaultPickupSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Restore external browser storage without letting a corrupt cache break checkout.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration synchronizes external browser storage once.
    setCart(cachedValue<CartItem[]>('localStorage', 'tcc_cart', []).filter(item => item && typeof item.id === 'string' && Number.isFinite(item.price) && Number.isInteger(item.quantity) && item.quantity > 0));
    setOrders(cachedValue<Order[]>('sessionStorage', 'tcc_customer_orders_v2', []).filter(order => order && typeof order.id === 'string'));
    setProducts(cachedValue<Product[]>('localStorage', 'tcc_products', defaultProducts).filter(product => product && typeof product.id === 'string' && typeof product.name === 'string' && product.price && Number.isFinite(product.stock)));
    setCategories(cachedValue<Category[]>('localStorage', 'tcc_categories', defaultCategories).filter(category => category && typeof category.id === 'string' && typeof category.name === 'string'));
    try { const hero = localStorage.getItem('tcc_hero_image'); if (hero) setHeroImage(hero); } catch { /* Storage is optional. */ }
    setHeroRotationEnabled(cachedValue('localStorage', 'tcc_hero_rotation', true));
    setPickupSettings(resolvePickupSettings(cachedValue('localStorage', 'tcc_pickup_settings', defaultPickupSettings)));
    setIsLoaded(true);

    // Independent live subscriptions prevent one failed settings read from hiding catalog data.
    const report = (error: unknown) => console.error('Store data could not be refreshed:', error);
    const unsubscribers = [
      onSnapshot(collection(db, 'products'), snapshot => {
        if (snapshot.metadata.fromCache && snapshot.empty) return;
        setProducts(snapshot.docs.map(document => {
          const value = document.data() as Product;
          return { ...value, id: document.id, type: value.type || (value.boxPricing?.length ? 'item' : value.price?.mini > 0 ? 'cake' : 'cookie') };
        }).filter(product => product.price && typeof product.name === 'string' && Number.isFinite(product.stock)));
      }, report),
      onSnapshot(collection(db, 'categories'), snapshot => {
        if (snapshot.metadata.fromCache && snapshot.empty) return;
        setCategories(snapshot.docs.map(document => ({ ...document.data(), id: document.id }) as Category));
      }, report),
      onSnapshot(doc(db, 'settings', 'homepage'), snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (typeof data.heroImage === 'string' && data.heroImage.trim()) {
          setHeroImage(data.heroImage);
          try { localStorage.setItem('tcc_hero_image', data.heroImage); } catch { /* Cache is optional. */ }
        }
        if (typeof data.heroRotationEnabled === 'boolean') setHeroRotationEnabled(data.heroRotationEnabled);
      }, report),
      onSnapshot(doc(db, 'settings', 'promo'), snapshot => setPromoSettings(snapshot.exists() ? snapshot.data() as PromoCode : null), report),
      onSnapshot(doc(db, 'settings', 'pickup'), snapshot => {
        if (!snapshot.exists()) return;
        const value = resolvePickupSettings(snapshot.data() as PickupSettings);
        setPickupSettings(value);
        try { localStorage.setItem('tcc_pickup_settings', JSON.stringify(value)); } catch { /* Cache is optional. */ }
      }, report),
    ];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tcc_cart', JSON.stringify(cart));
      } catch (e) {
        console.error(e);
      }
    }
  }, [cart, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tcc_products', JSON.stringify(products));
      } catch (e) {
        console.error(e);
      }
    }
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tcc_categories', JSON.stringify(categories));
      } catch (e) {
        console.error(e);
      }
    }
  }, [categories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem('tcc_customer_orders_v2', JSON.stringify(orders.slice(0, 10)));
      } catch (e) {
        console.error(e);
      }
    }
  }, [orders, isLoaded]);

  const addToCart = (productId: string, size: 'Normal' | 'Mini', flavorName?: string, selectedCustomizations?: { name: string; price: number; text?: string }[]) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return { success: false, message: 'Out of stock' };

    if (cart.filter(item => item.id === productId).reduce((sum, item) => sum + item.quantity, 0) >= product.stock) return { success: false, message: `Only ${product.stock} available across all sizes and options.` };

    const isCookieItem = product.type === 'item';
    let selectedPrice: number;
    let cartFlavor: string | undefined;

    if (isCookieItem && flavorName && product.flavors) {
      const flavor = product.flavors.find(f => f.name === flavorName);
      if (!flavor) return { success: false, message: 'Flavor not found' };
      selectedPrice = flavor.price;
      cartFlavor = flavorName;
    } else {
      selectedPrice = size === 'Normal' ? product.price.normal : product.price.mini;
    }

    if (selectedCustomizations) {
      selectedCustomizations.forEach(c => selectedPrice += c.price);
    }

    const stringifyCustomizations = (custs?: { name: string; price: number }[]) => {
      if (!custs || custs.length === 0) return '';
      return JSON.stringify([...custs].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const existingIndex = cart.findIndex(item => 
      item.id === productId && item.selectedSize === size && item.selectedFlavor === cartFlavor &&
      stringifyCustomizations(item.selectedCustomizations) === stringifyCustomizations(selectedCustomizations)
    );
    
    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity >= product.stock) {
        return { success: false, message: `Cannot add more. Only ${product.stock} in stock.` };
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      const { price: catalogPrice, ...productWithoutPrice } = product;
    void catalogPrice;
      setCart([...cart, { ...productWithoutPrice, selectedSize: size, selectedFlavor: cartFlavor, selectedCustomizations, price: selectedPrice, quantity: 1 }]);
    }
    
    return { success: true, message: `Added ${product.name}${cartFlavor ? ` (${cartFlavor})` : ''} to cart` };
  };

  const addBoxToCart = (productId: string, boxSize: number, selections: BoxFlavorSelection[], selectedCustomizations?: { name: string; price: number; text?: string }[]) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return { success: false, message: 'Out of stock' };
    if (!product.flavors) return { success: false, message: 'No flavors available' };
    if (cart.filter(item => item.id === productId).reduce((sum, item) => sum + item.quantity, 0) >= product.stock) return { success: false, message: `Only ${product.stock} boxes available.` };

    const totalCookies = selections.reduce((sum, s) => sum + s.quantity, 0);
    if (totalCookies !== boxSize) return { success: false, message: `Please select exactly ${boxSize} cookies` };

    // Calculate total price from boxPricing + any flavor surcharges
    let totalPrice = 0;
    if (product.boxPricing && product.boxPricing.length > 0) {
      const boxOption = product.boxPricing.find(bp => bp.size === boxSize);
      if (boxOption) {
        totalPrice = boxOption.price;
      }
    }
    
    // Add flavor surcharges (if any)
    for (const sel of selections) {
      const flavor = product.flavors.find(f => f.name === sel.name);
      if (!flavor) return { success: false, message: `Flavor "${sel.name}" not found` };
      totalPrice += (flavor.price || 0) * sel.quantity;
    }

    if (selectedCustomizations) {
      selectedCustomizations.forEach(c => totalPrice += c.price);
    }

    const { price: catalogPrice, ...productWithoutPrice } = product;
    void catalogPrice;
    const boxItem: CartItem = {
      ...productWithoutPrice,
      selectedSize: 'Normal',
      boxSize,
      boxFlavors: selections.filter(s => s.quantity > 0),
      selectedCustomizations,
      price: totalPrice,
      quantity: 1,
    };
    setCart(prev => [...prev, boxItem]);
    return { success: true, message: `Added ${product.name} (Box of ${boxSize}) to cart` };
  };

  const updateQuantity = (index: number, change: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const product = products.find(p => p.id === item.id);
    
    if (!product) return { success: false, message: 'Product not found' };

    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
      removeFromCart(index);
      return { success: true, message: 'Item removed' };
    }
    
    if (newQty + cart.filter((other, i) => i !== index && other.id === item.id).reduce((sum, other) => sum + other.quantity, 0) > product.stock) {
      return { success: false, message: `Sorry, we only have ${product.stock} left in stock.` };
    }

    newCart[index].quantity = newQty;
    setCart(newCart);
    return { success: true, message: 'Cart updated' };
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const submitOrderRef = useRef<ReturnType<typeof createOrderSubmitter> | null>(null);
  const placeOrder = async (customerInfo: CustomerInfo, deliveryFee = 70, discount = 0, deliveryMethod: 'delivery' | 'pickup' = 'delivery', promoCode = '', paymentMethod: 'cash' | 'instapay' | 'telda' = 'cash') => {
    if (!cart.length) throw new Error('Your bag is empty.');
    if (!submitOrderRef.current) {
      let storage: Storage | null = null;
      try { storage = sessionStorage; } catch { /* The active tab can still submit. */ }
      submitOrderRef.current = createOrderSubmitter(storage);
    }
    const expectedTotal = money(money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)) + (deliveryMethod === 'pickup' ? 0 : deliveryFee) - money(discount));
    const order = await submitOrderRef.current({
      customer: customerInfo, deliveryMethod, paymentMethod, promoCode, expectedTotal,
      items: cart.map(item => ({ id: item.id, quantity: item.quantity, selectedSize: item.selectedSize, price: item.price, ...(item.selectedFlavor ? { selectedFlavor: item.selectedFlavor } : {}), ...(item.boxSize ? { boxSize: item.boxSize, boxFlavors: item.boxFlavors } : {}), selectedCustomizations: item.selectedCustomizations || [] })),
    });
    setOrders(current => [order, ...current.filter(item => item.id !== order.id)]);
    setCart(current => remainingCart(current, order.items));
    return order;
  };

  const retryPendingOrder = async () => {
    let storage: Storage | null = null;
    try { storage = sessionStorage; } catch { /* No recovery cache. */ }
    const prepared = pendingCheckout(storage);
    if (!prepared) throw new Error('There is no previous submission to check.');
    if (!submitOrderRef.current) submitOrderRef.current = createOrderSubmitter(storage);
    const { requestId: _id, receiptToken: _token, ...input } = prepared;
    void _id; void _token;
    const order = await submitOrderRef.current(input);
    setOrders(current => [order, ...current.filter(item => item.id !== order.id)]);
    setCart(current => remainingCart(current, order.items));
    return order;
  };

  const updateProduct = async (product: Product, original?: Pick<Product, 'stock' | 'updatedAt'>) => {
    const reference = doc(db, 'products', product.id);
    await confirmWrite(runTransaction(db, async transaction => {
      const current = await transaction.get(reference);
      const value = reconcileProductEdit(current.exists() ? current.data() as Product : null, product, original);
      transaction.set(reference, cleanForFirestore(value));
      return value;
    }));
  };

  const deleteProduct = async (index: number) => {
    const product = products[index];
    if (!product) return;
    await confirmWrite(deleteDoc(doc(db, 'products', product.id)));
    setProducts(prev => prev.filter(p => p.id !== product.id));
  };

  const updateHeroImage = async (url: string, animated?: boolean) => {
    await confirmWrite(setDoc(doc(db, 'settings', 'homepage'), { heroImage: url, ...(animated === undefined ? {} : { heroRotationEnabled: animated }) }, { merge: true }));
    if (animated !== undefined) setHeroRotationEnabled(animated);
    setHeroImage(url);
    try { localStorage.setItem('tcc_hero_image', url); } catch { /* Cache is optional. */ }
  };

  const updateHeroRotation = async (enabled: boolean) => {
    await confirmWrite(setDoc(doc(db, 'settings', 'homepage'), { heroRotationEnabled: enabled }, { merge: true }));
    setHeroRotationEnabled(enabled);
    try { localStorage.setItem('tcc_hero_rotation', JSON.stringify(enabled)); } catch { /* Cache is optional. */ }
  };

  const updatePromoSettings = async (promo: PromoCode) => {
    await confirmWrite(setDoc(doc(db, 'settings', 'promo'), cleanForFirestore(promo)));
    setPromoSettings(promo);
  };

  const updatePickupSettings = async (settings: PickupSettings) => {
    await confirmWrite(setDoc(doc(db, 'settings', 'pickup'), cleanForFirestore(settings)));
    setPickupSettings(settings);
    try { localStorage.setItem('tcc_pickup_settings', JSON.stringify(settings)); } catch { /* Cache is optional. */ }
  };

  const addCategory = async (category: Category) => {
    await confirmWrite(setDoc(doc(db, 'categories', category.id), cleanForFirestore(category)));
    setCategories(prev => prev.some(item => item.id === category.id) ? prev : [...prev, category]);
  };

  const updateCategory = async (category: Category) => {
    await confirmWrite(setDoc(doc(db, 'categories', category.id), cleanForFirestore(category)));
    setCategories(prev => prev.map(c => c.id === category.id ? category : c));
  };

  const deleteCategory = async (id: string) => {
    await confirmWrite(deleteDoc(doc(db, 'categories', id)));
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  if (!isLoaded) return <div style={{ height: '100vh', background: '#FDE8EC' }}></div>;

  return (
    <CartContext.Provider value={{
      products, cart, orders, heroImage, heroRotationEnabled, promoSettings, categories, pickupSettings,
      addToCart, addBoxToCart, updateQuantity, removeFromCart, placeOrder,
      updateProduct, deleteProduct, updateHeroImage, updateHeroRotation, retryPendingOrder, updatePromoSettings, updatePickupSettings,
      addCategory, updateCategory, deleteCategory
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
