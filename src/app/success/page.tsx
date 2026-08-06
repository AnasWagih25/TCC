'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ORD-';

  return (
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
        <PartyPopper size={44} color="var(--brown)" strokeWidth={2} />
      </div>
      <h2 style={{ fontSize: '2.2rem', marginBottom: '12px', color: '#FFFFFF', fontWeight: 700 }}>Order Received! 🍪</h2>
      <p style={{ fontSize: '1.1rem', color: '#FFFFFF', marginBottom: '28px', lineHeight: 1.6 }}>
        Thank you for choosing The Cookie Concept.<br />
        Your order <strong style={{ color: 'var(--pink)', textDecoration: 'underline' }}>#{orderId}</strong> has been successfully placed.
      </p>
      <Link href="/shop" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700 }}>
        Order More Cookies
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="page active polka-bg" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px', paddingBottom: '60px' }}>
      <Suspense fallback={<div style={{ color: '#FFFFFF' }}>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
