'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCart, resolveImageUrl } from '@/context/CartContext';

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
                    <div key={`${item.id}-${index}`} className="cart-item">
                      <img src={resolveImageUrl(item.image)} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-details">
                        <h4 className="cart-item-name">
                          {item.name}
                          {item.boxSize ? (
                            <span style={{ fontSize: '0.82rem', color: 'var(--brown-light)', marginLeft: '6px' }}>(Box of {item.boxSize})</span>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--brown-light)', marginLeft: '6px' }}>({item.selectedFlavor || item.selectedSize})</span>
                          )}
                        </h4>
                        {item.boxFlavors && item.boxFlavors.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', marginTop: '4px', lineHeight: 1.6 }}>
                            {item.boxFlavors.map(bf => (
                              <span key={bf.name} style={{ display: 'inline-block', background: 'rgba(99, 61, 45, 0.08)', color: 'var(--brown)', padding: '2px 8px', borderRadius: '50px', marginRight: '4px', marginBottom: '2px', fontWeight: 500 }}>
                                {bf.name} ×{bf.quantity}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)', marginTop: '4px', lineHeight: 1.6 }}>
                            {item.selectedCustomizations.map(c => (
                              <span key={c.name} style={{ display: 'inline-flex', flexDirection: 'column', background: 'rgba(99, 61, 45, 0.08)', color: 'var(--brown)', padding: '2px 8px', borderRadius: '8px', marginRight: '4px', marginBottom: '4px', gap: '2px', fontWeight: 500 }}>
                                <span>+ {c.name}</span>
                                {c.text && <span style={{ fontSize: '0.65rem', fontStyle: 'italic', opacity: 0.8 }}>"{c.text}"</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="cart-item-price">EGP {Number(item.price).toFixed(2)}{item.boxSize ? '' : ' each'}</div>
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
                    gap: '10px',
                    margin: '0 0 10px',
                    padding: '10px 14px',
                    border: '1.5px solid var(--pink)',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    fontSize: '0.88rem',
                    color: '#FFFFFF',
                    lineHeight: 1.4,
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--pink)',
                      color: 'var(--brown)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>!</span>
                    <span style={{ fontWeight: 600 }}>Next-day delivery</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '0 0 14px',
                    padding: '10px 14px',
                    border: '1.5px solid var(--pink)',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    fontSize: '0.88rem',
                    color: '#FFFFFF',
                    lineHeight: 1.4,
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--pink)',
                      color: 'var(--brown)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>$</span>
                    <span style={{ fontWeight: 600 }}>Payment: Instapay / Telda (Uber) or Cash on Pickup</span>
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
