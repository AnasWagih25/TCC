'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { pendingCheckout } from '@/lib/order-client';
import { deliveryPrice, money } from '@/lib/order-domain';
import { ShoppingCart, ClipboardList, FileText, Banknote, Truck, CheckCircle2, Store, Clock, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import CheckoutPayment from '@/components/CheckoutPayment';
import type { CheckoutPayment as PaymentSelection } from '@/lib/payment-types';

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), { 
  ssr: false, 
  loading: () => <div style={{ height: '300px', background: '#eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div> 
});

export default function CheckoutPage() {
  const { cart, placeOrder, retryPendingOrder, promoSettings, pickupSettings } = useCart();
  const router = useRouter();

  const [previousReference, setPreviousReference] = useState('');
  useEffect(() => { const frame = requestAnimationFrame(() => { try { const pending = pendingCheckout(sessionStorage); if (pending) setPreviousReference(`ORD-${pending.requestId}`); } catch { /* Storage unavailable. */ } }); return () => cancelAnimationFrame(frame); }, []);
  const [payment, setPayment] = useState<PaymentSelection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  let deliveryFee = 0;
  let isDeliverable = true;
  if (location) { try { deliveryFee = deliveryPrice(location, pickupSettings); } catch { isDeliverable = false; } }
  const deliveryZoneName = ({ 70: 'Close proximity', 80: 'Mid distance', 90: 'Central Cairo & Giza', 100: 'Western Giza, Zayed & October' } as Record<number, string>)[deliveryFee] || '';
  
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const subtotal = money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));

  const handleApplyPromo = () => {
    const inputCode = promoCodeInput.trim().toUpperCase();
    
    // Secret Quirk easter egg promo code (5% off)
    if (inputCode === 'QUIRK') {
      const discount = money((subtotal * 5) / 100);
      setAppliedDiscount(discount);
      setPromoMessage({ text: `Your cookie treat is applied. You saved 5% (EGP ${discount.toFixed(2)})`, type: 'success' });
      return;
    }

    if (!promoSettings || !promoSettings.isActive) {
      setPromoMessage({ text: 'No active promo code available.', type: 'error' });
      setAppliedDiscount(0);
      return;
    }
    if (inputCode === promoSettings.code.toUpperCase()) {
      const rawDiscount = money((subtotal * promoSettings.discountPercentage) / 100);
      const discount = promoSettings.maxCap > 0 ? Math.min(rawDiscount, promoSettings.maxCap) : rawDiscount;
      setAppliedDiscount(discount);
      setPromoMessage({ text: `Promo applied! You saved EGP ${discount.toFixed(2)}`, type: 'success' });
    } else {
      setAppliedDiscount(0);
      setPromoMessage({ text: 'Invalid promo code.', type: 'error' });
    }
  };

  const finalDeliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryFee;
  const total = money(Math.max(0, subtotal + finalDeliveryFee - appliedDiscount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');

    if (deliveryMethod === 'delivery') {
      if (!location) {
        setSubmitError('Please pin your delivery location on the map.');
        return;
      }
      if (!isDeliverable) {
        setSubmitError('Delivery is available within Greater Cairo, Giza, and the New Capital. Choose pickup or a location within our delivery area.');
        return;
      }
    }
    
    if (!payment) { setSubmitError('Attach a matching InstaPay transaction screenshot before placing your order.'); return; }

    const orderAddress = deliveryMethod === 'pickup' 
      ? `Pickup (${pickupSettings.address})` 
      : formData.address;

    const orderLocation = deliveryMethod === 'pickup'
      ? { lat: pickupSettings.lat, lng: pickupSettings.lng }
      : (location || { lat: pickupSettings.lat, lng: pickupSettings.lng });

    setSubmitting(true);
    try {
    // Continue only after the server confirms the persisted order.
    const newOrder = await placeOrder(
      { ...formData, address: orderAddress, location: orderLocation },
      finalDeliveryFee,
      appliedDiscount,
      deliveryMethod,
      appliedDiscount > 0 ? promoCodeInput.trim().toUpperCase() : '',
      payment.plan === 'full' ? 'instapay' : payment.remainingMethod,
      payment
    );
    
    router.push(`/success?orderId=${newOrder.id}`);
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'We couldn’t confirm your order. Your bag is still here. Please try again.'); try { const pending = pendingCheckout(sessionStorage); setPreviousReference(pending ? `ORD-${pending.requestId}` : ''); } catch { /* Storage unavailable. */ } }
    finally { setSubmitting(false); }
  };

  if (cart.length === 0) {
    return (
      <div className="page active polka-bg checkout-page" style={{ paddingTop: '140px', paddingBottom: '80px', minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="section-container" style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'var(--card-brown)',
          padding: '48px 32px',
          borderRadius: '24px',
          border: '2px solid var(--pink)',
          boxShadow: 'none',
          textAlign: 'center',
          color: 'var(--ink)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--brown)',
            boxShadow: 'none'
          }}>
            <ShoppingCart size={44} color="var(--brown)" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--ink)', fontWeight: 700 }}>Your cart is empty</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--pink-light)', marginBottom: '28px', lineHeight: 1.5 }}>
            Looks like you haven’t added any delicious concepts yet.
          </p>
          <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700 }} onClick={() => router.push('/shop')}>
            Explore the menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page active polka-bg checkout-page" style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '100vh' }}>
      <div className="section-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--card-brown)', padding: '40px', borderRadius: '24px', border: '2px solid var(--pink)', boxShadow: 'none', color: 'var(--ink)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'var(--pink)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 16px', color: 'var(--brown)',
            boxShadow: 'none'
          }}><ShoppingCart size={32} /></div>
          <h1 style={{ marginBottom: '8px', fontSize: '2.4rem', color: 'var(--ink)' }}>Your cookie moment.</h1>
          <p className="modal-subtitle" style={{ marginBottom: 0, color: 'var(--pink-light)', fontSize: '1.05rem' }}>We just need a few details to get your cookies to you.</p>
        </div>

        <nav className="checkout-progress" aria-label="Checkout progress"><Link href="/shop">The menu</Link><span>/</span><Link href="/cart">Your bag</Link><span>/</span><strong>Checkout</strong></nav>
        <form onSubmit={handleSubmit}>
          {/* Delivery Option Selection */}
          <div style={{
            background: 'var(--card-brown)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            border: '2px solid var(--pink)',
            boxShadow: 'none',
            color: 'var(--ink)'
          }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink)', marginBottom: '16px' }}>
              Select Fulfillment Option *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                aria-pressed={deliveryMethod === 'delivery'}
                style={{
                  padding: '18px 16px',
                  borderRadius: '16px',
                  border: deliveryMethod === 'delivery' ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.4)',
                  background: deliveryMethod === 'delivery' ? 'var(--off-white)' : 'var(--off-white)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: deliveryMethod === 'delivery' ? '0 4px 14px rgba(243, 195, 206, 0.3)' : 'none'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={22} color="var(--ink)" /> Regular Delivery
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--pink-light)', lineHeight: 1.4, opacity: 0.9 }}>
                  70 EGP (close proximity) to 100 EGP (further areas) · Dispatched from Second New Cairo
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                aria-pressed={deliveryMethod === 'pickup'}
                style={{
                  padding: '18px 16px',
                  borderRadius: '16px',
                  border: deliveryMethod === 'pickup' ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.4)',
                  background: deliveryMethod === 'pickup' ? 'var(--off-white)' : 'var(--off-white)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: deliveryMethod === 'pickup' ? '0 4px 14px rgba(243, 195, 206, 0.3)' : 'none'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={22} color="var(--ink)" /> Pickup
                </div>
                <div style={{ fontSize: '0.82rem', color: '#347049', fontWeight: 700, lineHeight: 1.4 }}>
                  0 EGP Delivery Fee · Next day 12 PM - 8 PM
                </div>
              </button>
            </div>
          </div>

          {/* Delivery or Pickup Details Section */}
          {deliveryMethod === 'pickup' ? (
            <div style={{ 
              background: 'var(--card-brown)', borderRadius: '20px', 
              padding: '28px', marginBottom: '24px',
              border: '2px solid var(--pink)',
              color: 'var(--ink)',
              boxShadow: 'none'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} /> Pickup Location & Schedule
              </div>

              <div style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1.5px solid #2ecc71', borderRadius: '14px', padding: '18px', marginBottom: '20px', color: 'var(--ink)' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#347049', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} /> FREE Pickup (0 EGP Delivery Fee)
                </div>
                <div style={{ fontSize: '0.92rem', marginBottom: '8px', color: 'var(--ink)', lineHeight: 1.5 }}>
                  <strong>Pickup address:</strong> {pickupSettings.address}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--pink-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                  <Clock size={16} color="var(--ink)" /> <strong>Timing:</strong> {pickupSettings.hoursNotice}
                </div>
                <a
                  href={pickupSettings.mapUrl || `https://www.google.com/maps/search/?api=1&query=${pickupSettings.lat},${pickupSettings.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'var(--pink)',
                    color: 'var(--brown)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    transition: '0.2s',
                    boxShadow: 'none'
                  }}
                >
                  <MapPin size={18} /> Open Location in Google Maps ↗
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-field-1" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Full Name *</label>
                  <input id="checkout-field-1"
                    type="text" required placeholder="e.g. Ahmed Mohamed"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-field-2" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Phone Number *</label>
                  <input id="checkout-field-2"
                    type="tel" required placeholder="01xxxxxxxxx"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="checkout-field-3" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Email Address *</label>
                <input id="checkout-field-3"
                  type="email" required placeholder="you@example.com"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Pickup Branch Map Location</label>
                <CheckoutMap isStatic={true} staticLocation={{ lat: pickupSettings.lat, lng: pickupSettings.lng, label: pickupSettings.address }} />
              </div>
            </div>
          ) : (
            <div style={{ 
              background: 'var(--card-brown)', borderRadius: '20px', 
              padding: '28px', marginBottom: '24px',
              border: '2px solid var(--pink)',
              color: 'var(--ink)',
              boxShadow: 'none'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={20} /> Delivery Address & Location
              </div>

              {/* Regular Delivery Information Banner */}
              <div style={{
                background: 'rgba(243, 195, 206, 0.12)',
                border: '1.5px solid var(--pink)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
                color: 'var(--ink)'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--ink)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="var(--ink)" /> Regular Delivery from Second New Cairo:
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--ink)', opacity: 0.95 }}>
                  Orders are dispatched from our bakery in <strong>Second New Cairo</strong>. Delivery fee is <strong>70 EGP</strong> in close proximity and scales up to <strong>100 EGP</strong> for further locations (confirmed with you after ordering).
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-field-4" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Full Name *</label>
                  <input id="checkout-field-4"
                    type="text" required placeholder="e.g. Ahmed Mohamed"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-field-5" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Phone Number *</label>
                  <input id="checkout-field-5"
                    type="tel" required placeholder="01xxxxxxxxx"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="checkout-field-6" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Email Address *</label>
                <input id="checkout-field-6"
                  type="email" required placeholder="you@example.com"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="checkout-field-7" style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Delivery Address *</label>
                <textarea id="checkout-field-7"
                  required placeholder="Street, building, floor, apartment..."
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Pin Your Delivery Location *</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--pink-light)', marginBottom: '12px', opacity: 0.9 }}>
                  Please drop a pin on the map to determine your delivery location.
                </p>
                <CheckoutMap onLocationSelect={(lat, lng) => setLocation({ lat, lng })} />
                {location && (
                  isDeliverable ? (
                    <p style={{ fontSize: '0.85rem', color: '#347049', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> Location pinned successfully
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#a33832', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✕</span> Sorry, we only deliver to Greater Cairo, Giza, and New Capital.
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div style={{ 
            background: 'var(--card-brown)', borderRadius: '20px', 
            padding: '24px', marginBottom: '24px',
            border: '2px solid var(--pink)',
            color: 'var(--ink)'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Additional Notes
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                aria-label="Additional order notes"
                placeholder="Any allergies, special requests, or instructions..."
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Promo Code Section */}
          <div style={{ 
            background: 'var(--card-brown)', borderRadius: '20px', 
            padding: '24px', marginBottom: '24px',
            border: '2px solid var(--pink)',
            color: 'var(--ink)'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={18} /> Promo Code
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', gap: '12px' }}>
              <input
                aria-label="Promo code" type="text" placeholder="Enter promo code"
                value={promoCodeInput} onChange={(e) => { setPromoCodeInput(e.target.value); setAppliedDiscount(0); setPromoMessage(null); }}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)' }}
              />
              <button 
                type="button" 
                onClick={handleApplyPromo}
                className="btn btn-secondary" 
                style={{ padding: '12px 24px', borderRadius: '8px', whiteSpace: 'nowrap' }}
              >
                Apply
              </button>
            </div>
            {promoMessage && (
              <p style={{ fontSize: '0.85rem', marginTop: '12px', fontWeight: 600, color: promoMessage.type === 'success' ? '#347049' : '#a33832' }}>
                {promoMessage.text}
              </p>
            )}
          </div>

          {/* Order Summary Footer */}
          <div style={{ 
            background: 'var(--card-brown)', 
            borderRadius: '20px', padding: '28px', marginBottom: '24px',
            border: '2px solid var(--pink)',
            color: 'var(--ink)', boxShadow: 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Subtotal</span>
              <span>EGP {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Fulfillment Option</span>
              <span>
                {deliveryMethod === 'pickup' ? (
                  <strong style={{ color: '#347049' }}>FREE Pickup (0 EGP)</strong>
                ) : location ? (
                  isDeliverable ? (
                    <strong style={{ color: 'var(--ink)' }}>
                    EGP {deliveryFee.toFixed(2)} {deliveryZoneName ? `(${deliveryZoneName})` : ''}
                    </strong>
                  ) : (
                    <span style={{ color: '#ffaaaa' }}>Unavailable Location</span>
                  )
                ) : (
                  <span style={{ fontSize: '0.88rem', color: 'var(--pink-light)', fontStyle: 'italic' }}>
                    EGP 70 - 100 (Pin map to calculate from Second New Cairo)
                  </span>
                )}
              </span>
            </div>
            {appliedDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.95rem', color: '#347049', fontWeight: 600 }}>
                <span>Discount</span>
                <span>- EGP {appliedDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(243,195,206,0.25)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.6rem', color: 'var(--ink)' }}>EGP {total.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--pink-light)', background: 'var(--off-white)', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600 }}>
                <Banknote size={16} color="var(--ink)" />
                50% InstaPay deposit required · Cash or InstaPay for the balance
              </span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600 }}>
                {deliveryMethod === 'pickup' ? <Clock size={16} color="var(--ink)" /> : <Truck size={16} color="var(--ink)" />}
                {deliveryMethod === 'pickup' ? 'Next-day Pickup (12-8 PM)' : 'Next-day Regular Delivery'}
              </span>
            </div>
          </div>

          {deliveryMethod === 'pickup' || (location && isDeliverable)
            ? <CheckoutPayment total={total} disabled={submitting} onChange={setPayment} />
            : <p className="checkout-transfer">Pin your delivery location above to calculate your exact total and required InstaPay deposit.</p>}
          {previousReference && <div className="checkout-recovery"><strong>Previous submission: {previousReference}</strong><p>Its confirmation was interrupted. Check the original submission before placing a separate order. Any new items in your bag stay here.</p><button type="button" className="text-link" disabled={submitting} onClick={async () => { setSubmitting(true); setSubmitError(''); try { const order = await retryPendingOrder(); router.push(`/success?orderId=${order.id}`); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'The previous submission could not be checked.'); try { if (!pendingCheckout(sessionStorage)) setPreviousReference(''); } catch { /* Storage unavailable. */ } } finally { setSubmitting(false); } }}>Check previous submission</button></div>}
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting || !payment || (deliveryMethod === 'delivery' && (!isDeliverable || !location))}
            style={{ 
              width: '100%', padding: '18px', fontSize: '1.15rem', fontWeight: 700,
              borderRadius: '50px', letterSpacing: '0.02em', boxShadow: 'none',
              opacity: (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? 1 : 0.5, 
              cursor: (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'Placing your order…' : (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? (payment ? 'Confirm & Place Order' : 'Attach & check payment screenshot') : 'Pin Location on Map'}
          </button>
        </form>
      </div>
    </div>
  );
}
