import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer wavy-border-top">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ width: '140px', height: '140px', position: 'relative', marginBottom: '16px' }}>
              <img src="/images/logo-new.png" alt="The Cookie Concept Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Artisan cookies baked fresh daily in town. Experience perfection in every bite.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <Link href="/">Home</Link>
            <Link href="/shop">Shop Online</Link>
            <Link href="/cart">Your Cart</Link>
          </div>
          <div className="footer-col">
            <h4>Contact Us</h4>
            <a href="mailto:hello@cookieconcept.com">hello@cookieconcept.com</a>
            <a href="tel:15550000000">+1 (555) 000-0000</a>
            <br />
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
