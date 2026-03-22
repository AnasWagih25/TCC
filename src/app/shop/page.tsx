'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Cookie } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';

export default function Shop() {
  const { products, addToCart } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'Normal' | 'Mini'>>({});

  const handleSizeChange = (id: string, size: 'Normal' | 'Mini') => {
    setSelectedSizes(prev => ({ ...prev, [id]: size }));
  };

  const handleAddToCart = (id: string, size: 'Normal' | 'Mini') => {
    const result = addToCart(id, size);
    if (!result.success) {
       // Using our custom toast from globals.css logic or alert for now
       // In a full React app we'd build a Toast Provider, but we'll use a simple alert for brevity or trigger the DOM element
       const container = document.getElementById('toastContainer');
       if (container) {
         const toast = document.createElement('div');
         toast.className = `toast error`;
         toast.innerHTML = `<span>✕</span><span>${result.message}</span>`;
         container.appendChild(toast);
         setTimeout(() => toast.remove(), 3000);
       }
    } else {
       const container = document.getElementById('toastContainer');
       if (container) {
         const toast = document.createElement('div');
         toast.className = `toast success`;
         toast.innerHTML = `<span>✓</span><span>${result.message}</span>`;
         container.appendChild(toast);
         setTimeout(() => toast.remove(), 3000);
       }
    }
  };

  return (
    <div className="page active polka-bg-light" id="shopPage">
      <div className="shop-page" style={{ position: 'relative' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header" style={{ marginBottom: '80px', position: 'relative' }}>
            <div className="sticker brown" style={{ top: '-40px', right: '10%', transform: 'rotate(15deg)', width: '100px', fontSize: '1.2rem' }}>MENU</div>
            <h2 className="section-title" style={{ fontSize: '3.5rem' }}>Our Cookie Menu</h2>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px' }}>Add your favorite concepts to the cart. Fresh batches baked daily.</p>
          </div>
          
          <div className="shop-grid">
            {products.length === 0 ? (
              <div className="shop-empty" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon"><Cookie size={48} color="var(--brown-light)" strokeWidth={1.5} /></div>
                <h3>No cookies baked today</h3>
                <p>Check back later for fresh concepts.</p>
              </div>
            ) : (
              products.map((p) => {
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
                      
                      {(() => {
                        const size = selectedSizes[p.id] || 'Normal';
                        const currentPrice = size === 'Normal' ? p.price.normal : p.price.mini;
                        return (
                          <>
                            <div className="size-selector" style={{ background: 'var(--off-white)', padding: '5px', borderRadius: '50px', display: 'flex', gap: '0' }}>
                              <button 
                                className={size === 'Normal' ? 'active' : ''} 
                                onClick={() => handleSizeChange(p.id, 'Normal')}
                                style={{ flex: 1, borderRadius: '50px', border: 'none', padding: '8px 0', fontSize: '1rem', background: size === 'Normal' ? 'var(--pink)' : 'transparent', fontWeight: size === 'Normal' ? 700 : 500, transition: '0.2s', color: 'var(--brown)' }}
                              >
                                <div style={{ lineHeight: 1.1 }}>Normal</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>(8 Slices)</div>
                              </button>
                              <button 
                                className={size === 'Mini' ? 'active' : ''} 
                                onClick={() => handleSizeChange(p.id, 'Mini')}
                                style={{ flex: 1, borderRadius: '50px', border: 'none', padding: '8px 0', fontSize: '1rem', background: size === 'Mini' ? 'var(--pink)' : 'transparent', fontWeight: size === 'Mini' ? 700 : 500, transition: '0.2s', color: 'var(--brown)' }}
                              >
                                <div style={{ lineHeight: 1.1 }}>Mini</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>(5 Slices)</div>
                              </button>
                            </div>
                            <div className="product-footer">
                              <span className="product-price">EGP {Number(currentPrice).toFixed(2)}</span>
                              <button 
                                className="add-to-cart-btn btn-primary" 
                                onClick={() => handleAddToCart(p.id, size)}
                                disabled={isOutOfStock}
                              >
                                {isOutOfStock ? 'Sold Out' : '+ Add to Cart'}
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
