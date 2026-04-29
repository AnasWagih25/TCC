'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, ClipboardList, FileText, Banknote, Truck, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), { 
  ssr: false, 
  loading: () => <div style={{ height: '300px', background: '#eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div> 
});

export default function CheckoutPage() {
  const { cart, placeOrder } = useCart();
  const router = useRouter();

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
      { name: '5th Settlement & New Cairo', lat: 30.0050, lng: 31.4250, radius: 30, fee: 75 },
      { name: 'Old Cairo & Southern Giza', lat: 30.0100, lng: 31.2300, radius: 25, fee: 70 },
      { name: 'Dokki & Central Giza', lat: 30.0380, lng: 31.2100, radius: 20, fee: 65 },
      { name: 'Greater Cairo & Surrounding Borders', lat: 30.0444, lng: 31.2357, radius: 60, fee: 85 }
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

  const total = subtotal + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      alert('Please pin your location on the map.');
      return;
    }
    if (!isDeliverable) {
      alert('Sorry, delivery is currently restricted to Greater Cairo, Giza, and the New Capital.');
      return;
    }
    
    // Create the order locally
    const newOrder = placeOrder({ ...formData, location }, deliveryFee);
    
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
      <div className="page active" style={{ paddingTop: '120px', minHeight: '100vh', textAlign: 'center' }}>
        <h2>Your cart is empty</h2>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => router.push('/shop')}>Go to Shop</button>
      </div>
    );
  }

  return (
    <div className="page active polka-bg-light" style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '100vh' }}>
      <div className="section-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--white)', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(99, 61, 45, 0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--pink) 0%, var(--pink-dark) 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 16px', color: '#fff'
          }}><ShoppingCart size={32} /></div>
          <h2 style={{ marginBottom: '8px', fontSize: '2rem' }}>Checkout</h2>
          <p className="modal-subtitle" style={{ marginBottom: 0, color: 'var(--brown-light)' }}>We just need a few details to get your cookies to you.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Delivery Info Section */}
          <div style={{ 
            background: 'rgba(255,255,255,0.5)', borderRadius: '16px', 
            padding: '24px', marginBottom: '24px',
            border: '1px solid rgba(250, 209, 217, 0.6)'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--brown-light)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} /> Delivery Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Full Name *</label>
                <input
                  type="text" required placeholder="e.g. Ahmed Mohamed"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Phone Number *</label>
                <input
                  type="tel" required placeholder="01xxxxxxxxx"
                  value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)' }}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Email Address *</label>
              <input
                type="email" required placeholder="you@example.com"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Delivery Address *</label>
              <textarea
                required placeholder="Street, building, floor, apartment..."
                value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Pin Your Location *</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--brown-light)', marginBottom: '12px' }}>
                Please drop a pin on the map to help us find you and accurately calculate your delivery fee.
              </p>
              <CheckoutMap onLocationSelect={(lat, lng) => setLocation({ lat, lng })} />
              {location && (
                isDeliverable ? (
                  <p style={{ fontSize: '0.85rem', color: '#27ae60', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Location pinned successfully
                  </p>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#e74c3c', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✕</span> Sorry, we only deliver to Greater Cairo, Giza, and New Capital.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div style={{ 
            background: 'rgba(255,255,255,0.5)', borderRadius: '16px', 
            padding: '24px', marginBottom: '24px',
            border: '1px solid rgba(250, 209, 217, 0.6)'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--brown-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Additional Notes
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                placeholder="Any allergies, special requests, or delivery instructions..."
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Order Summary Footer */}
          <div style={{ 
            background: 'linear-gradient(135deg, var(--brown) 0%, #4a2d20 100%)', 
            borderRadius: '16px', padding: '24px', marginBottom: '24px',
            color: '#fff', boxShadow: '0 8px 24px rgba(74, 45, 32, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Subtotal</span>
              <span>EGP {subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.95rem', opacity: 0.9 }}>
              <span>Delivery</span>
              <span>{location ? (isDeliverable ? `EGP ${deliveryFee.toFixed(2)}` : <span style={{ color: '#ffaaaa' }}>Unavailable</span>) : <span style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.8 }}>Pending Location Pin</span>}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--pink)' }}>EGP {total.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.85rem', opacity: 0.7, background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Banknote size={16} /> Cash on Delivery</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={16} /> Next-day Delivery</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!isDeliverable} style={{ 
            width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 600,
            borderRadius: '12px', letterSpacing: '0.02em', boxShadow: '0 6px 20px rgba(99, 61, 45, 0.15)',
            opacity: isDeliverable ? 1 : 0.5, cursor: isDeliverable ? 'pointer' : 'not-allowed'
          }}>
            {isDeliverable ? 'Confirm & Place Order' : 'Delivery Not Available'}
          </button>
        </form>
      </div>
    </div>
  );
}
