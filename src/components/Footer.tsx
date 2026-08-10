import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer wavy-border-top">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo-wrapper" style={{ width: '200px', height: '60px', position: 'relative', marginBottom: '16px' }}>
              <Image 
                src="/images/logo-new.png" 
                alt="The Cookie Concept Logo" 
                fill 
                style={{ objectFit: 'contain', objectPosition: 'left center', filter: 'brightness(0) invert(1)' }} 
                unoptimized={true} 
              />
            </div>
            <p className="footer-brand-text" style={{ fontSize: '1.1rem', fontWeight: 500, color: '#FAF5EF' }}>Artisan cookies baked fresh daily in town. Experience perfection in every bite.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <Link href="/">Home</Link>
            <Link href="/shop">Shop Online</Link>
            <Link href="/cart">Your Cart</Link>
          </div>
          <div className="footer-col">
            <h4>Contact Us</h4>
            <Link href="/contact" style={{ display: 'block', marginBottom: '8px' }}>Contact Page</Link>
            <Link href="/admin/login" style={{ color: 'var(--pink-dark)', fontSize: '0.8rem' }}>
              Staff Portal
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} The Cookie Concept. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
