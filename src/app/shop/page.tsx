'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Cookie, Minus, Plus, Package, X, ShoppingCart, AlertCircle } from 'lucide-react';
import { useCart, resolveImageUrl, type BoxFlavorSelection, type Product } from '@/context/CartContext';
import ProductImageSlider from '@/components/ProductImageSlider';
import OptimizedImage from '@/components/OptimizedImage';

export default function Shop() {
  const { products, addToCart, addBoxToCart, categories, orders } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'Normal' | 'Mini'>>({});

  // Product detail modal state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailSize, setDetailSize] = useState<'Normal' | 'Mini'>('Normal');
  const [detailCustomizations, setDetailCustomizations] = useState<Record<string, boolean>>({});
  const [detailCustomizationTexts, setDetailCustomizationTexts] = useState<Record<string, string>>({});
  
  // Box builder modal state
  const [boxModalProduct, setBoxModalProduct] = useState<Product | null>(null);
  const [boxModalSize, setBoxModalSize] = useState<number | null>(null);
  const [boxModalSelections, setBoxModalSelections] = useState<Record<string, number>>({});
  const [boxModalCustomizations, setBoxModalCustomizations] = useState<Record<string, boolean>>({});
  const [boxModalCustomizationTexts, setBoxModalCustomizationTexts] = useState<Record<string, string>>({});

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
    const cat = categories.find(c => c.id === detailProduct?.type);
    const selectedCustomizations = detailProduct?.customizations?.filter(c => detailCustomizations[c.name]).map(c => {
      const sizePrice = cat?.sizeType === 'normal_mini' ? c.pricing?.[size] : c.price;
      const displayPrice = sizePrice !== undefined ? sizePrice : c.price;
      const text = detailCustomizationTexts[c.name];
      return {
        name: c.name,
        price: displayPrice,
        ...(text ? { text } : {})
      };
    }) || [];
    const result = addToCart(id, size, flavorName, selectedCustomizations);
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success && detailProduct) setDetailProduct(null);
  };

  // Product detail modal helpers
  const openDetailModal = (product: Product) => {
    const cat = categories.find(c => c.id === product.type) || categories[0];
    if (cat?.isBoxBuilder) {
      openBoxModal(product);
      return;
    }
    setDetailProduct(product);
    setDetailSize('Normal');
    setDetailCustomizations({});
    setDetailCustomizationTexts({});
  };
  const closeDetailModal = () => setDetailProduct(null);

  // Box modal helpers
  const openBoxModal = (product: Product) => {
    setBoxModalProduct(product);
    setBoxModalSize(null);
    setBoxModalSelections({});
    setBoxModalCustomizations({});
    setBoxModalCustomizationTexts({});
  };

  const closeBoxModal = () => {
    setBoxModalProduct(null);
    setBoxModalSize(null);
    setBoxModalSelections({});
    setBoxModalCustomizations({});
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
    
    const cat = categories.find(c => c.id === boxModalProduct?.type);
    const selectedCustomizations = boxModalProduct?.customizations?.filter(c => boxModalCustomizations[c.name]).map(c => {
      const sizePrice = boxModalSize ? c.pricing?.[boxModalSize.toString()] : c.price;
      const displayPrice = sizePrice !== undefined ? sizePrice : c.price;
      const text = boxModalCustomizationTexts[c.name];
      return {
        name: c.name,
        price: displayPrice,
        ...(text ? { text } : {})
      };
    }) || [];
    const result = addBoxToCart(boxModalProduct.id, boxModalSize, selections, selectedCustomizations);
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
    if (boxModalProduct.customizations) {
      boxModalProduct.customizations.forEach(c => {
        if (boxModalCustomizations[c.name]) surcharge += c.price;
      });
    }
    return { basePrice, surcharge, total: basePrice + surcharge };
  };

  return (
    <div className="page active polka-bg-light" id="shopPage">
      <div className="shop-page" style={{ position: 'relative' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header" style={{ marginBottom: '80px', position: 'relative' }}>
            <div className="sticker pink" style={{ top: '-40px', right: '10%', transform: 'rotate(15deg)', width: '100px', fontSize: '1.2rem' }}>MENU</div>
            <h2 className="section-title" style={{ fontSize: '3.5rem', color: '#FFFFFF' }}>Our Cookie Menu</h2>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', color: 'var(--pink-light)' }}>Add your favorite concepts to the cart. Fresh batches baked daily.</p>
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
                const cat = categories.find(c => c.id === p.type) || categories[0];
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 10;
                const isBoxProduct = cat?.isBoxBuilder;
                const isCk = cat?.flavorType === 'single';

                // Calculate product sales to determine automatic best seller per category
                const salesCount = orders.reduce((sum, ord) => sum + (ord.items?.filter(it => it.id === p.id).reduce((s, it) => s + it.quantity, 0) || 0), 0);
                const isTopSeller = salesCount > 0 && products
                  .filter(other => (other.type || categories[0]?.id) === (p.type || categories[0]?.id))
                  .every(other => {
                    const otherSales = orders.reduce((sum, ord) => sum + (ord.items?.filter(it => it.id === other.id).reduce((s, it) => s + it.quantity, 0) || 0), 0);
                    return salesCount >= otherSales;
                  });

                const isHiddenBadge = p.badge === 'NONE' || p.badge === 'none';
                const displayBadge = isHiddenBadge ? null : (p.badge || (isTopSeller ? 'BEST SELLER' : null));

                let displayPrice = '';
                if (isBoxProduct) {
                  const boxOpts = p.boxPricing && p.boxPricing.length > 0 ? p.boxPricing : (p.boxSizes || []).map(s => ({ size: s, price: 0 }));
                  const low = Math.min(...boxOpts.map(o => o.price));
                  displayPrice = low > 0 ? `From EGP ${low}` : 'Custom Box';
                } else {
                  displayPrice = `EGP ${Number(p.price.normal).toFixed(0)}`;
                }

                return (
                  <div key={p.id} className="product-card" onClick={() => openDetailModal(p)} style={{ cursor: 'pointer' }}>
                    <div className="product-img-wrapper">
                      {isOutOfStock ? (
                        <span className="product-stock-badge stock-out">Sold Out</span>
                      ) : isLowStock ? (
                        <span className="product-stock-badge stock-low">Only {p.stock} left</span>
                      ) : (
                        <span className="product-stock-badge stock-in">In Stock</span>
                      )}

                      {displayBadge && (
                        <span className={`product-tag-badge ${
                          displayBadge.toUpperCase().includes('BEST') ? 'badge-bestseller' :
                          displayBadge.toUpperCase().includes('NEW') ? 'badge-new' :
                          displayBadge.toUpperCase().includes('LIMITED') ? 'badge-limited' : 'badge-default'
                        }`}>
                          {displayBadge}
                        </span>
                      )}
                      <div style={{ padding: '1rem', height: '100%' }}>
                        <ProductImageSlider images={p.images || [p.image]} alt={p.name} />
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{p.name}</h3>
                      <p className="product-desc">{(isCk && !cat?.hasDescription) ? (p.flavor || '') : p.description}</p>
                      <div className="product-footer">
                        <span className="product-price">{displayPrice}</span>
                        <button
                          className="add-to-cart-btn btn-primary"
                          onClick={(e) => { e.stopPropagation(); openDetailModal(p); }}
                          disabled={isOutOfStock}
                          style={isBoxProduct ? { display: 'flex', alignItems: 'center', gap: '6px' } : {}}
                        >
                          {isOutOfStock ? 'Sold Out' : isBoxProduct ? (<><Package size={16} /> Build Box</>) : 'View Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          PRODUCT DETAIL MODAL
          ══════════════════════════════════════════════ */}
      <div className={`modal-overlay ${detailProduct ? 'active' : ''}`} onClick={closeDetailModal}>
        {detailProduct && (() => {
          const p = detailProduct;
          const cat = categories.find(c => c.id === p.type) || categories[0];
          const isOut = p.stock <= 0;
          const isLow = p.stock > 0 && p.stock <= 10;
          const isCk = cat?.sizeType === 'none';
          let curPrice = isCk ? p.price.normal : (detailSize === 'Normal' ? p.price.normal : p.price.mini);
          if (p.customizations) {
            p.customizations.forEach(c => {
              if (detailCustomizations[c.name]) {
                const sizePrice = cat?.sizeType === 'normal_mini' ? c.pricing?.[detailSize] : c.price;
                curPrice += (sizePrice !== undefined ? sizePrice : c.price);
              }
            });
          }
          return (
            <div className="modal pdm" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
              <button className="modal-close" onClick={closeDetailModal} style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', borderRadius: '50%', width: '36px', height: '36px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <X size={18} color="var(--brown)" />
              </button>
              {/* Hero image */}
              <div className="modal-hero-img-container" style={{ width: '100%', height: 'clamp(140px, 32vw, 210px)', background: 'var(--off-white)', position: 'relative', overflow: 'hidden' }}>
                <OptimizedImage src={p.image} alt={p.name} fill sizes="(max-width: 768px) 100vw, 480px" />
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 5 }}>
                  {isOut ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '50px', background: 'rgba(231,76,60,0.9)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}><AlertCircle size={14} /> Sold Out</span>
                  ) : isLow ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '50px', background: 'rgba(243,156,18,0.9)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>Only {p.stock} left!</span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '50px', background: 'rgba(46,204,113,0.9)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}><Cookie size={14} /> In Stock</span>
                  )}
                </div>
              </div>
              {/* Content */}
              <div className="modal-body-content" style={{ padding: '16px 18px 18px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.2 }}>{p.name}</h2>
                {cat?.flavorType === 'single' && p.flavor ? (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pink)', fontSize: '0.9rem', margin: '0 0 16px', fontStyle: 'italic' }}><Cookie size={14} /> {p.flavor}</p>
                ) : p.description ? (
                  <p style={{ color: 'var(--pink-light)', fontSize: '0.88rem', margin: '0 0 16px', lineHeight: 1.5 }}>{p.description}</p>
                ) : null}

                {/* Size selector for cakes */}
                {cat?.sizeType === 'normal_mini' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Choose Size</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['Normal', 'Mini'] as const).map(sz => {
                        const active = detailSize === sz;
                        const pr = sz === 'Normal' ? p.price.normal : p.price.mini;
                        return (
                          <button key={sz} onClick={() => setDetailSize(sz)} style={{ flex: 1, padding: '12px 8px', borderRadius: '14px', border: active ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.3)', background: active ? 'var(--pink)' : '#3B2116', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: active ? 'var(--brown)' : '#FFFFFF' }}>{sz}</span>
                            <span style={{ fontSize: '0.72rem', color: active ? 'var(--brown)' : 'var(--pink-light)' }}>{sz === 'Normal' ? '7-8 Slices' : '5 Slices'}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? 'var(--brown)' : 'var(--pink)', marginTop: '2px' }}>EGP {Number(pr).toFixed(0)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customizations */}
                {p.customizations && p.customizations.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Extra Options</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.customizations.map(c => {
                        const sizePrice = cat?.sizeType === 'normal_mini' ? c.pricing?.[detailSize] : c.price;
                        const displayPrice = sizePrice !== undefined ? sizePrice : c.price;
                        const isChecked = !!detailCustomizations[c.name];
                        return (
                          <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '12px', background: isChecked ? '#3B2116' : 'rgba(0, 0, 0, 0.2)', border: isChecked ? '1.5px solid var(--pink)' : '1px solid rgba(243, 195, 206, 0.2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked}
                                onChange={e => setDetailCustomizations(prev => ({ ...prev, [c.name]: e.target.checked }))}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--pink)' }} />
                              <span style={{ fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 600, flex: 1 }}>{c.name}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--pink)', fontWeight: 700 }}>+ EGP {displayPrice.toFixed(0)}</span>
                            </label>
                            {c.requiresText && isChecked && (
                              <input type="text" placeholder="Enter text here..." 
                                value={detailCustomizationTexts[c.name] || ''}
                                onChange={e => setDetailCustomizationTexts(prev => ({ ...prev, [c.name]: e.target.value }))}
                                style={{ marginLeft: '28px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#2D1A12', color: '#FFFFFF', fontSize: '0.82rem', outline: 'none' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(243, 195, 206, 0.2)' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--pink-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>EGP {Number(curPrice).toFixed(2)}</div>
                  </div>
                  <button
                    disabled={isOut}
                    onClick={() => handleAddToCart(p.id, isCk ? 'Normal' : detailSize)}
                    style={{ flex: 1, padding: '14px 20px', borderRadius: '50px', border: 'none', background: isOut ? '#555' : 'var(--pink)', color: isOut ? '#fff' : 'var(--brown)', fontSize: '0.95rem', fontWeight: 700, cursor: isOut ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', fontFamily: 'var(--font-body)', opacity: isOut ? 0.6 : 1 }}
                  >
                    {isOut ? 'Sold Out' : (<><ShoppingCart size={18} /> Add to Cart</>)}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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
                  <div style={{ width: '100%', height: 'clamp(120px, 25vw, 180px)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: 'var(--off-white)', position: 'relative' }}>
                    <OptimizedImage src={p.image} alt={p.name} fill sizes="(max-width: 768px) 100vw, 600px" />
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
                            border: isActive ? '2.5px solid var(--pink)' : '1.5px solid rgba(243, 195, 206, 0.3)',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 700 : 500,
                            background: isActive ? 'var(--pink)' : '#3B2116',
                            color: isActive ? 'var(--brown)' : '#FFFFFF',
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
                            <span style={{ fontSize: '0.78rem', color: isActive ? 'var(--brown)' : 'var(--pink-light)' }}>
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
                        background: isFull ? 'rgba(46,204,113,0.25)' : 'var(--pink)',
                        color: isFull ? '#2ecc71' : 'var(--brown)',
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
                            padding: '10px 12px', borderRadius: '12px',
                            background: qty > 0 ? '#3B2116' : 'rgba(0, 0, 0, 0.2)',
                            border: `1.5px solid ${qty > 0 ? 'var(--pink)' : 'rgba(243, 195, 206, 0.2)'}`,
                            transition: '0.2s',
                          }}>
                            {flavor.image && (
                              <div style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                <OptimizedImage src={flavor.image} alt={flavor.name} fill sizes="38px" />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {flavor.name}
                              </div>
                              {hasSurcharge ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--pink)', fontWeight: 700 }}>
                                  + EGP {flavor.price.toFixed(0)} each
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--pink-light)' }}>
                                  Included
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleBoxFlavorQty(flavor.name, -1, boxModalSize)}
                                disabled={qty <= 0}
                                style={{
                                  width: '32px', height: '32px', borderRadius: '50%',
                                  border: 'none', background: qty > 0 ? 'var(--pink)' : 'rgba(255,255,255,0.1)',
                                  color: qty > 0 ? 'var(--brown)' : '#888', cursor: qty > 0 ? 'pointer' : 'default',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: '0.15s', fontWeight: 700
                                }}
                              >
                                <Minus size={16} />
                              </button>
                              <span style={{ width: '28px', textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                                {qty}
                              </span>
                              <button
                                onClick={() => handleBoxFlavorQty(flavor.name, 1, boxModalSize)}
                                disabled={totalPicked >= boxModalSize}
                                style={{
                                  width: '32px', height: '32px', borderRadius: '50%',
                                  border: 'none', background: totalPicked < boxModalSize ? 'var(--pink)' : 'rgba(255,255,255,0.1)',
                                  color: totalPicked < boxModalSize ? 'var(--brown)' : '#888', cursor: totalPicked < boxModalSize ? 'pointer' : 'default',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: '0.15s', fontWeight: 700
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

                {/* Customizations for Box */}
                {p.customizations && p.customizations.length > 0 && (
                  <div className="form-section">
                    <div className="form-section-title">
                      <Plus size={16} /> Extra Options
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.customizations.map(c => {
                        const sizePrice = boxModalSize ? c.pricing?.[boxModalSize.toString()] : c.price;
                        const displayPrice = sizePrice !== undefined ? sizePrice : c.price;
                        const isChecked = !!boxModalCustomizations[c.name];
                        return (
                          <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '12px', background: isChecked ? '#3B2116' : 'rgba(0, 0, 0, 0.2)', border: `1.5px solid ${isChecked ? 'var(--pink)' : 'rgba(243, 195, 206, 0.2)'}` }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked}
                                onChange={e => setBoxModalCustomizations(prev => ({ ...prev, [c.name]: e.target.checked }))}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--pink)' }} />
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF', flex: 1 }}>{c.name}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--pink)', fontWeight: 700 }}>+ EGP {displayPrice.toFixed(0)}</span>
                            </label>
                            {c.requiresText && isChecked && (
                              <input type="text" placeholder="Enter text here..." 
                                value={boxModalCustomizationTexts[c.name] || ''}
                                onChange={e => setBoxModalCustomizationTexts(prev => ({ ...prev, [c.name]: e.target.value }))}
                                style={{ marginLeft: '28px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--pink)', background: '#2D1A12', color: '#FFFFFF', fontSize: '0.82rem', outline: 'none' }} />
                            )}
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--pink-light)', fontWeight: 600 }}>Box Total</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF' }}>
                        EGP {total.toFixed(0)}
                        {surcharge > 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--pink-light)', marginLeft: '6px' }}>
                            (incl. +{surcharge.toFixed(0)} surcharge)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', opacity: isFull ? 1 : 0.5, background: isFull ? 'var(--pink)' : '#555', color: isFull ? 'var(--brown)' : '#fff', fontWeight: 700 }}
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
