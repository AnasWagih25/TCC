'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Cookie, Package, Search } from 'lucide-react';
import { useCart, type Product } from '@/context/CartContext';
import { ProductDetailsDialog, BuildBoxDialog } from '@/components/MenuItemDialogs';
import ProductImageSlider from '@/components/ProductImageSlider';

export default function Shop() {
  const { products, categories, orders } = useCart();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const openedFromLink = useRef(false);
  const filteredProducts = products.filter(p => (category === 'all' || p.type === category) && `${p.name} ${p.description} ${p.flavor || ''}`.toLowerCase().includes(search.toLowerCase()));

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [boxModalProduct, setBoxModalProduct] = useState<Product | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('toastContainer');
    if (container) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const openDetailModal = (product: Product) => {
    const cat = categories.find(c => c.id === product.type) || categories.find(c => c.id === (product.price.mini > 0 ? 'cake' : 'cookie')) || categories[0];
    if (cat?.isBoxBuilder) {
      openBoxModal(product);
      return;
    }
    setDetailProduct(product);
  };
  const openBoxModal = (product: Product) => setBoxModalProduct(product);

  useEffect(() => {
    if (openedFromLink.current || !products.length) return;
    const productId = new URLSearchParams(window.location.search).get('product');
    const product = products.find(item => item.id === productId);
    if (product) {
      openedFromLink.current = true;
      const timer = window.setTimeout(() => openDetailModal(product), 0);
      return () => { window.clearTimeout(timer); openedFromLink.current = false; };
    }
  // Opening a product from the URL synchronizes external navigation with the dialog.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories]);

  return (
    <div className="page active polka-bg-light" id="shopPage">
      <div className="shop-page" style={{ position: 'relative' }}>
        <div className="wavy-border-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}></div>
        <div className="section-container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-header" style={{ marginBottom: '80px', position: 'relative' }}>
            <div className="sticker pink" style={{ top: '-40px', right: '10%', transform: 'rotate(15deg)', width: '100px', fontSize: '1.2rem' }}>MENU</div>
            <h1 className="section-title">Pick your happy.</h1>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', color: 'var(--pink-light)' }}>Cookies, cakes, and boxes made your way. What are you in the mood for?</p>
          </div>
          
          <div className="shop-tools"><div className="category-tabs" aria-label="Filter menu by category"><button className={`filter-chip ${category === 'all' ? 'active' : ''}`} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Everything</button>{categories.filter(cat => products.some(p => p.type === cat.id)).map(cat => <button key={cat.id} className={`filter-chip ${category === cat.id ? 'active' : ''}`} aria-pressed={category === cat.id} onClick={() => setCategory(cat.id)}>{cat.name}</button>)}</div><label className="shop-search"><Search size={17} /><span className="sr-only">Search the menu</span><input type="search" placeholder="Find your flavor…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
          <p className="shop-result-count" aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? 'concept' : 'concepts'} to make your day</p>
          <div className="shop-grid">
            {filteredProducts.length === 0 ? (
              <div className="shop-empty" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon"><Cookie size={48} color="var(--brown-light)" strokeWidth={1.5} /></div>
                <h3>{search || category !== 'all' ? 'No concepts match just yet.' : 'The next batch is on its way.'}</h3>
                <p>Try another flavor or check back for the next batch.</p>{(search || category !== 'all') && <button className="text-link" onClick={() => { setSearch(''); setCategory('all'); }}>Show the full menu</button>}
              </div>
            ) : (
              filteredProducts.map((p) => {
                const cat = categories.find(c => c.id === p.type) || categories.find(c => c.id === (p.price.mini > 0 ? 'cake' : 'cookie')) || categories[0];
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
                  displayPrice = cat?.sizeType === 'normal_mini' && p.price.mini > 0 ? `From EGP ${Number(p.price.mini).toFixed(0)}` : `EGP ${Number(p.price.normal).toFixed(0)}`;
                }

                return (
                  <div key={p.id} className="product-card" style={{ cursor: 'pointer' }}>
                    <div className="product-img-wrapper" onClick={() => openDetailModal(p)}>
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

      {detailProduct && <ProductDetailsDialog key={detailProduct.id} product={detailProduct}
        category={categories.find(cat => cat.id === detailProduct.type) || categories.find(cat => cat.id === (detailProduct.price.mini > 0 ? 'cake' : 'cookie'))}
        onClose={() => setDetailProduct(null)} onAdded={message => showToast(message, 'success')} />}
      {boxModalProduct && <BuildBoxDialog key={boxModalProduct.id} product={boxModalProduct}
        onClose={() => setBoxModalProduct(null)} onAdded={message => showToast(message, 'success')} />}
    </div>
  );
}
