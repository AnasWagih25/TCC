'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useCart, Product } from '@/context/CartContext';
import { Cookie, TrendingUp, Package } from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const { products, orders, updateProduct, deleteProduct, markOrderFulfilled } = useCart();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: 'chocolate_chip.png'
  });

  // Protect Route
  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="page active" style={{ minHeight: '100vh', padding: '100px', textAlign: 'center' }}>Authenticating...</div>;

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCookiesSold = orders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: 'chocolate_chip.png' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({ 
      name: p.name, 
      description: p.description, 
      priceNormal: p.price.normal.toString(), 
      priceMini: p.price.mini.toString(), 
      stock: p.stock.toString(), 
      image: p.image 
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      name: formData.name,
      description: formData.description,
      price: {
        normal: parseFloat(formData.priceNormal) || 0,
        mini: parseFloat(formData.priceMini) || 0
      },
      stock: parseInt(formData.stock, 10),
      image: formData.image
    };
    
    updateProduct(newProduct);
    setIsModalOpen(false);
  };

  return (
    <div className="page active" id="adminDashboardPage">
      <div className="admin-page">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="logo-icon" style={{ background: 'var(--pink)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cookie size={20} color="var(--brown)" strokeWidth={2} />
              </div>
              <h2>Dashboard Concept</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)} 
                      placeholder="New Name"
                      style={{ padding: '4px 8px', fontSize: '0.9rem', width: '150px', borderRadius: '4px', border: '1px solid var(--brown)' }}
                      autoFocus
                    />
                    <button 
                      className="btn btn-sm btn-primary"
                      style={{ padding: '4px 8px' }}
                      onClick={async () => {
                        if (!user || !newName.trim()) {
                          setIsEditingName(false);
                          return;
                        }
                        try {
                          await updateProfile(user, { displayName: newName.trim() });
                          window.location.reload();
                        } catch(err: any) {
                          alert('Error: ' + err.message);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '4px 8px' }}
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="admin-welcome">Welcome, {user.displayName || user.email}</span>
                    <button 
                      onClick={() => {
                        setNewName(user.displayName || '');
                        setIsEditingName(true);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)', textDecoration: 'underline', fontSize: '0.8rem', padding: 0 }}
                      title="Edit Name"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
              <button className="btn btn-sm btn-secondary" onClick={logout}>Log Out</button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="admin-tabs">
          <div className="admin-tabs-inner">
            <button 
              className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`} 
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button 
              className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`} 
              onClick={() => setActiveTab('products')}
            >
              Products
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">
          {activeTab === 'orders' ? (
            <div className="admin-panel active">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon"><TrendingUp size={32} color="var(--brown)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} /></div>
                  <div className="stat-value">EGP {totalRevenue.toFixed(2)}</div>
                  <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><Cookie size={32} color="var(--brown)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} /></div>
                  <div className="stat-value">{totalCookiesSold}</div>
                  <div className="stat-label">Cookies Sold</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><Package size={32} color="var(--brown)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} /></div>
                  <div className="stat-value">{orders.filter(o => o.status === 'pending').length}</div>
                  <div className="stat-label">Pending Orders</div>
                </div>
              </div>

              <div className="admin-toolbar">
                <h3>Recent Orders</h3>
              </div>

              <div className="admin-orders-list">
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>No orders received yet.</div>
                ) : (
                  orders.map((o, index) => {
                    const isPending = o.status === 'pending';
                    const date = new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={o.id} className="admin-order-card">
                        <div className="order-header">
                          <div className="order-id">
                            {o.id} <span style={{ fontSize: '0.8rem', color: 'var(--gray)', fontFamily: '"Inter", sans-serif', fontWeight: 'normal', marginLeft: '10px' }}>{date}</span>
                          </div>
                          <span className={`order-status status-${o.status}`}>{isPending ? 'Pending' : 'Fulfilled'}</span>
                        </div>
                        <div className="order-details">
                          <div className="order-detail-item">
                            <strong>Customer</strong>
                            {o.customer.name}<br/>
                            {o.customer.phone}<br/>
                            {o.customer.email}
                          </div>
                          <div className="order-detail-item">
                            <strong>Delivery Address & Notes</strong>
                            {o.customer.address}<br/>
                            <span style={{ color: 'var(--pink-dark)', fontStyle: 'italic' }}>{o.customer.notes || 'No special notes'}</span>
                          </div>
                        </div>
                        <div className="order-items-list">
                          <h4>Order Items</h4>
                          {o.items.map((item, i) => (
                            <div key={i} className="order-product-row">
                              <span>{item.quantity}x {item.name}</span>
                              <span>EGP {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="order-product-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc', fontWeight: 'bold' }}>
                            <span>Total</span>
                            <span>EGP {o.total.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="order-actions">
                          {isPending ? (
                            <button className="btn btn-sm btn-primary" onClick={() => {
                              if (confirm(`Mark order ${o.id} as fulfilled?`)) markOrderFulfilled(index);
                            }}>
                              Mark Fulfilled
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-secondary" disabled>Fulfilled</button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="admin-panel active">
              <div className="admin-toolbar">
                <h3>Inventory Management</h3>
                <button className="btn btn-sm btn-primary" onClick={handleOpenAddModal}>+ Add Product</button>
              </div>
              
              <div className="admin-products-grid">
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)', gridColumn: '1/-1' }}>No products found.</div>
                ) : (
                  products.map((p, index) => (
                    <div key={p.id} className="admin-product-card">
                      <img src={`/images/${p.image}`} alt={p.name} className="admin-product-img" />
                      <div className="admin-product-info">
                        <h4>{p.name}</h4>
                        <div className="price">Normal: EGP {p.price.normal.toFixed(2)} | Mini: EGP {p.price.mini.toFixed(2)}</div>
                        <div 
                          className="stock" 
                          style={{
                             display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px',
                             ...(p.stock <= 5 ? { background: 'rgba(231,76,60,0.1)', color: '#e74c3c' } : { color: 'var(--brown-light)' })
                          }}
                        >
                          Stock: {p.stock}
                        </div>
                        <div className="admin-product-actions">
                          <button className="edit-btn" onClick={() => handleOpenEditModal(p)}>Edit</button>
                          <button className="delete-btn" onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) deleteProduct(index);
                          }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
          <h2>{editingProduct ? 'Edit Concept' : 'Add New Concept'}</h2>
          
          <form onSubmit={handleSaveProduct}>
            <div className="form-group">
              <label>Cookie Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Normal Price (EGP) *</label>
                <input type="number" required min="0.01" step="0.01" value={formData.priceNormal} onChange={e => setFormData({...formData, priceNormal: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mini Price (EGP) *</label>
                <input type="number" required min="0.01" step="0.01" value={formData.priceMini} onChange={e => setFormData({...formData, priceMini: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Stock Quantity *</label>
                <input type="number" required min="0" step="1" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Image Filename</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--brown-light)', margin: '2px 0 8px' }}>
                Required format: <strong>1024x1024px Transparent PNG</strong>. Place your image file inside the <code>public/images/</code> folder and enter the exact filename below (e.g., <code>new_cookie.png</code>).
              </p>
              <input 
                type="text" 
                required 
                placeholder="e.g. chocolate_chip.png"
                value={formData.image} 
                onChange={e => setFormData({...formData, image: e.target.value})} 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Save Product</button>
          </form>
        </div>
      </div>
    </div>
  );
}
