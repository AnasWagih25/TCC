'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, placeOrder } = useCart();
  const router = useRouter();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  const delivery = 70;
  const total = subtotal + delivery;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = placeOrder(formData);
    setIsCheckoutOpen(false);
    router.push(`/success?orderId=${orderId}`);
  };

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
                    <span>EGP {delivery.toFixed(2)}</span>
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
                    <span>EGP {total.toFixed(2)}</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '20px' }}
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <div className={`modal-overlay ${isCheckoutOpen ? 'active' : ''}`} id="checkoutModal">
        <div className="modal">
          <button className="modal-close" onClick={() => setIsCheckoutOpen(false)} aria-label="Close modal">&times;</button>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ 
              width: '52px', height: '52px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--pink) 0%, var(--pink-dark) 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 16px', fontSize: '1.5rem'
            }}>🛒</div>
            <h2 style={{ marginBottom: '6px' }}>Checkout</h2>
            <p className="modal-subtitle" style={{ marginBottom: 0 }}>We just need a few details to get your cookies to you.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Delivery Info Section */}
            <div style={{ 
              background: 'rgba(255,255,255,0.5)', borderRadius: '16px', 
              padding: '24px', marginBottom: '20px',
              border: '1px solid rgba(250, 209, 217, 0.4)'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                📋 Delivery Information
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cxName">Full Name *</label>
                  <input
                    type="text"
                    id="cxName"
                    required
                    placeholder="e.g. Ahmed Mohamed"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cxPhone">Phone Number *</label>
                  <input
                    type="tel"
                    id="cxPhone"
                    required
                    placeholder="01xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="cxEmail">Email Address *</label>
                <input
                  type="email"
                  id="cxEmail"
                  required
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="cxAddress">Delivery Address *</label>
                <textarea
                  id="cxAddress"
                  required
                  placeholder="Street, building, floor, apartment..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ 
              background: 'rgba(255,255,255,0.5)', borderRadius: '16px', 
              padding: '24px', marginBottom: '20px',
              border: '1px solid rgba(250, 209, 217, 0.4)'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                📝 Additional Notes
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <textarea
                  id="cxNotes"
                  placeholder="Any allergies, special requests, or delivery instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ minHeight: '70px' }}
                />
              </div>
            </div>

            {/* Order Summary Footer */}
            <div style={{ 
              background: 'linear-gradient(135deg, var(--brown) 0%, #4a2d20 100%)', 
              borderRadius: '16px', padding: '20px 24px', marginBottom: '20px',
              color: '#fff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.88rem', opacity: 0.85 }}>
                <span>Subtotal</span>
                <span>EGP {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.88rem', opacity: 0.85 }}>
                <span>Delivery</span>
                <span>EGP {delivery.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>EGP {total.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.78rem', opacity: 0.7, textAlign: 'center' }}>
                💵 Cash on Delivery &nbsp;·&nbsp; 🚚 Next-day Delivery
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ 
              width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 600,
              borderRadius: '14px', letterSpacing: '0.02em'
            }}>
              Confirm & Place Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
