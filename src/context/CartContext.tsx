'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  id: string;
  name: string;
  description: string;
  price: ProductPrice;
  stock: number;
  image: string;
  images?: string[];
  type?: 'cake' | 'item' | 'cookie';
  flavors?: Flavor[];
  boxSizes?: number[]; // Legacy, keeping for backwards compat if needed
  boxPricing?: { size: number; price: number }[];
  flavor?: string;
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
  price: number; 
};

export type PromoCode = {
  code: string;
  discountPercentage: number;
  maxCap: number;
  isActive: boolean;
};

export type Order = {
  id: string;
  date: string;
  source?: 'web' | 'manual';
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
  addToCart: (productId: string, size: 'Normal' | 'Mini', flavorName?: string) => { success: boolean; message: string };
  addBoxToCart: (productId: string, boxSize: number, selections: BoxFlavorSelection[]) => { success: boolean; message: string };
  updateQuantity: (index: number, change: number) => { success: boolean; message: string };
  removeFromCart: (index: number) => void;
  placeOrder: (customerInfo: any, deliveryFee?: number, discount?: number) => Promise<Order>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (index: number) => Promise<void>;
  updateHeroImage: (url: string) => Promise<void>;
  markOrderFulfilled: (index: number) => void;
  addManualOrder: (data: { customerName: string; total: number; productId: string; quantity: number; notes?: string }) => string;
  deleteOrder: (orderId: string) => void;
  promoSettings: PromoCode | null;
  updatePromoSettings: (promo: PromoCode) => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroImage, setHeroImage] = useState<string>('/images/preview.png');
  const [promoSettings, setPromoSettings] = useState<PromoCode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Immediately load local data to unblock the app (Hydration)
    const savedCart = localStorage.getItem('tcc_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    
    const savedOrders = localStorage.getItem('tcc_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const savedProducts = localStorage.getItem('tcc_products');
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    else setProducts(defaultProducts);

    // Load cached hero image if available
    const savedHero = localStorage.getItem('tcc_hero_image');
    if (savedHero) setHeroImage(savedHero);

    // Unblock the UI immediately!
    setIsLoaded(true);

    // 2. Fetch live global data from Firestore in the background
    const fetchGlobalData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        let liveProducts: Product[] = [];
        
        if (!productsSnap.empty) {
          productsSnap.forEach(document => {
            liveProducts.push(document.data() as Product);
          });
          // Always overwrite with Firestore data — this is the source of truth
          setProducts(liveProducts);
          // Update localStorage immediately so next load has fresh data
          try { localStorage.setItem('tcc_products', JSON.stringify(liveProducts)); } catch (e) {}
        } else {
          // If Firestore is completely empty, upload default products
          for (const p of defaultProducts) {
            await setDoc(doc(db, 'products', p.id), p).catch(() => {});
          }
        }

        // Fetch orders from Firestore
        try {
          const ordersSnap = await getDocs(collection(db, 'orders'));
          if (!ordersSnap.empty) {
            const liveOrders: Order[] = [];
            ordersSnap.forEach(document => {
              liveOrders.push(document.data() as Order);
            });
            // Sort by date descending (newest first)
            liveOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setOrders(liveOrders);
          }
        } catch (ordersErr) {
          console.error('Failed to fetch orders from Firestore:', ordersErr);
        }

        // Fetch hero image from Firestore
        const heroSnap = await getDoc(doc(db, 'settings', 'homepage'));
        if (heroSnap.exists()) {
          const heroUrl = heroSnap.data().heroImage;
          setHeroImage(heroUrl);
          // Cache hero image in localStorage
          try { localStorage.setItem('tcc_hero_image', heroUrl); } catch (e) {}
        }

        // Fetch promo settings
        const promoSnap = await getDoc(doc(db, 'settings', 'promo'));
        if (promoSnap.exists()) {
          setPromoSettings(promoSnap.data() as PromoCode);
        }
      } catch (err) {
        console.error('Failed to connect to Firestore. Ensure Firestore Database is created in your Firebase Console.', err);
      }
    };

    fetchGlobalData();
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
        localStorage.setItem('tcc_orders', JSON.stringify(orders));
      } catch (e) {
        console.error(e);
      }
    }
  }, [orders, isLoaded]);

  const addToCart = (productId: string, size: 'Normal' | 'Mini', flavorName?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return { success: false, message: 'Out of stock' };

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

    const existingIndex = cart.findIndex(item => 
      item.id === productId && item.selectedSize === size && item.selectedFlavor === cartFlavor
    );
    
    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity >= product.stock) {
        return { success: false, message: `Cannot add more. Only ${product.stock} in stock.` };
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      const { price, ...productWithoutPrice } = product;
      setCart([...cart, { ...productWithoutPrice, selectedSize: size, selectedFlavor: cartFlavor, price: selectedPrice, quantity: 1 }]);
    }
    
    return { success: true, message: `Added ${product.name}${cartFlavor ? ` (${cartFlavor})` : ''} to cart` };
  };

  const addBoxToCart = (productId: string, boxSize: number, selections: BoxFlavorSelection[]) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return { success: false, message: 'Out of stock' };
    if (!product.flavors) return { success: false, message: 'No flavors available' };

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

    const { price, ...productWithoutPrice } = product;
    const boxItem: CartItem = {
      ...productWithoutPrice,
      selectedSize: 'Normal',
      boxSize,
      boxFlavors: selections.filter(s => s.quantity > 0),
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
    
    if (newQty > product.stock) {
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

  const placeOrder = async (customerInfo: any, deliveryFee: number = 70, discount: number = 0) => {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price * item.quantity);
    const total = subtotal + deliveryFee - discount;

    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      source: 'web',
      customer: customerInfo,
      items: [...cart],
      total: total,
      deliveryFee: deliveryFee,
      discount: discount,
      status: 'pending'
    };

    // Save order to Firestore
    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);

      // Update Stock
      const updatedProducts = [...products];
      for (const cartItem of cart) {
        const pIndex = updatedProducts.findIndex(p => p.id === cartItem.id);
        if (pIndex !== -1) {
          updatedProducts[pIndex].stock = Math.max(0, updatedProducts[pIndex].stock - cartItem.quantity);
          // Sync new stock to Firestore
          await setDoc(doc(db, 'products', updatedProducts[pIndex].id), updatedProducts[pIndex]);
        }
      }
      setProducts(updatedProducts);
    } catch(err) {
      console.error('Failed to save order to firestore', err);
    }

    setOrders([newOrder, ...orders]);
    setCart([]);
    
    return newOrder;
  };

  const updateProduct = async (product: Product) => {
    await setDoc(doc(db, 'products', product.id), product);
    setProducts(prev => {
      const index = prev.findIndex(p => p.id === product.id);
      if (index >= 0) {
        const newProducts = [...prev];
        newProducts[index] = product;
        return newProducts;
      } else {
        return [...prev, product];
      }
    });
  };

  const deleteProduct = async (index: number) => {
    const product = products[index];
    if (!product) return;
    await deleteDoc(doc(db, 'products', product.id));
    setProducts(prev => prev.filter(p => p.id !== product.id));
  };

  const updateHeroImage = async (url: string) => {
    await setDoc(doc(db, 'settings', 'homepage'), { heroImage: url }, { merge: true });
    setHeroImage(url);
    try { localStorage.setItem('tcc_hero_image', url); } catch (e) {}
  };

  const updatePromoSettings = async (promo: PromoCode) => {
    await setDoc(doc(db, 'settings', 'promo'), promo);
    setPromoSettings(promo);
  };

  const markOrderFulfilled = (index: number) => {
    const newOrders = [...orders];
    newOrders[index].status = 'fulfilled';
    setOrders(newOrders);
    // Sync to Firestore
    setDoc(doc(db, 'orders', newOrders[index].id), newOrders[index]).catch(console.error);
  };

  const addManualOrder = (data: { customerName: string; total: number; productId: string; quantity: number; notes?: string }) => {
    const orderId = 'MAN-' + Math.floor(100000 + Math.random() * 900000);
    const selectedProduct = products.find(p => p.id === data.productId);
    const itemPrice = data.quantity > 0 ? data.total / data.quantity : data.total;

    const manualOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      source: 'manual',
      customer: {
        name: data.customerName.trim() || 'Walk-in Customer',
        phone: '-',
        email: 'manual-order@offline.local',
        address: 'Offline sale',
        notes: data.notes?.trim() || 'Added manually by staff.'
      },
      items: [
        {
          id: selectedProduct?.id || 'manual-item',
          name: selectedProduct?.name || 'Manual Sale',
          description: selectedProduct?.description || 'Offline sale added by admin',
          stock: 0,
          image: selectedProduct?.image || 'manual.png',
          selectedSize: 'Normal',
          price: itemPrice,
          quantity: data.quantity
        }
      ],
      total: data.total,
      status: 'fulfilled'
    };

    // Save to Firestore
    setDoc(doc(db, 'orders', orderId), manualOrder).catch(console.error);

    setOrders([manualOrder, ...orders]);
    return orderId;
  };

  const deleteOrder = (orderId: string) => {
    // Remove from Firestore
    deleteDoc(doc(db, 'orders', orderId)).catch(console.error);
    setOrders(orders.filter(order => order.id !== orderId));
  };

  if (!isLoaded) return <div style={{ height: '100vh', background: '#FDE8EC' }}></div>;

  return (
    <CartContext.Provider value={{
      products, cart, orders, heroImage, promoSettings,
      addToCart, addBoxToCart, updateQuantity, removeFromCart, placeOrder,
      updateProduct, deleteProduct, updateHeroImage, markOrderFulfilled, addManualOrder, deleteOrder, updatePromoSettings
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
