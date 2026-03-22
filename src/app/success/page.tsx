'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="order-success">
      <div className="success-icon"><PartyPopper size={64} color="var(--brown)" strokeWidth={1.5} /></div>
      <h2>Order Received!</h2>
      <p>Thank you for choosing The Cookie Concept. Your order #{orderId} has been placed.</p>
      <Link href="/shop" className="btn btn-primary">Order More Cookies</Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="page active polka-bg-light" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
