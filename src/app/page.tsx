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
  const { products, heroImage } = useCart();
  const featuredProducts = products.slice(0, 3);
  
  return (
    <div className="page active" id="homePage">
      {/* Hero */}
      <header className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="hero-blob"></div>
        <div className="hero-container">
          <div className="hero-text" style={{ position: 'relative', zIndex: 10 }}>
            <div className="hero-badge" style={{ backgroundColor: 'var(--pink)', color: 'var(--brown)' }}>Freshly Baked Daily</div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(4rem, 8vw, 6.5rem)', lineHeight: 0.9 }}>
              BAKING <br/>
              <span style={{ color: 'var(--pink-dark)' }}>ENDLESS</span><br/>
              HAPPINESS
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.2rem', marginTop: '20px', fontWeight: 500 }}>
              Artisan cookies made with premium ingredients, baked fresh daily, and delivered straight to your door. Indulge in perfection.
            </p>
            <div className="hero-buttons">
              <Link href="/shop" className="btn btn-primary">Order Your Box Today</Link>
            </div>
          </div>
          <div className="hero-image-presentation" style={{ zIndex: 10 }}>
            <div className="hero-arch" style={{ background: 'var(--brown)' }}></div>
            <div className="hero-image-container">
              <img src={resolveImageUrl(heroImage)} alt="Premium Artisan Cookie" className="hero-cookie-premium" style={{ transform: 'rotate(15deg)' }} />
            </div>
            <div className="sticker pink" style={{ bottom: '10%', right: '10%', transform: 'rotate(-5deg)', width: '120px', fontSize: '1.2rem' }}>LOVE AT<br/>FIRST<br/>BITE</div>
          </div>
        </div>
      </header>

      {/* About */}
      <section className="about" id="homePage-about" style={{ position: 'relative', background: 'var(--white)', padding: '120px 24px' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '3rem' }}>Turning Dough Into<br/>Delicious Fun and Yum!</h2>
            <p className="section-subtitle">We believe that every cookie should be an experience. Packed with flavor, baked with care.</p>
          </div>
          <div className="about-grid">
            <div className="about-card" style={{ borderRadius: '40px', border: 'none', background: 'var(--pink-light)', transform: 'rotate(-2deg)' }}>
              <div className="about-icon" style={{ background: 'var(--white)' }}><Star size={32} color="var(--pink-dark)" strokeWidth={2.5} /></div>
              <h3 style={{ fontSize: '1.5rem' }}>Premium Ingredients</h3>
              <p>Pure & simple. Naturally fresh, nothing artificial. Vibrant goodness in every bite.</p>
            </div>
            <div className="about-card" style={{ borderRadius: '40px', border: '3px solid var(--pink)', transform: 'translateY(20px) rotate(2deg)' }}>
              <div className="about-icon"><ChefHat size={32} color="var(--brown)" strokeWidth={2} /></div>
              <h3 style={{ fontSize: '1.5rem' }}>Artisan Crafted</h3>
              <p>Every cookie is mixed and baked by hand ensuring perfect texture every time.</p>
            </div>
            <div className="about-card" style={{ borderRadius: '40px', border: 'none', background: 'var(--pink)', transform: 'rotate(-1deg)' }}>
              <div className="about-icon" style={{ background: 'var(--white)' }}><Truck size={32} color="var(--brown)" strokeWidth={2} /></div>
              <h3 style={{ fontSize: '1.5rem' }}>Delivered Fresh</h3>
              <p>Baked fresh the morning of your delivery. Guaranteed baked daily just for you.</p>
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
