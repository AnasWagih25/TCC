'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ClipboardList, FileText, Banknote, Truck, CheckCircle2, Store, Clock, MapPin, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), { 
  ssr: false, 
  loading: () => <div style={{ height: '300px', background: '#eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div> 
});

export default function CheckoutPage() {
  const { cart, placeOrder, promoSettings, pickupSettings } = useCart();
  const router = useRouter();

  const [deliveryMethod, setDeliveryMethod] = useState<'uber' | 'pickup'>('uber');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
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

    // Delivery zones
    const zones = [
      { name: 'New Capital & Eastern Borders', lat: 29.9870, lng: 31.7400, radius: 45, fee: 100 },
      { name: 'Sheikh Zayed, October & Western Giza', lat: 30.0450, lng: 29.9880, radius: 40, fee: 100 },
      { name: '5th Settlement & New Cairo', lat: 30.0050, lng: 31.4250, radius: 30, fee: 100 },
      { name: 'Old Cairo & Southern Giza', lat: 30.0100, lng: 31.2300, radius: 25, fee: 75 },
      { name: 'Dokki & Central Giza', lat: 30.0380, lng: 31.2100, radius: 20, fee: 75 },
      { name: 'Greater Cairo & Surrounding Borders', lat: 30.0444, lng: 31.2357, radius: 60, fee: 100 }
    ];

    let foundFee = -1; // -1 indicates out of bounds
    let minDistance = Infinity;

    for (const zone of zones) {
      const distance = getDistanceFromLatLonInKm(location.lat, location.lng, zone.lat, zone.lng);
      if (distance <= zone.radius && distance < minDistance) {
        minDistance = distance;
        foundFee = zone.fee;
      }
    }

    if (foundFee === -1) {
      setIsDeliverable(false);
      setDeliveryFee(0);
    } else {
      setIsDeliverable(true);
      setDeliveryFee(foundFee);
    }
  }, [location]);

  const handleApplyPromo = () => {
    if (!promoSettings || !promoSettings.isActive) {
      setPromoMessage({ text: 'No active promo code available.', type: 'error' });
      setAppliedDiscount(0);
      return;
    }
    if (promoCodeInput.trim().toUpperCase() === promoSettings.code.toUpperCase()) {
      const discount = Math.min((subtotal * promoSettings.discountPercentage) / 100, promoSettings.maxCap);
      setAppliedDiscount(discount);
      setPromoMessage({ text: `Promo applied! You saved EGP ${discount.toFixed(2)}`, type: 'success' });
    } else {
      setAppliedDiscount(0);
      setPromoMessage({ text: 'Invalid promo code.', type: 'error' });
    }
  };

  const finalDeliveryFee = 0;
  const total = Math.max(0, subtotal - appliedDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMethod === 'uber') {
      if (!location) {
        alert('Please pin your delivery location on the map.');
        return;
      }
      if (!isDeliverable) {
        alert('Sorry, delivery is currently restricted to Greater Cairo, Giza, and the New Capital.');
        return;
      }
    }
    
    const orderAddress = deliveryMethod === 'pickup' 
      ? `Pickup (${pickupSettings.address})` 
      : formData.address;

    const orderLocation = deliveryMethod === 'pickup'
      ? { lat: pickupSettings.lat, lng: pickupSettings.lng }
      : (location || { lat: pickupSettings.lat, lng: pickupSettings.lng });

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
  };

  if (cart.length === 0) {
    return (
      <div className="page active polka-bg" style={{ paddingTop: '140px', paddingBottom: '80px', minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="section-container" style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'var(--card-brown)',
          padding: '48px 32px',
          borderRadius: '24px',
          border: '2px solid var(--pink)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
          color: '#FFFFFF'
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
            boxShadow: '0 8px 20px rgba(243, 195, 206, 0.3)'
          }}>
            <ShoppingCart size={44} color="var(--brown)" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: '#FFFFFF', fontWeight: 700 }}>Your cart is empty</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--pink-light)', marginBottom: '28px', lineHeight: 1.5 }}>
            Looks like you haven't added any delicious concepts yet.
          </p>
          <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700 }} onClick={() => router.push('/shop')}>
            Go to Shop 🛒
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page active polka-bg" style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '100vh' }}>
      <div className="section-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--card-brown)', padding: '40px', borderRadius: '24px', border: '2px solid var(--pink)', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)', color: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'var(--pink)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 16px', color: 'var(--brown)',
            boxShadow: '0 6px 16px rgba(243, 195, 206, 0.3)'
          }}><ShoppingCart size={32} /></div>
          <h2 style={{ marginBottom: '8px', fontSize: '2.4rem', color: '#FFFFFF' }}>Checkout</h2>
          <p className="modal-subtitle" style={{ marginBottom: 0, color: 'var(--pink-light)', fontSize: '1.05rem' }}>We just need a few details to get your cookies to you.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Delivery Option Selection */}
          <div style={{
            background: 'var(--card-brown)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            border: '2px solid var(--pink)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            color: '#FFFFFF'
          }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pink)', marginBottom: '16px' }}>
              Select Fulfillment Option *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setDeliveryMethod('uber')}
                style={{
                  padding: '18px 16px',
                  borderRadius: '16px',
                  border: deliveryMethod === 'uber' ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.4)',
                  background: deliveryMethod === 'uber' ? '#3B2116' : 'rgba(0, 0, 0, 0.2)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: deliveryMethod === 'uber' ? '0 4px 14px rgba(243, 195, 206, 0.3)' : 'none'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={22} color="var(--pink)" /> Uber Delivery
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--pink-light)', lineHeight: 1.4, opacity: 0.9 }}>
                  Home delivery via Uber. Location chosen on map.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                style={{
                  padding: '18px 16px',
                  borderRadius: '16px',
                  border: deliveryMethod === 'pickup' ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.4)',
                  background: deliveryMethod === 'pickup' ? '#3B2116' : 'rgba(0, 0, 0, 0.2)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: deliveryMethod === 'pickup' ? '0 4px 14px rgba(243, 195, 206, 0.3)' : 'none'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={22} color="var(--pink)" /> Pickup
                </div>
                <div style={{ fontSize: '0.82rem', color: '#2ecc71', fontWeight: 700, lineHeight: 1.4 }}>
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
              color: '#FFFFFF',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} /> Pickup Location & Schedule
              </div>

              <div style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1.5px solid #2ecc71', borderRadius: '14px', padding: '18px', marginBottom: '20px', color: '#FFFFFF' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2ecc71', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} /> FREE Pickup (0 EGP Delivery Fee)
                </div>
                <div style={{ fontSize: '0.92rem', marginBottom: '8px', color: '#FFFFFF', lineHeight: 1.5 }}>
                  <strong>📍 Pickup Address:</strong> {pickupSettings.address}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--pink-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                  <Clock size={16} color="var(--pink)" /> <strong>Timing:</strong> {pickupSettings.hoursNotice}
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
                    boxShadow: '0 4px 12px rgba(243, 195, 206, 0.3)'
                  }}
                >
                  <MapPin size={18} /> Open Location in Google Maps ↗
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Full Name *</label>
                  <input
                    type="text" required placeholder="e.g. Ahmed Mohamed"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Phone Number *</label>
                  <input
                    type="tel" required placeholder="01xxxxxxxxx"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Email Address *</label>
                <input
                  type="email" required placeholder="you@example.com"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Pickup Branch Map Location</label>
                <CheckoutMap isStatic={true} staticLocation={{ lat: pickupSettings.lat, lng: pickupSettings.lng, label: pickupSettings.address }} />
              </div>
            </div>
          ) : (
            <div style={{ 
              background: 'var(--card-brown)', borderRadius: '20px', 
              padding: '28px', marginBottom: '24px',
              border: '2px solid var(--pink)',
              color: '#FFFFFF',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={20} /> Uber Delivery Address & Location
              </div>

              {/* Uber Delivery Caution Banner */}
              <div style={{
                background: 'rgba(231, 76, 60, 0.15)',
                border: '2px solid #e74c3c',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '20px',
                color: '#FFFFFF'
              }}>
                <div style={{ fontWeight: 700, fontSize: '1.02rem', color: '#ff6b6b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#ff6b6b" /> ⚠️ Uber Delivery Notice & Payment Rules:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', lineHeight: 1.6, color: '#FFFFFF' }}>
                  <li>
                    <strong>Delivery Fare:</strong> Uber delivery fee will be determined at the time of delivery after ordering and calculating the exact ride fare.
                  </li>
                  <li>
                    <strong>Payment Method:</strong> Payment for Uber delivery items & fare is via <strong>Instapay or Telda ONLY</strong> (No Cash on Delivery for Uber delivery).
                  </li>
                </ul>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Full Name *</label>
                  <input
                    type="text" required placeholder="e.g. Ahmed Mohamed"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Phone Number *</label>
                  <input
                    type="tel" required placeholder="01xxxxxxxxx"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Email Address *</label>
                <input
                  type="email" required placeholder="you@example.com"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Delivery Address *</label>
                <textarea
                  required placeholder="Street, building, floor, apartment..."
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>Pin Your Delivery Location *</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--pink-light)', marginBottom: '12px', opacity: 0.9 }}>
                  Please drop a pin on the map to determine your delivery location for Uber.
                </p>
                <CheckoutMap onLocationSelect={(lat, lng) => setLocation({ lat, lng })} />
                {location && (
                  isDeliverable ? (
                    <p style={{ fontSize: '0.85rem', color: '#2ecc71', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> Location pinned successfully
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#ff6b6b', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            color: '#FFFFFF'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Additional Notes
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                placeholder="Any allergies, special requests, or instructions..."
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Promo Code Section */}
          <div style={{ 
            background: 'var(--card-brown)', borderRadius: '20px', 
            padding: '24px', marginBottom: '24px',
            border: '2px solid var(--pink)',
            color: '#FFFFFF'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={18} /> Promo Code
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', gap: '12px' }}>
              <input
                type="text" placeholder="Enter promo code"
                value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#3B2116', color: '#FFFFFF' }}
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
              <p style={{ fontSize: '0.85rem', marginTop: '12px', fontWeight: 600, color: promoMessage.type === 'success' ? '#2ecc71' : '#ff6b6b' }}>
                {promoMessage.text}
              </p>
            )}
          </div>

          {/* Order Summary Footer */}
          <div style={{ 
            background: 'var(--card-brown)', 
            borderRadius: '20px', padding: '28px', marginBottom: '24px',
            border: '2px solid var(--pink)',
            color: '#FFFFFF', boxShadow: '0 12px 35px rgba(0, 0, 0, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Subtotal</span>
              <span>EGP {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Fulfillment Option</span>
              <span>
                {deliveryMethod === 'pickup' ? (
                  <strong style={{ color: '#2ecc71' }}>FREE Pickup (0 EGP)</strong>
                ) : location ? (
                  isDeliverable ? (
                    <strong style={{ color: 'var(--pink)' }}>To Be Determined (Uber Fare)</strong>
                  ) : (
                    <span style={{ color: '#ffaaaa' }}>Unavailable Location</span>
                  )
                ) : (
                  <span style={{ fontSize: '0.88rem', color: 'var(--pink-light)', fontStyle: 'italic' }}>To Be Determined (Pin Map)</span>
                )}
              </span>
            </div>
            {appliedDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.95rem', color: '#2ecc71', fontWeight: 600 }}>
                <span>Discount</span>
                <span>- EGP {appliedDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(243,195,206,0.25)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.6rem', color: '#FFFFFF' }}>EGP {total.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--pink-light)', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFFFFF', fontWeight: 600 }}>
                <Banknote size={16} color="var(--pink)" />
                {deliveryMethod === 'uber' ? 'Payment: Instapay / Telda ONLY (No Cash)' : 'Payment: Cash on Pickup or Instapay / Telda'}
              </span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFFFFF', fontWeight: 600 }}>
                {deliveryMethod === 'pickup' ? <Clock size={16} color="var(--pink)" /> : <Truck size={16} color="var(--pink)" />}
                {deliveryMethod === 'pickup' ? 'Next-day Pickup (12-8 PM)' : 'Uber Delivery'}
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={deliveryMethod === 'uber' && (!isDeliverable || !location)} 
            style={{ 
              width: '100%', padding: '18px', fontSize: '1.15rem', fontWeight: 700,
              borderRadius: '50px', letterSpacing: '0.02em', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              opacity: (deliveryMethod === 'pickup' || (deliveryMethod === 'uber' && isDeliverable && location)) ? 1 : 0.5, 
              cursor: (deliveryMethod === 'pickup' || (deliveryMethod === 'uber' && isDeliverable && location)) ? 'pointer' : 'not-allowed'
            }}
          >
            {(deliveryMethod === 'pickup' || (deliveryMethod === 'uber' && isDeliverable && location)) ? 'Confirm & Place Order' : 'Pin Location on Map'}
          </button>
        </form>
      </div>
    </div>
  );
}
