'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useCart, Product, Order } from '@/context/CartContext';
import { Cookie, TrendingUp, Package, Image as ImageIcon, RefreshCw } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const { products, heroImage, updateHeroImage, updateProduct, deleteProduct, addManualOrder: cartAddManualOrder, promoSettings, updatePromoSettings } = useCart();
  const router = useRouter();

  // ── Direct Firestore orders (bypasses localStorage entirely) ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const liveOrders: Order[] = [];
      ordersSnap.forEach(document => {
        liveOrders.push(document.data() as Order);
      });
      // Sort by date descending (newest first)
      liveOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOrders(liveOrders);
    } catch (err: any) {
      console.error('Failed to fetch orders from Firestore:', err);
      setOrdersError(err.message || 'Failed to load orders from database.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const markOrderFulfilled = async (index: number) => {
    const updated = [...orders];
    updated[index] = { ...updated[index], status: 'fulfilled' };
    setOrders(updated);
    try {
      await setDoc(doc(db, 'orders', updated[index].id), updated[index]);
    } catch (err) {
      console.error('Failed to update order in Firestore:', err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.error('Failed to delete order from Firestore:', err);
    }
  };

  const addManualOrder = (data: { customerName: string; total: number; productId: string; quantity: number; notes?: string }) => {
    const orderId = cartAddManualOrder(data);
    // Refresh orders list from Firestore after a short delay to pick up the new order
    setTimeout(() => fetchOrders(), 1000);
    return orderId;
  };

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings'>('orders');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [manualOrderData, setManualOrderData] = useState({
    customerName: '',
    total: '',
    productId: '',
    quantity: '',
    notes: ''
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    discountPercentage: '',
    maxCap: '',
    isActive: false
  });

  useEffect(() => {
    if (promoSettings) {
      setPromoForm({
        code: promoSettings.code,
        discountPercentage: promoSettings.discountPercentage.toString(),
        maxCap: promoSettings.maxCap.toString(),
        isActive: promoSettings.isActive
      });
    }
  }, [promoSettings]);

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePromoSettings({
      code: promoForm.code.trim().toUpperCase(),
      discountPercentage: parseFloat(promoForm.discountPercentage) || 0,
      maxCap: parseFloat(promoForm.maxCap) || 0,
      isActive: promoForm.isActive
    });
    alert('Promo code settings updated!');
  };
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: 'classic1.png'
  });

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState<'product' | 'hero'>('product');

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      setIsUploading(true);
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const storageRef = ref(storage, `images/${Date.now()}.png`);
      await uploadString(storageRef, croppedImageBase64, 'data_url');
      const url = await getDownloadURL(storageRef);

      if (cropTarget === 'hero') {
        await updateHeroImage(url);
      } else {
        setFormData({ ...formData, image: url });
      }

      setIsUploading(false);
      setIsCropping(false);
      setImageSrc(null);
    } catch (e) {
      setIsUploading(false);
      console.error(e);
      alert('Failed to crop and upload image');
    }
  };

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
    setFormData({ name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: 'classic1.png' });
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
      image: formData.image,
      images: [formData.image]
    };
    
    updateProduct(newProduct);
    setIsModalOpen(false);
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(manualOrderData.total);
    const quantity = parseInt(manualOrderData.quantity, 10);

    if (!manualOrderData.productId) {
      alert('Please select a product.');
      return;
    }

    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      alert('Please enter a valid total and quantity.');
      return;
    }

    addManualOrder({
      customerName: manualOrderData.customerName,
      total,
      productId: manualOrderData.productId,
      quantity,
      notes: manualOrderData.notes
    });

    setManualOrderData({
      customerName: '',
      total: '',
      productId: '',
      quantity: '',
      notes: ''
    });
    setIsManualOrderModalOpen(false);
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
            <button 
              className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} 
              onClick={() => setActiveTab('settings')}
            >
              Settings
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={fetchOrders}
                    disabled={ordersLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={ordersLoading ? 'spin' : ''} style={ordersLoading ? { animation: 'spin 1s linear infinite' } : {}} /> 
                    {ordersLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => setIsManualOrderModalOpen(true)}>+ Add Manual Order</button>
                </div>
              </div>

              {ordersError && (
                <div style={{ background: '#ffeaea', border: '1px solid #e74c3c', borderRadius: '12px', padding: '16px', marginBottom: '16px', color: '#c0392b', fontSize: '0.9rem' }}>
                  <strong>⚠ Error loading orders:</strong> {ordersError}
                  <br/><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Check your Firestore connection and security rules. Orders placed on the live site are saved to Firestore — this dashboard reads directly from it.</span>
                </div>
              )}

              <div className="admin-orders-list">
                {ordersLoading && orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>Loading orders from database...</div>
                ) : orders.length === 0 ? (
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
                            {o.source === 'manual' && (
                              <span style={{ marginLeft: '10px', fontSize: '0.72rem', background: 'var(--pink-light)', color: 'var(--brown)', padding: '3px 8px', borderRadius: '999px', fontFamily: '"Inter", sans-serif' }}>
                                Manual Sale
                              </span>
                            )}
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
                          {o.customer.location && (
                            <div className="order-detail-item">
                              <strong>Location Pin</strong>
                              <div style={{ marginTop: '4px' }}>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${o.customer.location?.lat},${o.customer.location?.lng}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: 'var(--brown)', textDecoration: 'underline', fontWeight: 500 }}
                                >
                                  View on Google Maps
                                </a>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(`https://www.google.com/maps/search/?api=1&query=${o.customer.location?.lat},${o.customer.location?.lng}`)}
                                  className="btn btn-sm btn-secondary" style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '0.75rem' }}
                                >
                                  Copy Link
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="order-items-list">
                          <h4>Order Items</h4>
                          {o.items.map((item, i) => (
                            <div key={i} className="order-product-row">
                              <span>{item.quantity}x {item.name}</span>
                              <span>EGP {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="order-product-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
                            <span>Delivery Fee</span>
                            <span>EGP {o.deliveryFee?.toFixed(2) || '70.00'}</span>
                          </div>
                          {o.discount && o.discount > 0 ? (
                            <div className="order-product-row" style={{ marginTop: '5px', color: '#2ecc71', fontWeight: 600 }}>
                              <span>Discount</span>
                              <span>- EGP {o.discount.toFixed(2)}</span>
                            </div>
                          ) : null}
                          <div className="order-product-row" style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #eee', fontWeight: 'bold' }}>
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
                          <button className="btn btn-sm btn-secondary" onClick={() => {
                            if (confirm(`Delete order ${o.id}? This cannot be undone.`)) deleteOrder(o.id);
                          }}>
                            Delete Order
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'products' ? (
            <div className="admin-panel active">
              <div className="admin-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <h3>Inventory & Content</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => {
                    setCropTarget('hero');
                    document.getElementById('hiddenFileInput')?.click();
                  }}>
                    <ImageIcon size={16} style={{ marginRight: '6px' }} /> Update Hero Image
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={handleOpenAddModal}>+ Add Product</button>
                </div>
              </div>
              <input type="file" id="hiddenFileInput" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
              
              <div className="admin-products-grid">
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)', gridColumn: '1/-1' }}>No products found.</div>
                ) : (
                  products.map((p, index) => (
                    <div key={p.id} className="admin-product-card">
                      <img src={p.image.startsWith('data:') ? p.image : `/images/${p.image}`} alt={p.name} className="admin-product-img" />
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
          ) : (
            <div className="admin-panel active">
              <div className="admin-toolbar">
                <h3>Store Settings</h3>
              </div>
              <div className="admin-settings-section" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #eee' }}>
                <h4 style={{ marginBottom: '16px', color: 'var(--brown)' }}>Promo Code Configuration</h4>
                <form onSubmit={handleSavePromo}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600 }}>Enable Promo Code?</label>
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={promoForm.isActive} 
                        onChange={e => setPromoForm({...promoForm, isActive: e.target.checked})} 
                        style={{ width: '20px', height: '20px' }}
                      /> <span>Active</span>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Promo Code Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SUMMER20" 
                        value={promoForm.code} 
                        onChange={e => setPromoForm({...promoForm, code: e.target.value})} 
                        disabled={!promoForm.isActive}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Discount Percentage (%)</label>
                      <input 
                        type="number" 
                        min="0" max="100" 
                        value={promoForm.discountPercentage} 
                        onChange={e => setPromoForm({...promoForm, discountPercentage: e.target.value})} 
                        disabled={!promoForm.isActive}
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Cap (EGP)</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={promoForm.maxCap} 
                        onChange={e => setPromoForm({...promoForm, maxCap: e.target.value})} 
                        disabled={!promoForm.isActive}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>Save Promo Settings</button>
                </form>
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
              <label>Product Image</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--brown-light)', margin: '2px 0 8px' }}>
                Upload an image. You can crop it to be a perfect square.
              </p>
              {formData.image && (
                <div style={{ marginBottom: '10px' }}>
                  <img src={formData.image.startsWith('data:') ? formData.image : `/images/${formData.image}`} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--brown-light)' }} />
                </div>
              )}
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => {
                  setCropTarget('product');
                  document.getElementById('hiddenFileInput')?.click();
                }}
              >
                Upload & Crop Image
              </button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Save Product</button>
          </form>
        </div>
      </div>

      {/* Manual Order Modal */}
      <div className={`modal-overlay ${isManualOrderModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <button className="modal-close" onClick={() => setIsManualOrderModalOpen(false)}>&times;</button>
          <h2>Add Manual Order</h2>

          <form onSubmit={handleCreateManualOrder}>
            <div className="form-group">
              <label>Customer Name</label>
              <input
                type="text"
                placeholder="Walk-in Customer"
                value={manualOrderData.customerName}
                onChange={e => setManualOrderData({ ...manualOrderData, customerName: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Product Sold *</label>
                <select
                  required
                  value={manualOrderData.productId}
                  onChange={e => setManualOrderData({ ...manualOrderData, productId: e.target.value })}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Revenue (EGP) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={manualOrderData.total}
                  onChange={e => setManualOrderData({ ...manualOrderData, total: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Quantity Sold *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={manualOrderData.quantity}
                  onChange={e => setManualOrderData({ ...manualOrderData, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                placeholder="e.g. Phone order paid cash"
                value={manualOrderData.notes}
                onChange={e => setManualOrderData({ ...manualOrderData, notes: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Save Manual Order
            </button>
          </form>
        </div>
      </div>
      {/* Cropper Modal */}
      {isCropping && imageSrc && (
        <div className="modal-overlay active" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ width: '90%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => { setIsCropping(false); setImageSrc(null); }}>&times;</button>
            <h2>Crop Image</h2>
            <div style={{ position: 'relative', flex: 1, width: '100%', background: '#333', marginTop: '20px', borderRadius: '8px', overflow: 'hidden' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div style={{ padding: '20px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label>Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={showCroppedImage} disabled={isUploading} style={{ width: '100%', opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? 'Uploading to Firebase...' : 'Confirm Crop'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
