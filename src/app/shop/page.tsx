'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Cookie, Minus, Plus, Package, X } from 'lucide-react';
import { useCart, resolveImageUrl, type BoxFlavorSelection, type Product } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';

export default function Shop() {
  const { products, addToCart, addBoxToCart } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'Normal' | 'Mini'>>({});
  
  // Box builder modal state
  const [boxModalProduct, setBoxModalProduct] = useState<Product | null>(null);
  const [boxModalSize, setBoxModalSize] = useState<number | null>(null);
  const [boxModalSelections, setBoxModalSelections] = useState<Record<string, number>>({});

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

  // Box modal helpers
  const openBoxModal = (product: Product) => {
    setBoxModalProduct(product);
    setBoxModalSize(null);
    setBoxModalSelections({});
  };

  const closeBoxModal = () => {
    setBoxModalProduct(null);
    setBoxModalSize(null);
    setBoxModalSelections({});
  };

  const handleBoxFlavorQty = (flavorName: string, change: number, maxBox: number) => {
    setBoxModalSelections(prev => {
      const current = { ...prev };
      const currentQty = current[flavorName] || 0;
      const total = Object.values(current).reduce((s, n) => s + n, 0);
      const newQty = currentQty + change;
      
      if (newQty < 0) return prev;
      if (change > 0 && total >= maxBox) return prev;
      
      current[flavorName] = newQty;
      return current;
    });
  };

  const handleBoxAddToCart = () => {
    if (!boxModalProduct || !boxModalSize) return;
    const selections: BoxFlavorSelection[] = Object.entries(boxModalSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([name, quantity]) => ({ name, quantity }));
    
    const result = addBoxToCart(boxModalProduct.id, boxModalSize, selections);
    showToast(result.message, result.success ? 'success' : 'error');
    
    if (result.success) {
      closeBoxModal();
    }
  };

  // Compute box modal pricing
  const getBoxModalPricing = () => {
    if (!boxModalProduct || !boxModalSize) return { basePrice: 0, surcharge: 0, total: 0 };
    const boxOptions = boxModalProduct.boxPricing && boxModalProduct.boxPricing.length > 0
      ? boxModalProduct.boxPricing
      : (boxModalProduct.boxSizes || []).map(size => ({ size, price: 0 }));
    const opt = boxOptions.find(o => o.size === boxModalSize);
    const basePrice = opt?.price || 0;
    let surcharge = 0;
    for (const [fname, qty] of Object.entries(boxModalSelections)) {
      const fl = boxModalProduct.flavors?.find(f => f.name === fname);
      if (fl && fl.price > 0) surcharge += fl.price * qty;
    }
    return { basePrice, surcharge, total: basePrice + surcharge };
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
                  <div key={p.id} className="product-card">
                    {isCookieItem && p.flavors && p.flavors.length > 0 && (p.boxPricing?.length || p.boxSizes?.length) ? (
                      /* ── Cookie Boxes: Simple card with "Build Your Box" button ── */
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
                            const boxOptions = p.boxPricing && p.boxPricing.length > 0
                              ? p.boxPricing
                              : (p.boxSizes || []).map(size => ({ size, price: 0 }));
                            const lowestPrice = Math.min(...boxOptions.map(o => o.price));
                            return (
                              <div className="product-footer">
                                <span className="product-price">
                                  {lowestPrice > 0 ? `From EGP ${lowestPrice}` : 'Custom Box'}
                                </span>
                                <button 
                                  className="add-to-cart-btn btn-primary" 
                                  onClick={() => openBoxModal(p)}
                                  disabled={isOutOfStock}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  {isOutOfStock ? 'Sold Out' : (
                                    <><Package size={16} /> Build Your Box</>
                                  )}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </>
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

      {/* ══════════════════════════════════════════════
          BOX BUILDER MODAL
          ══════════════════════════════════════════════ */}
      <div className={`modal-overlay ${boxModalProduct ? 'active' : ''}`}>
        {boxModalProduct && (() => {
          const p = boxModalProduct;
          const boxOptions = p.boxPricing && p.boxPricing.length > 0
            ? p.boxPricing
            : (p.boxSizes || []).map(size => ({ size, price: 0 }));
          const totalPicked = Object.values(boxModalSelections).reduce((s, n) => s + n, 0);
          const isFull = boxModalSize != null && totalPicked === boxModalSize;
          const { basePrice, surcharge, total } = getBoxModalPricing();

          return (
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <button className="modal-close" onClick={closeBoxModal}><X size={18} /></button>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={22} /> {p.name}
                </h2>
                <p className="modal-subtitle">{p.description}</p>
              </div>

              <div className="modal-body">
                {/* Product image */}
                {p.image && (
                  <div style={{ width: '100%', height: 'clamp(120px, 25vw, 180px)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: 'var(--off-white)' }}>
                    <img src={resolveImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'none' }} />
                  </div>
                )}

                {/* Step 1: Choose box size */}
                <div className="form-section">
                  <div className="form-section-title">
                    <Package size={16} /> Choose your box
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {boxOptions.map(opt => {
                      const isActive = boxModalSize === opt.size;
                      return (
                        <button
                          key={opt.size}
                          onClick={() => {
                            setBoxModalSize(opt.size);
                            setBoxModalSelections({});
                          }}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '14px',
                            border: isActive ? '2px solid var(--brown)' : '2px solid rgba(250,209,217,0.6)',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 700 : 500,
                            background: isActive ? 'var(--pink)' : '#fff',
                            color: 'var(--brown)',
                            cursor: 'pointer',
                            transition: '0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            flex: '1 1 0',
                            minWidth: '80px',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Box of {opt.size}</span>
                          {opt.price > 0 && (
                            <span style={{ fontSize: '0.78rem', color: isActive ? 'var(--brown)' : 'var(--brown-light)' }}>
                              EGP {opt.price}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Fill your box (only after size chosen) */}
                {boxModalSize != null && (
                  <div className="form-section">
                    <div className="form-section-title" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cookie size={16} /> Fill your box
                      </div>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '4px 14px',
                        borderRadius: '50px',
                        background: isFull ? 'rgba(46,204,113,0.15)' : 'var(--pink)',
                        color: isFull ? '#27ae60' : 'var(--brown)',
                        transition: '0.25s',
                        border: 'none',
                        textTransform: 'none',
                        letterSpacing: '0',
                      }}>
                        {totalPicked} / {boxModalSize}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.flavors!.map(flavor => {
                        const qty = boxModalSelections[flavor.name] || 0;
                        const hasSurcharge = flavor.price && flavor.price > 0;
                        return (
                          <div key={flavor.name} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 10px', borderRadius: '12px',
                            background: qty > 0 ? 'rgba(250,209,217,0.2)' : '#fff',
                            border: `1.5px solid ${qty > 0 ? 'var(--pink-dark)' : 'rgba(250,209,217,0.5)'}`,
                            transition: '0.2s',
                          }}>
                            {flavor.image && (
                              <img src={resolveImageUrl(flavor.image)} alt={flavor.name}
                                style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, transform: 'none' }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--brown)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {flavor.name}
                              </div>
                              {hasSurcharge ? (
                                <div style={{ fontSize: '0.72rem', color: '#c0392b', fontWeight: 600 }}>
                                  + EGP {flavor.price.toFixed(0)} each
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.72rem', color: 'var(--brown-light)' }}>
                                  Included
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleBoxFlavorQty(flavor.name, -1, boxModalSize)}
                                disabled={qty <= 0}
                                style={{
                                  width: '30px', height: '30px', borderRadius: '50%',
                                  border: 'none', background: qty > 0 ? 'var(--pink)' : '#eee',
                                  color: 'var(--brown)', cursor: qty > 0 ? 'pointer' : 'default',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: '0.15s',
                                }}
                              >
                                <Minus size={16} />
                              </button>
                              <span style={{ width: '26px', textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--brown)' }}>
                                {qty}
                              </span>
                              <button
                                onClick={() => handleBoxFlavorQty(flavor.name, 1, boxModalSize)}
                                disabled={totalPicked >= boxModalSize}
                                style={{
                                  width: '30px', height: '30px', borderRadius: '50%',
                                  border: 'none', background: totalPicked < boxModalSize ? 'var(--pink)' : '#eee',
                                  color: 'var(--brown)', cursor: totalPicked < boxModalSize ? 'pointer' : 'default',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: '0.15s',
                                }}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: Total + Add to Cart */}
              <div className="modal-footer">
                {boxModalSize != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--brown-light)' }}>Box Total</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown)' }}>
                        EGP {total.toFixed(0)}
                        {surcharge > 0 && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--brown-light)', marginLeft: '6px' }}>
                            (incl. +{surcharge.toFixed(0)} surcharge)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', opacity: isFull ? 1 : 0.5 }}
                  disabled={!isFull}
                  onClick={handleBoxAddToCart}
                >
                  {boxModalSize == null
                    ? 'Select a box size first'
                    : !isFull
                      ? `Fill ${boxModalSize - totalPicked} more cookie${boxModalSize - totalPicked !== 1 ? 's' : ''}`
                      : '+ Add Box to Cart'
                  }
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
