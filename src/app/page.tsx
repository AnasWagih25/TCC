'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ChefHat, Truck, Cookie, Sparkles, Copy, Check, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';
import OptimizedImage from '@/components/OptimizedImage';

export default function Home() {
  const router = useRouter();
  const { products, heroImage, heroRotationEnabled } = useCart();
  const featuredProducts = products.slice(0, 3);
  const [showSecretQuirkModal, setShowSecretQuirkModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCookieClick = () => {
    setShowSecretQuirkModal(true);
  };

  const handleCopyCode = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('Quirk');
    }
    setCopiedCode(true);
    setTimeout(() => {
      setCopiedCode(false);
      setShowSecretQuirkModal(false);
      router.push('/shop');
    }, 1200);
  };

  return (
    <div className="page active" id="homePage">
      {/* Hero */}
      <header className="hero" style={{ position: 'relative', overflow: 'hidden', background: 'var(--brown)' }}>
        <div className="hero-blob"></div>
        <div className="hero-container">
          <div className="hero-text" style={{ position: 'relative', zIndex: 10 }}>
            <div className="hero-badge" style={{ backgroundColor: 'var(--pink)', color: 'var(--brown)', padding: '8px 20px', borderRadius: '50px', letterSpacing: '1px', fontWeight: 700 }}>Freshly Baked Daily</div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(3.5rem, 7.5vw, 6.5rem)', lineHeight: 0.95, color: '#FFFFFF' }}>
              BAKING <br />
              <span style={{ color: 'var(--pink)' }}>ENDLESS</span><br />
              HAPPINESS
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.2rem', marginTop: '20px', fontWeight: 500, color: 'var(--pink-light)' }}>
              Artisan cookies made with premium ingredients, baked fresh daily, and delivered straight to your door. Indulge in perfection.
            </p>
            <div className="hero-buttons">
              <Link href="/shop" className="btn btn-primary">Order Your Box Today</Link>
            </div>
          </div>
          <div className="hero-image-presentation" style={{ position: 'relative', zIndex: 10 }}>
            <div 
              className={`hero-cookie-wrapper ${heroRotationEnabled ? 'rotate-360-slow' : ''}`}
              onClick={handleCookieClick}
              style={{ cursor: 'pointer' }}
              title="Click the spinning cookie for a secret!"
            >
              <OptimizedImage 
                src={heroImage} 
                alt="Premium Artisan Cookie" 
                priority={true}
                fill
                objectFit="contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="hero-cookie-premium"
                style={heroRotationEnabled ? undefined : { transform: 'rotate(15deg)' }} 
              />
            </div>
            <div className="sticker" style={{ background: '#FFFFFF', color: 'var(--brown)', transform: 'rotate(-5deg)' }}>LOVE AT<br />FIRST<br />BITE</div>
          </div>
        </div>
      </header>

      {/* About */}
      <section className="about" id="homePage-about" style={{ position: 'relative', background: 'var(--brown)', padding: '120px 24px' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '3rem', color: '#FFFFFF' }}>Turning Dough Into<br />Delicious Fun and Yum!</h2>
            <p className="section-subtitle" style={{ color: 'var(--pink-light)' }}>We believe that every cookie should be an experience. Packed with flavor, baked with care.</p>
          </div>
          <div className="about-grid">
            <div className="about-card" style={{ borderRadius: '28px', border: '2px solid var(--pink)', background: 'var(--card-brown)', color: '#FFFFFF', transform: 'rotate(-1deg)' }}>
              <div className="about-icon" style={{ background: 'var(--pink)', color: 'var(--brown)' }}><Star size={28} color="var(--brown)" strokeWidth={2.5} /></div>
              <h3 style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>Premium Ingredients</h3>
              <p style={{ color: 'var(--pink-light)' }}>Pure &amp; simple. Naturally fresh, nothing artificial. Vibrant goodness in every bite.</p>
            </div>
            <div className="about-card" style={{ borderRadius: '28px', border: '2px solid var(--pink)', background: 'var(--card-brown)', color: '#FFFFFF', transform: 'translateY(16px) rotate(1deg)' }}>
              <div className="about-icon" style={{ background: 'var(--pink)', color: 'var(--brown)' }}><ChefHat size={28} color="var(--brown)" strokeWidth={2} /></div>
              <h3 style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>Artisan Crafted</h3>
              <p style={{ color: 'var(--pink-light)' }}>Every cookie is mixed and baked by hand ensuring perfect texture every time.</p>
            </div>
            <div className="about-card" style={{ borderRadius: '28px', border: '2px solid var(--pink)', background: 'var(--card-brown)', color: '#FFFFFF', transform: 'rotate(-1deg)' }}>
              <div className="about-icon" style={{ background: 'var(--pink)', color: 'var(--brown)' }}><Truck size={28} color="var(--brown)" strokeWidth={2} /></div>
              <h3 style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>Delivered Fresh</h3>
              <p style={{ color: 'var(--pink-light)' }}>Baked fresh the morning of your delivery. Guaranteed baked daily just for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="featured">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Fan Favorites</span>
            <h2 className="section-title">Most Loved Concepts</h2>
          </div>
          <div className="featured-grid">
            {featuredProducts.length === 0 ? (
              <div className="shop-empty" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon"><Cookie size={48} color="var(--brown-light)" strokeWidth={1.5} /></div>
                <h3>No cookies baked today</h3>
              </div>
            ) : (
              featuredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 10;
                return (
                  <div key={p.id} className="product-card">
                    <div className="product-img-wrapper">
                      {isOutOfStock ? (
                        <span className="product-stock-badge stock-out">Sold Out</span>
                      ) : isLowStock ? (
                        <span className="product-stock-badge stock-low">Only {p.stock} left</span>
                      ) : (
                        <span className="product-stock-badge stock-in">In Stock</span>
                      )}
                      <div style={{ padding: '1rem', height: '100%' }}>
                        <ProductImageSlider images={p.images || [p.image]} alt={p.name} />
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{p.name}</h3>
                      <p className="product-desc">{p.description}</p>
                      <div className="product-footer">
                        <span className="product-price"><span className="currency">from EGP </span>{Number(p.price.mini).toFixed(2)}</span>
                        <Link href="/shop" className="btn btn-sm btn-secondary">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/shop" className="btn btn-primary">View Full Menu</Link>
          </div>
        </div>
      </section>

      {/* Secret Quirk Easter Egg Modal */}
      <div className={`modal-overlay ${showSecretQuirkModal ? 'active' : ''}`} onClick={() => setShowSecretQuirkModal(false)}>
        <div className="modal secret-quirk-modal" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setShowSecretQuirkModal(false)}
            className="modal-close-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="secret-quirk-icon">
            <Sparkles size={36} color="var(--brown)" />
          </div>

          <h3 className="secret-quirk-title">
            Shhh... You Found the Secret Quirk! 🍪✨
          </h3>

          <p className="secret-quirk-desc">
            Look at you clicking around! Curiosity pays off—here is <strong>5% OFF</strong> your order for finding this secret quirk.
          </p>

          <div className="secret-quirk-box">
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--pink-light)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Secret Promo Code</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-fredoka)' }}>Quirk</div>
            </div>
            <button 
              onClick={handleCopyCode}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: copiedCode ? '#2ecc71' : 'var(--pink)',
                color: copiedCode ? '#FFFFFF' : 'var(--brown)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {copiedCode ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Code</>}
            </button>
          </div>

          <button 
            onClick={handleCopyCode}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 24px', fontSize: '1rem', fontWeight: 700 }}
          >
            Claim 5% Off &amp; Order Now 🛒
          </button>
        </div>
      </div>
    </div>
  );
}
