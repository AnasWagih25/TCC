'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, ChefHat, Truck, Cookie } from 'lucide-react';
import { useCart, resolveImageUrl } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';

export default function Home() {
  const router = useRouter();
  const { products, heroImage, heroRotationEnabled } = useCart();
  const featuredProducts = products.slice(0, 3);

  return (
    <div className="page active" id="homePage">
      {/* Hero */}
      <header className="hero" style={{ position: 'relative', overflow: 'hidden', background: 'var(--brown)' }}>
        <div className="hero-blob"></div>
        <div className="hero-container">
          <div className="hero-text" style={{ position: 'relative', zIndex: 10 }}>
            <div className="hero-badge" style={{ backgroundColor: 'var(--pink)', color: 'var(--brown)', padding: '8px 20px', borderRadius: '50px', letterSpacing: '1px', fontWeight: 700 }}>Freshly Baked Daily</div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(4rem, 8vw, 6.5rem)', lineHeight: 0.9, color: '#FFFFFF' }}>
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
            <img 
              src={resolveImageUrl(heroImage)} 
              alt="Premium Artisan Cookie" 
              className={`hero-cookie-premium ${heroRotationEnabled ? 'rotate-360-slow' : ''}`} 
              style={heroRotationEnabled ? undefined : { transform: 'rotate(15deg)' }} 
            />
            <div className="sticker" style={{ background: '#FFFFFF', color: 'var(--brown)', position: 'absolute', bottom: '10%', right: '12%', transform: 'rotate(-5deg)', width: '110px', height: '110px', fontSize: '1.1rem', zIndex: 20 }}>LOVE AT<br />FIRST<br />BITE</div>
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
              <p style={{ color: 'var(--pink-light)' }}>Pure & simple. Naturally fresh, nothing artificial. Vibrant goodness in every bite.</p>
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
    </div>
  );
}
