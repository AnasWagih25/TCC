'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { cart } = useCart();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="nav-container">

        <div className="nav-left">
          <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinksLeft">
            <li>
              <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/shop" className={`nav-link ${pathname === '/shop' ? 'active' : ''}`}>
                Shop
              </Link>
            </li>
          </ul>
        </div>

        <Link href="/" className="nav-logo">
          <div style={{ width: '180px', height: '180px', position: 'relative' }}>
            <Image src="/images/logo-new.png" alt="The Cookie Concept Logo" fill style={{ objectFit: 'contain' }} unoptimized={true} />
          </div>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className="menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          style={{ position: 'absolute', right: '24px' }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="nav-right">
          <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinksRight">
            <li>
              <Link href="/cart" className={`nav-link cart-link ${pathname === '/cart' ? 'active' : ''}`}>
                Cart
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
