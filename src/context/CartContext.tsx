'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
  price: number; // The flat price for this size
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
  };
  items: CartItem[];
  total: number;
  status: 'pending' | 'fulfilled';
};

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Classic Belgian Milk Chocolate', description: 'Our signature cookie cake loaded with Belgian milk chocolate chunks.', price: { normal: 399, mini: 250 }, stock: 50, image: 'classic1.png', images: ['classic1.png', 'classic2.png'] },
  { id: 'p2', name: 'Double Chocolate', description: 'For the ultimate chocolate lover. Dark cocoa dough with semi-sweet chocolate.', price: { normal: 399, mini: 250 }, stock: 40, image: 'double.png', images: ['double.png'] },
  { id: 'p3', name: 'Kinder Chocolate', description: 'Rich dough packed with Kinder chocolate bars and a creamy center.', price: { normal: 499, mini: 300 }, stock: 35, image: 'kinder 1.png', images: ['kinder 1.png'] },
  { id: 'p4', name: "M&M's Chocolate", description: 'Fun, colorful, and delicious. Loaded with classic M&M candies.', price: { normal: 499, mini: 260 }, stock: 45, image: 'mm1.png', images: ['mm1.png', 'mm2.png'] }
];

type CartContextType = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  addToCart: (productId: string, size: 'Normal' | 'Mini') => { success: boolean; message: string };
  updateQuantity: (index: number, change: number) => { success: boolean; message: string };
  removeFromCart: (index: number) => void;
  placeOrder: (customerInfo: any) => string;
  updateProduct: (product: Product) => void;
  deleteProduct: (index: number) => void;
  markOrderFulfilled: (index: number) => void;
  addManualOrder: (data: { customerName: string; total: number; productId: string; quantity: number; notes?: string }) => string;
  deleteOrder: (orderId: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    // Clear storage if previous schema version is detected to prevent app crash
    const v = localStorage.getItem('tcc_version');
    if (v !== '2.2') {
      localStorage.removeItem('tcc_products');
      localStorage.removeItem('tcc_cart');
      localStorage.setItem('tcc_version', '2.2');
    }
    const savedProducts = localStorage.getItem('tcc_products');
    let loadedProducts = savedProducts ? JSON.parse(savedProducts) : defaultProducts;
    
    // Quick migration to remove the broken kinder2.png image from the Kinder cookie
    if (loadedProducts) {
      loadedProducts = loadedProducts.map((p: Product) => {
        if (p.id === 'p3' && p.images && p.images.length > 1) {
          // If it's the default kinder cookie and it still has the second image, force it to 1 image
          const hasBrokenImage = p.images.some(img => img.includes('kinder2'));
          if (hasBrokenImage) {
            return { ...p, images: [p.images[0]] };
          }
        }
        return p;
      });
    }

    setProducts(loadedProducts);
    
    const savedCart = localStorage.getItem('tcc_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    
    const savedOrders = localStorage.getItem('tcc_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tcc_products', JSON.stringify(products));
      } catch (e) {
        console.error('Failed to save products to localStorage', e);
        alert('Failed to save to local storage! The image might still be too large.');
      }
    }
  }, [products, isLoaded]);

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

  const placeOrder = (customerInfo: any) => {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price * item.quantity);
    const delivery = 70;
    const total = subtotal + delivery;

    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      customer: customerInfo,
      items: [...cart],
      total: total,
      status: 'pending'
    };

    // Update Stock
    const updatedProducts = [...products];
    cart.forEach(cartItem => {
      const pIndex = updatedProducts.findIndex(p => p.id === cartItem.id);
      if (pIndex !== -1) {
        updatedProducts[pIndex].stock = Math.max(0, updatedProducts[pIndex].stock - cartItem.quantity);
      }
    });

    setProducts(updatedProducts);
    setOrders([newOrder, ...orders]);
    setCart([]);
    
    return orderId;
  };

  const updateProduct = (product: Product) => {
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      const newProducts = [...products];
      newProducts[index] = product;
      setProducts(newProducts);
    } else {
      setProducts([...products, product]);
    }
  };

  const deleteProduct = (index: number) => {
    const newProducts = [...products];
    newProducts.splice(index, 1);
    setProducts(newProducts);
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

  // Don't render children until we've loaded from localStorage to avoid hydration mismatch
  if (!isLoaded) return <div style={{ height: '100vh', background: '#FDE8EC' }}></div>;

  return (
    <CartContext.Provider value={{
      products, cart, orders, 
      addToCart, updateQuantity, removeFromCart, placeOrder,
      updateProduct, deleteProduct, markOrderFulfilled, addManualOrder, deleteOrder
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
