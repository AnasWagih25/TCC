'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ProductPrice = {
  normal: number;
  mini: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: ProductPrice;
  stock: number;
  image: string;
  images?: string[];
};

export type CartItem = Omit<Product, 'price'> & { 
  quantity: number; 
  selectedSize: 'Normal' | 'Mini'; 
  price: number; 
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
  status: 'pending' | 'fulfilled';
};

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Classic Belgian Milk Chocolate', description: 'Our signature cookie cake loaded with Belgian milk chocolate chunks.', price: { normal: 399, mini: 250 }, stock: 50, image: 'classic1.png', images: ['classic1.png', 'classic2.png'] },
  { id: 'p2', name: 'Double Chocolate', description: 'For the ultimate chocolate lover. Dark cocoa dough with semi-sweet chocolate.', price: { normal: 399, mini: 250 }, stock: 40, image: 'double.png', images: ['double.png'] },
  { id: 'p3', name: 'Kinder Chocolate', description: 'Rich dough packed with Kinder chocolate bars and a creamy center.', price: { normal: 499, mini: 300 }, stock: 35, image: 'kinder 1.png', images: ['kinder 1.png'] }
];

type CartContextType = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  heroImage: string;
  addToCart: (productId: string, size: 'Normal' | 'Mini') => { success: boolean; message: string };
  updateQuantity: (index: number, change: number) => { success: boolean; message: string };
  removeFromCart: (index: number) => void;
  placeOrder: (customerInfo: any, deliveryFee?: number) => Order;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (index: number) => Promise<void>;
  updateHeroImage: (url: string) => Promise<void>;
  markOrderFulfilled: (index: number) => void;
  addManualOrder: (data: { customerName: string; total: number; productId: string; quantity: number; notes?: string }) => string;
  deleteOrder: (orderId: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroImage, setHeroImage] = useState<string>('/images/preview.png');
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
          setProducts(liveProducts);
        } else {
          // If Firestore is completely empty, upload default products
          for (const p of defaultProducts) {
            await setDoc(doc(db, 'products', p.id), p).catch(() => {});
          }
        }

        // Fetch hero image from Firestore
        const heroSnap = await getDoc(doc(db, 'settings', 'homepage'));
        if (heroSnap.exists()) {
          setHeroImage(heroSnap.data().heroImage);
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
        localStorage.setItem('tcc_orders', JSON.stringify(orders));
      } catch (e) {
        console.error(e);
      }
    }
  }, [orders, isLoaded]);

  const addToCart = (productId: string, size: 'Normal' | 'Mini') => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return { success: false, message: 'Out of stock' };

    const existingIndex = cart.findIndex(item => item.id === productId && item.selectedSize === size);
    
    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity >= product.stock) {
        return { success: false, message: `Cannot add more. Only ${product.stock} in stock.` };
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      const selectedPrice = size === 'Normal' ? product.price.normal : product.price.mini;
      const { price, ...productWithoutPrice } = product;
      setCart([...cart, { ...productWithoutPrice, selectedSize: size, price: selectedPrice, quantity: 1 }]);
    }
    
    return { success: true, message: `Added ${product.name} to cart` };
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

  const placeOrder = (customerInfo: any, deliveryFee: number = 70) => {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price * item.quantity);
    const total = subtotal + deliveryFee;

    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      customer: customerInfo,
      items: [...cart],
      total: total,
      deliveryFee: deliveryFee,
      status: 'pending'
    };

    // Update Stock
    const updatedProducts = [...products];
    cart.forEach(cartItem => {
      const pIndex = updatedProducts.findIndex(p => p.id === cartItem.id);
      if (pIndex !== -1) {
        updatedProducts[pIndex].stock = Math.max(0, updatedProducts[pIndex].stock - cartItem.quantity);
        // Sync new stock to Firestore
        setDoc(doc(db, 'products', updatedProducts[pIndex].id), updatedProducts[pIndex]).catch(console.error);
      }
    });

    setProducts(updatedProducts);
    setOrders([newOrder, ...orders]);
    setCart([]);
    
    return newOrder;
  };

  const updateProduct = async (product: Product) => {
    await setDoc(doc(db, 'products', product.id), product);
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      const newProducts = [...products];
      newProducts[index] = product;
      setProducts(newProducts);
    } else {
      setProducts([...products, product]);
    }
  };

  const deleteProduct = async (index: number) => {
    const product = products[index];
    await deleteDoc(doc(db, 'products', product.id));
    const newProducts = [...products];
    newProducts.splice(index, 1);
    setProducts(newProducts);
  };

  const updateHeroImage = async (url: string) => {
    await setDoc(doc(db, 'settings', 'homepage'), { heroImage: url }, { merge: true });
    setHeroImage(url);
  };

  const markOrderFulfilled = (index: number) => {
    const newOrders = [...orders];
    newOrders[index].status = 'fulfilled';
    setOrders(newOrders);
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

    setOrders([manualOrder, ...orders]);
    return orderId;
  };

  const deleteOrder = (orderId: string) => {
    setOrders(orders.filter(order => order.id !== orderId));
  };

  if (!isLoaded) return <div style={{ height: '100vh', background: '#FDE8EC' }}></div>;

  return (
    <CartContext.Provider value={{
      products, cart, orders, heroImage,
      addToCart, updateQuantity, removeFromCart, placeOrder,
      updateProduct, deleteProduct, updateHeroImage, markOrderFulfilled, addManualOrder, deleteOrder
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
