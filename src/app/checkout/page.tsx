'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ClipboardList, FileText, Banknote, Truck, CheckCircle2, Store, Clock, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), { 
  ssr: false, 
  loading: () => <div style={{ height: '300px', background: '#eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div> 
});

export default function CheckoutPage() {
  const { cart, placeOrder, promoSettings, pickupSettings } = useCart();
  const router = useRouter();

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
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryZoneName, setDeliveryZoneName] = useState<string>('');
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  // Calculate distance in km between two lat/lng points using Haversine formula
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; // Distance in km
    return d;
  }

  useEffect(() => {
    if (!location) return;

    // Dispatch Origin: Second New Cairo (القاهرة الجديدة ثان)
    const DISPATCH_ORIGIN = { lat: 30.0450, lng: 31.4800 };
    const distance = getDistanceFromLatLonInKm(location.lat, location.lng, DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng);

    // Distance-based fee starting from Second New Cairo:
    // 70 EGP in close proximity, up to 100 EGP for further locations
    if (distance <= 14) {
      // Close proximity: Second New Cairo, Al Rehab, 1st & 5th Settlement, Tagamoa, Lotus, Beit El Watan
      setIsDeliverable(true);
      setDeliveryFee(70);
      setDeliveryZoneName('Close Proximity');
    } else if (distance <= 25) {
      // Mid distance: Madinaty, El Shorouk, Nasr City, Heliopolis, Maadi, New Capital
      setIsDeliverable(true);
      setDeliveryFee(80);
      setDeliveryZoneName('Mid Distance');
    } else if (distance <= 36) {
      // Farther distance: Downtown Cairo, Zamalek, Dokki, Mohandessin, Central Giza, Haram
      setIsDeliverable(true);
      setDeliveryFee(90);
      setDeliveryZoneName('Central Cairo & Giza');
    } else if (distance <= 65) {
      // Furthest distance: Sheikh Zayed, 6th of October, October Gardens, Outer Borders
      setIsDeliverable(true);
      setDeliveryFee(100);
      setDeliveryZoneName('Western Giza, Zayed & October');
    } else {
      setIsDeliverable(false);
      setDeliveryFee(0);
      setDeliveryZoneName('');
    }
  }, [location]);

  const handleApplyPromo = () => {
    const inputCode = promoCodeInput.trim().toUpperCase();
    
    // Secret Quirk easter egg promo code (5% off)
    if (inputCode === 'QUIRK') {
      const discount = (subtotal * 5) / 100;
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
      const discount = Math.min((subtotal * promoSettings.discountPercentage) / 100, promoSettings.maxCap);
      setAppliedDiscount(discount);
      setPromoMessage({ text: `Promo applied! You saved EGP ${discount.toFixed(2)}`, type: 'success' });
    } else {
      setAppliedDiscount(0);
      setPromoMessage({ text: 'Invalid promo code.', type: 'error' });
    }
  };

  const finalDeliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryFee;
  const total = Math.max(0, subtotal + finalDeliveryFee - appliedDiscount);

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
    
    const orderAddress = deliveryMethod === 'pickup' 
      ? `Pickup (${pickupSettings.address})` 
      : formData.address;

    const orderLocation = deliveryMethod === 'pickup'
      ? { lat: pickupSettings.lat, lng: pickupSettings.lng }
      : (location || { lat: pickupSettings.lat, lng: pickupSettings.lng });

    setSubmitting(true);
    try {
    // Create the order locally
    const newOrder = await placeOrder(
      { ...formData, address: orderAddress, location: orderLocation },
      finalDeliveryFee,
      appliedDiscount,
      deliveryMethod
    );
    
    // Fire and forget email dispatch to the API
    fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(console.error);

    router.push(`/success?orderId=${newOrder.id}`);
    } catch { setSubmitError('We couldn’t place your order. Your bag is still here. Please try again.'); }
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
                value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)}
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
                      EGP {deliveryFee.toFixed(2)} {deliveryZoneName ? `(${deliveryZoneName})` : ''} · Confirmed after ordering
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
                {deliveryMethod === 'delivery' ? 'Payment: Cash on Delivery or Instapay / Telda' : 'Payment: Cash on Pickup or Instapay / Telda'}
              </span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600 }}>
                {deliveryMethod === 'pickup' ? <Clock size={16} color="var(--ink)" /> : <Truck size={16} color="var(--ink)" />}
                {deliveryMethod === 'pickup' ? 'Next-day Pickup (12-8 PM)' : 'Next-day Regular Delivery'}
              </span>
            </div>
          </div>

          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting || (deliveryMethod === 'delivery' && (!isDeliverable || !location))}
            style={{ 
              width: '100%', padding: '18px', fontSize: '1.15rem', fontWeight: 700,
              borderRadius: '50px', letterSpacing: '0.02em', boxShadow: 'none',
              opacity: (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? 1 : 0.5, 
              cursor: (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'Placing your order…' : (deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && isDeliverable && location)) ? 'Confirm & Place Order' : 'Pin Location on Map'}
          </button>
        </form>
      </div>
    </div>
  );
}
