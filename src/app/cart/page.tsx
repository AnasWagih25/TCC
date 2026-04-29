'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const router = useRouter();

  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  return (
    <div className="page active" id="cartPage">
      <div className="cart-page polka-bg-light">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Your Cart</h2>
          </div>

          <div id="cartContent">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-icon"><ShoppingCart size={64} color="var(--brown-light)" strokeWidth={1.5} /></div>
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added any delicious concepts yet.</p>
                <Link href="/shop" className="btn btn-primary">Start Shopping</Link>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image.startsWith('data:') ? item.image : `/images/${item.image}`} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-details">
                        <h4 className="cart-item-name">
                          {item.name} <span style={{ fontSize: '0.85rem', color: 'var(--brown-light)', marginLeft: '6px' }}>({item.selectedSize})</span>
                        </h4>
                        <div className="cart-item-price">EGP {Number(item.price).toFixed(2)} each</div>
                        <div className="quantity-controls">
                          <button className="qty-btn" onClick={() => updateQuantity(index, -1)}>-</button>
                          <span className="qty-value">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateQuantity(index, 1)}>+</button>
                        </div>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(index)} title="Remove"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <h3>Order Summary</h3>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>EGP {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="summary-row">
                    <span>Delivery</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--brown-light)' }}>Calculated at checkout</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '8px 0 12px',
                    padding: '10px 12px',
                    border: '1px solid var(--brown-light)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(var(--brown-light-rgb, 180,140,100), 0.08)',
                    fontSize: '0.85rem',
                    color: 'var(--brown)',
                    lineHeight: 1.4,
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brown)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>!</span>
                    <span style={{ fontWeight: 600 }}>Next-day delivery</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 0 12px',
                    padding: '10px 12px',
                    border: '1px solid var(--brown-light)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(var(--brown-light-rgb, 180,140,100), 0.08)',
                    fontSize: '0.85rem',
                    color: 'var(--brown)',
                    lineHeight: 1.4,
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brown)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>$</span>
                    <span style={{ fontWeight: 600 }}>Payment Method: Cash on Delivery Only</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <span style={{ fontSize: '1rem' }}>EGP {subtotal.toFixed(2)} + Delivery</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '20px' }}
                    onClick={() => router.push('/checkout')}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
