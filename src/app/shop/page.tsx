'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Cookie, Minus, Plus, Package } from 'lucide-react';
import { useCart, resolveImageUrl, type BoxFlavorSelection } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';

export default function Shop() {
  const { products, addToCart, addBoxToCart } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'Normal' | 'Mini'>>({});
  
  // Box builder state — keyed by product ID
  const [selectedBoxSize, setSelectedBoxSize] = useState<Record<string, number>>({});
  const [boxSelections, setBoxSelections] = useState<Record<string, Record<string, number>>>({});

  const handleSizeChange = (id: string, size: 'Normal' | 'Mini') => {
    setSelectedSizes(prev => ({ ...prev, [id]: size }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('toastContainer');
    if (container) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleAddToCart = (id: string, size: 'Normal' | 'Mini', flavorName?: string) => {
    const result = addToCart(id, size, flavorName);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  // Box builder helpers
  const getBoxTotal = (productId: string) => {
    const sels = boxSelections[productId] || {};
    return Object.values(sels).reduce((sum, n) => sum + n, 0);
  };

  const handleFlavorQty = (productId: string, flavorName: string, change: number, maxBox: number) => {
    setBoxSelections(prev => {
      const current = { ...(prev[productId] || {}) };
      const currentQty = current[flavorName] || 0;
      const total = Object.values(current).reduce((s, n) => s + n, 0);
      const newQty = currentQty + change;
      
      if (newQty < 0) return prev;
      if (change > 0 && total >= maxBox) return prev;
      
      current[flavorName] = newQty;
      return { ...prev, [productId]: current };
    });
  };

  const handleAddBox = (productId: string) => {
    const boxSize = selectedBoxSize[productId];
    const sels = boxSelections[productId] || {};
    const selections: BoxFlavorSelection[] = Object.entries(sels)
      .filter(([_, qty]) => qty > 0)
      .map(([name, quantity]) => ({ name, quantity }));
    
    const result = addBoxToCart(productId, boxSize, selections);
    showToast(result.message, result.success ? 'success' : 'error');
    
    if (result.success) {
      // Reset box builder for this product
      setBoxSelections(prev => ({ ...prev, [productId]: {} }));
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
                const isCookieItem = p.type === 'item';
                
                return (
                  <div key={p.id} className="product-card" style={isCookieItem ? { gridColumn: '1 / -1' } : undefined}>
                    {isCookieItem && p.flavors && p.flavors.length > 0 && p.boxSizes && p.boxSizes.length > 0 ? (
                      /* ── Cookie Item: Box Builder ── */
                      (() => {
                        const boxSizes = p.boxSizes!;
                        const currentBoxSize = selectedBoxSize[p.id] || boxSizes[0];
                        const sels = boxSelections[p.id] || {};
                        const totalPicked = Object.values(sels).reduce((s, n) => s + n, 0);
                        const isFull = totalPicked === currentBoxSize;
                        
                        // Calculate total price
                        let totalPrice = 0;
                        for (const [fname, qty] of Object.entries(sels)) {
                          const fl = p.flavors!.find(f => f.name === fname);
                          if (fl) totalPrice += fl.price * qty;
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                              <div className="product-img-wrapper" style={{ width: '200px', flexShrink: 0 }}>
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
                              <div className="product-info" style={{ flex: 1, minWidth: '200px' }}>
                                <h3 className="product-name">{p.name}</h3>
                                <p className="product-desc">{p.description}</p>
                                
                                {/* Box Size Selector */}
                                <div style={{ marginTop: '12px' }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Package size={16} /> Choose Box Size
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {boxSizes.map(size => (
                                      <button
                                        key={size}
                                        onClick={() => {
                                          setSelectedBoxSize(prev => ({ ...prev, [p.id]: size }));
                                          setBoxSelections(prev => ({ ...prev, [p.id]: {} }));
                                        }}
                                        style={{
                                          padding: '10px 20px',
                                          borderRadius: '50px',
                                          border: 'none',
                                          fontSize: '0.9rem',
                                          fontWeight: currentBoxSize === size ? 700 : 500,
                                          background: currentBoxSize === size ? 'var(--pink)' : 'var(--off-white)',
                                          color: 'var(--brown)',
                                          cursor: 'pointer',
                                          transition: '0.2s',
                                        }}
                                      >
                                        Box of {size}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Flavor Picker */}
                            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--off-white)', borderRadius: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown)' }}>
                                  Pick your flavors
                                </span>
                                <span style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  padding: '4px 14px',
                                  borderRadius: '50px',
                                  background: isFull ? 'rgba(46,204,113,0.15)' : 'var(--pink)',
                                  color: isFull ? '#27ae60' : 'var(--brown)',
                                  transition: '0.2s',
                                }}>
                                  {totalPicked} / {currentBoxSize}
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                {p.flavors!.map(flavor => {
                                  const qty = sels[flavor.name] || 0;
                                  return (
                                    <div key={flavor.name} style={{
                                      display: 'flex', alignItems: 'center', gap: '10px',
                                      padding: '10px 12px', borderRadius: '12px',
                                      background: qty > 0 ? 'rgba(250,209,217,0.3)' : '#fff',
                                      border: `1.5px solid ${qty > 0 ? 'var(--pink-dark)' : 'var(--pink)'}`,
                                      transition: '0.2s',
                                    }}>
                                      {flavor.image && (
                                        <img src={resolveImageUrl(flavor.image)} alt={flavor.name}
                                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                                      )}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {flavor.name}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--brown-light)' }}>
                                          EGP {flavor.price.toFixed(0)} each
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <button
                                          onClick={() => handleFlavorQty(p.id, flavor.name, -1, currentBoxSize)}
                                          disabled={qty <= 0}
                                          style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            border: 'none', background: qty > 0 ? 'var(--pink)' : '#eee',
                                            color: 'var(--brown)', cursor: qty > 0 ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', fontWeight: 700, transition: '0.15s',
                                          }}
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <span style={{ width: '24px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'var(--brown)' }}>
                                          {qty}
                                        </span>
                                        <button
                                          onClick={() => handleFlavorQty(p.id, flavor.name, 1, currentBoxSize)}
                                          disabled={totalPicked >= currentBoxSize}
                                          style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            border: 'none', background: totalPicked < currentBoxSize ? 'var(--pink)' : '#eee',
                                            color: 'var(--brown)', cursor: totalPicked < currentBoxSize ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', fontWeight: 700, transition: '0.15s',
                                          }}
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Footer: price + add to cart */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--pink)' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--brown-light)' }}>Box Total</div>
                                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brown)' }}>EGP {totalPrice.toFixed(2)}</div>
                                </div>
                                <button
                                  className="add-to-cart-btn btn-primary"
                                  disabled={isOutOfStock || !isFull}
                                  onClick={() => handleAddBox(p.id)}
                                  style={{ opacity: isFull ? 1 : 0.5 }}
                                >
                                  {isOutOfStock ? 'Sold Out' : !isFull ? `Fill ${currentBoxSize - totalPicked} more` : '+ Add Box to Cart'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* ── Cookie Cake: Normal/Mini size selector ── */
                      <>
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
                                    <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>(7-8 Slices)</div>
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
                      </>
                    )}
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
