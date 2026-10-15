'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useCart, Product, Order, Flavor, resolveImageUrl, Category, parseGoogleMapsUrl } from '@/context/CartContext';
import { Cookie, TrendingUp, Package, Image as ImageIcon, RefreshCw, Plus, Trash2 } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import ReviewAdmin from '@/components/ReviewAdmin';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const { products, heroImage, heroRotationEnabled, updateHeroImage, updateHeroRotation, updateProduct, deleteProduct, addManualOrder: cartAddManualOrder, promoSettings, updatePromoSettings, pickupSettings, updatePickupSettings, categories, addCategory, updateCategory, deleteCategory } = useCart();
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

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'reviews' | 'settings'>('orders');
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

  const [heroUrlInput, setHeroUrlInput] = useState('');

  const [pickupForm, setPickupForm] = useState({
    address: '',
    lat: 30.0444,
    lng: 31.2357,
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=30.0444,31.2357',
    hoursNotice: 'Next day from 12:00 PM to 8:00 PM only'
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

  useEffect(() => {
    if (pickupSettings) {
      setPickupForm(pickupSettings);
    }
  }, [pickupSettings]);

  useEffect(() => {
    if (heroImage) {
      setHeroUrlInput(heroImage);
    }
  }, [heroImage]);

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

  const handleSavePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseGoogleMapsUrl(pickupForm.mapUrl || '');
    const updatedSettings = {
      ...pickupForm,
      lat: parsed.lat,
      lng: parsed.lng,
      mapUrl: parsed.mapUrl,
    };
    await updatePickupSettings(updatedSettings);
    setPickupForm(updatedSettings);
    alert(`Store pickup location settings updated!\nExtracted coordinates: (${parsed.lat}, ${parsed.lng})`);
  };
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: '', flavor: ''
  });
  const [badge, setBadge] = useState<string>('');
  const [productType, setProductType] = useState<string>('cake');
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [customizations, setCustomizations] = useState<{name: string, price: number, pricing?: Record<string, number>, requiresText?: boolean}[]>([]);
  const [boxPricing, setBoxPricing] = useState<{size: number, price: number}[]>([
    { size: 6, price: 250 },
    { size: 12, price: 450 }
  ]);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<Category>({ id: '', name: '', hasDescription: true, flavorType: 'none', sizeType: 'none', isBoxBuilder: false });

  const selectedCat = categories.find(c => c.id === productType) || categories[0] || { id: '', name: '', hasDescription: true, flavorType: 'none', sizeType: 'none', isBoxBuilder: false };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const catToSave = { ...categoryForm, id: categoryForm.id || 'cat_' + Date.now() };
      if (editingCategory) {
        await updateCategory(catToSave);
      } else {
        await addCategory(catToSave);
      }
      setEditingCategory(null);
      setCategoryForm({ id: '', name: '', hasDescription: true, flavorType: 'none', sizeType: 'none', isBoxBuilder: false });
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    }
  };

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState<'product' | 'hero' | 'flavor'>('product');
  const [flavorCropIndex, setFlavorCropIndex] = useState(0);
  // When opening the cropper from within the edit modal, we hide the edit modal
  // and restore it after cropping is done
  const [modalHiddenForCrop, setModalHiddenForCrop] = useState(false);
  const modalHiddenForCropRef = useRef(false);
  const isModalOpenRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isModalOpenRef.current = isModalOpen; }, [isModalOpen]);
  useEffect(() => { modalHiddenForCropRef.current = modalHiddenForCrop; }, [modalHiddenForCrop]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        // If the edit modal is open, hide it temporarily so the cropper is accessible
        if (isModalOpenRef.current) {
          setModalHiddenForCrop(true);
          modalHiddenForCropRef.current = true;
          setIsModalOpen(false);
        }
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
      } else if (cropTarget === 'flavor') {
        setFlavors(prev => {
          const updated = [...prev];
          if (updated[flavorCropIndex]) {
            updated[flavorCropIndex] = { ...updated[flavorCropIndex], image: url };
          }
          return updated;
        });
      } else {
        setFormData(prev => ({ ...prev, image: url }));
      }

      setIsUploading(false);
      setIsCropping(false);
      setImageSrc(null);
      // Re-open the edit modal if it was hidden for cropping
      if (modalHiddenForCropRef.current) {
        setModalHiddenForCrop(false);
        modalHiddenForCropRef.current = false;
        setIsModalOpen(true);
      }
    } catch (e) {
      setIsUploading(false);
      console.error(e);
      alert('Failed to crop and upload image');
      // Re-open modal even on error
      if (modalHiddenForCropRef.current) {
        setModalHiddenForCrop(false);
        modalHiddenForCropRef.current = false;
        setIsModalOpen(true);
      }
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
    // Re-open the edit modal if it was hidden for cropping
    if (modalHiddenForCropRef.current) {
      setModalHiddenForCrop(false);
      modalHiddenForCropRef.current = false;
      setIsModalOpen(true);
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
    setFormData({ name: '', description: '', priceNormal: '399', priceMini: '250', stock: '50', image: '', flavor: '' });
    setBadge('');
    setProductType(categories.length > 0 ? categories[0].id : 'cake');
    setFlavors([]);
    setCustomizations([]);
    setBoxPricing([{ size: 6, price: 250 }, { size: 12, price: 450 }]);
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
      image: p.image,
      flavor: p.flavor || ''
    });
    setBadge(p.badge || '');
    setProductType(p.type || 'cake');
    setFlavors(p.flavors || []);
    setCustomizations(p.customizations || []);
    if (p.boxPricing) {
      setBoxPricing(p.boxPricing);
    } else if (p.boxSizes) {
      setBoxPricing(p.boxSizes.map(s => ({ size: s, price: 0 })));
    } else {
      setBoxPricing([{ size: 6, price: 250 }, { size: 12, price: 450 }]);
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCat = categories.find(c => c.id === productType) || categories[0];
    
    const productFlavors = selectedCat.flavorType === 'array' ? flavors.filter(f => f.name.trim()) : [];
    
    // Main image is always formData.image; flavor images are secondary
    const mainImage = formData.image || '';
    const flavorImages = productFlavors.map(f => f.image).filter(Boolean);
    const productImages = mainImage 
      ? [mainImage, ...flavorImages.filter(fi => fi !== mainImage)]
      : flavorImages;

    const parsedBoxPricing = selectedCat.sizeType === 'box_sizes' ? boxPricing.filter(bp => bp.size > 0 && bp.price > 0).sort((a, b) => a.size - b.size) : [];
    const parsedBoxSizes = parsedBoxPricing.map(bp => bp.size);
    
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      name: formData.name,
      description: (selectedCat.flavorType === 'single' && !selectedCat.hasDescription) ? (formData.flavor || '') : formData.description,
      price: {
        normal: parseFloat(formData.priceNormal) || 0,
        mini: selectedCat.sizeType === 'normal_mini' ? (parseFloat(formData.priceMini) || 0) : 0
      },
      stock: parseInt(formData.stock, 10),
      image: mainImage || productImages[0] || '',
      images: productImages.length > 0 ? productImages : [],
      type: productType,
      badge: badge.trim(),
      flavors: productFlavors.length > 0 ? productFlavors : [],
      boxSizes: parsedBoxSizes,
      boxPricing: parsedBoxPricing,
      customizations: customizations.filter(c => c.name.trim()),
      ...(selectedCat.flavorType === 'single' ? { flavor: formData.flavor } : {}),
    };
    
    try {
      await updateProduct(newProduct);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Failed to save product. Please try again.');
    }
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', textDecoration: 'underline', fontSize: '0.8rem', padding: 0 }}
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
            <button className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews</button>
            <button 
              className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} 
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Global hidden file input for image uploads */}
        <input type="file" id="hiddenFileInput" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

        {/* Content */}
        <div className="admin-content">
          {activeTab === 'reviews' ? <ReviewAdmin /> : activeTab === 'orders' ? (
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
                            <span style={{ 
                              marginLeft: '8px', fontSize: '0.72rem', 
                              background: o.deliveryMethod === 'pickup' ? '#347049' : 'var(--pink)',
                              color: o.deliveryMethod === 'pickup' ? 'var(--ink)' : 'var(--brown)',
                              padding: '3px 8px', borderRadius: '999px', 
                              fontFamily: '"Inter", sans-serif', fontWeight: 600 
                            }}>
                              {o.deliveryMethod === 'pickup' ? '🛍️ Pickup' : '🚗 Regular Delivery'}
                            </span>
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
                            <div key={i}>
                              <div className="order-product-row">
                                <span>{item.quantity}x {item.name}{item.boxSize ? ` (Box of ${item.boxSize})` : (item.selectedFlavor ? ` (${item.selectedFlavor})` : ` (${item.selectedSize})`)}</span>
                                <span>EGP {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                              {item.boxFlavors && item.boxFlavors.length > 0 && (
                                <div style={{ marginLeft: '16px', marginBottom: '8px', padding: '8px 12px', background: 'var(--pink-light, #FDE8EC)', borderRadius: '8px', fontSize: '0.82rem' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--brown)', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flavors Chosen:</div>
                                  {item.boxFlavors.map((bf, bfi) => (
                                    <div key={bfi} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: 'var(--brown-light, #7A5243)' }}>
                                      <span>• {bf.name}</span>
                                      <span style={{ fontWeight: 600 }}>×{bf.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="order-product-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
                            <span>Delivery Fee</span>
                            <span>{o.deliveryMethod === 'pickup' ? 'FREE (Pickup)' : `EGP ${(o.deliveryFee !== undefined && o.deliveryFee !== null ? o.deliveryFee : 70).toFixed(2)}`}</span>
                          </div>
                          {o.discount && o.discount > 0 ? (
                            <div className="order-product-row" style={{ marginTop: '5px', color: '#347049', fontWeight: 600 }}>
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

              
              <div className="admin-products-grid">
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)', gridColumn: '1/-1' }}>No products found.</div>
                ) : (
                  products.map((p, index) => (
                    <div key={p.id} className="admin-product-card">
                      <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                        <OptimizedImage src={p.image} alt={p.name} fill sizes="90px" />
                      </div>
                      <div className="admin-product-info">
                        <h4>
                          {p.name} 
                          <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '50px', background: 'var(--pink)', color: 'var(--brown)', fontWeight: 500, marginLeft: '6px', fontFamily: '"Inter", sans-serif' }}>
                            {categories.find(c => c.id === p.type)?.name || p.type}
                          </span>
                        </h4>
                        {p.type === 'cookie' ? (
                          <div className="price">EGP {p.price.normal.toFixed(2)}{p.flavor ? ` · ${p.flavor}` : ''}</div>
                        ) : p.type === 'item' && p.flavors && p.flavors.length > 0 ? (
                          <div className="price">{p.flavors.length} flavor{p.flavors.length > 1 ? 's' : ''} · EGP {Math.min(...p.flavors.map(f => f.price)).toFixed(0)}–{Math.max(...p.flavors.map(f => f.price)).toFixed(0)}</div>
                        ) : (
                          <div className="price">Normal: EGP {p.price.normal.toFixed(2)} | Mini: EGP {p.price.mini.toFixed(2)}</div>
                        )}
                        <div 
                          className="stock" 
                          style={{
                             display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px',
                             ...(p.stock <= 5 ? { background: 'rgba(231,76,60,0.1)', color: '#a33832' } : { color: 'var(--brown-light)' })
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

              {/* Homepage Hero Image Configuration Card */}
              <div className="admin-settings-section" style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ImageIcon size={22} color="var(--ink)" /> Homepage Hero Image
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--pink-light)', margin: 0, lineHeight: 1.5 }}>
                    Upload, crop, or update the main hero cookie image displayed prominently on your homepage.
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    background: 'var(--off-white)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(243,195,206,0.3)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: '120px',
                      height: '120px',
                      borderRadius: '16px',
                      border: '2.5px solid var(--pink)',
                      boxShadow: 'none',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      <OptimizedImage
                        src={heroImage}
                        alt="Current Hero Cookie"
                        fill
                        sizes="120px"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                        Current Active Hero Image
                      </div>
                      <label 
                        className="btn btn-primary" 
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700 }}
                      >
                        <ImageIcon size={18} /> Upload & Crop New Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            setCropTarget('hero');
                            onFileChange(e);
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                      Or paste image URL directly:
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="e.g. https://... or /images/hero.png"
                        value={heroUrlInput}
                        onChange={e => setHeroUrlInput(e.target.value)}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)', fontSize: '0.88rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', fontWeight: 700 }}
                        onClick={async () => {
                          if (!heroUrlInput.trim()) return;
                          await updateHeroImage(heroUrlInput.trim());
                          alert('Hero image updated successfully!');
                        }}
                      >
                        Save URL
                      </button>
                    </div>
                  </div>

                  {/* 360 Rotation Toggle Control */}
                  <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(243,195,206,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} color="var(--ink)" className={heroRotationEnabled ? 'rotate-360-slow' : ''} />
                        Slow 360° Rotation Animation Effect
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pink-light)', marginTop: '3px' }}>
                        Enable or disable smooth 360-degree continuous rotation for your homepage hero cookie.
                      </div>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', padding: '8px 18px', borderRadius: '50px', border: `1.5px solid ${heroRotationEnabled ? 'var(--pink)' : 'rgba(255,255,255,0.2)'}` }}>
                      <input
                        type="checkbox"
                        checked={heroRotationEnabled}
                        onChange={async e => {
                          await updateHeroRotation(e.target.checked);
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--pink)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: heroRotationEnabled ? '#347049' : '#aaaaaa' }}>
                        {heroRotationEnabled ? 'Rotation Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="admin-settings-section">
                <h4 style={{ marginBottom: '16px', color: 'var(--ink)' }}>Promo Code Configuration</h4>
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

              <div className="admin-settings-section" style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '16px', color: 'var(--ink)' }}>Pickup Location & Hours Notice</h4>
                <form onSubmit={handleSavePickup}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Pickup Branch Address *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. The Cookie Concept Bakery Branch, New Cairo, Cairo, Egypt" 
                      value={pickupForm.address} 
                      onChange={e => setPickupForm({...pickupForm, address: e.target.value})} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Google Maps Location URL *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Paste Google Maps link (e.g. https://www.google.com/maps/place/30.0444,31.2357)" 
                      value={pickupForm.mapUrl || ''} 
                      onChange={e => {
                        const urlVal = e.target.value;
                        const parsed = parseGoogleMapsUrl(urlVal);
                        setPickupForm({
                          ...pickupForm,
                          mapUrl: urlVal,
                          lat: parsed.lat,
                          lng: parsed.lng
                        });
                      }} 
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--pink-light)', marginTop: '6px' }}>
                      📍 Automatically Extracted Map Coordinates: <strong>{pickupForm.lat}, {pickupForm.lng}</strong>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Pickup Timing Notice *</label>
                    <input 
                      type="text" 
                      required 
                      value={pickupForm.hoursNotice} 
                      onChange={e => setPickupForm({...pickupForm, hoursNotice: e.target.value})} 
                      placeholder="e.g. Next day from 12:00 PM to 8:00 PM only"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>Save Pickup Location Settings</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            <h2>{editingProduct ? 'Edit Concept' : 'Add New Concept'}</h2>
            <p className="modal-subtitle">Update details, pricing, and images for this product.</p>
          </div>
          
          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <div className="modal-body">
              <div className="form-section">
                <div className="form-section-title">Product Details</div>
                {/* Product Type Selector */}
                <div className="form-group">
                  <label>Product Category *</label>
                  <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap', background: 'var(--off-white)', padding: '4px', borderRadius: '12px', marginTop: '6px' }}>
                    {categories.map(cat => (
                      <button key={cat.id} type="button" onClick={() => { 
                          setProductType(cat.id); 
                          if (cat.flavorType === 'none') setFlavors([]); 
                          else if (cat.flavorType === 'array' && flavors.length === 0) setFlavors([{ name: '', image: '', price: 0 }]);
                        }}
                        style={{ flex: '1 1 auto', padding: '10px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: productType === cat.id ? 700 : 500, background: productType === cat.id ? 'var(--pink)' : 'transparent', color: 'var(--brown)', cursor: 'pointer', transition: '0.2s' }}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="btn btn-sm" style={{ marginTop: '8px', fontSize: '0.75rem', background: 'transparent', color: 'var(--brown)', textDecoration: 'underline', padding: 0, border: 'none', cursor: 'pointer' }}>
                    + Manage Categories
                  </button>
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Classic Chocolate Chip" />
                </div>
                {/* Product Badge / Tag */}
                <div className="form-group">
                  <label>Product Tag / Badge (e.g. NEW!, BEST SELLER)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <select
                      value={['', 'NONE', 'BEST SELLER', 'NEW!', 'POPULAR', 'LIMITED'].includes(badge) ? badge : 'custom'}
                      onChange={e => {
                        if (e.target.value !== 'custom') setBadge(e.target.value);
                      }}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)', fontSize: '0.88rem' }}
                    >
                      <option value="">Auto (Best Seller based on sales)</option>
                      <option value="NONE">None (Hide Badge)</option>
                      <option value="BEST SELLER">BEST SELLER</option>
                      <option value="NEW!">NEW!</option>
                      <option value="POPULAR">POPULAR</option>
                      <option value="LIMITED">LIMITED</option>
                      <option value="custom">Custom Tag...</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. NEW!, HOT, SPECIAL"
                      value={badge}
                      onChange={e => setBadge(e.target.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--pink)', background: 'var(--off-white)', color: 'var(--ink)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {selectedCat.flavorType === 'single' && (
                        <div className="form-group">
                          <label>Flavor *</label>
                          <input type="text" required value={formData.flavor} onChange={e => setFormData({...formData, flavor: e.target.value})} placeholder="e.g. Double Chocolate, Red Velvet" />
                        </div>
                      )}
                      {selectedCat.hasDescription && (
                        <div className="form-group">
                          <label>Description *</label>
                          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief description of the product" />
                        </div>
                      )}
                      
                      <div className="form-group" style={{ marginTop: '16px' }}>
                        <label>Main Product Image</label>
                        <p className="form-hint" style={{ marginBottom: '8px' }}>This image represents the product in the shop.</p>
                        {formData.image && (
                          <div style={{ marginBottom: '10px' }}>
                            <img src={resolveImageUrl(formData.image)} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--brown-light)' }} />
                          </div>
                        )}
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setCropTarget('product'); document.getElementById('hiddenFileInput')?.click(); }}>
                          Upload & Crop Image
                        </button>
                      </div>
                    </div>

                    <div className="form-section">
                      <div className="form-section-title">Pricing & Inventory</div>
                      {selectedCat.sizeType === 'none' && (
                        <div className="form-row">
                          <div className="form-group">
                            <label>Price (EGP) *</label>
                            <input type="number" required min="0.01" step="0.01" value={formData.priceNormal} onChange={e => setFormData({...formData, priceNormal: e.target.value})} />
                          </div>
                          <div className="form-group">
                            <label>Stock Quantity *</label>
                            <input type="number" required min="0" step="1" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                          </div>
                        </div>
                      )}
                      {selectedCat.sizeType === 'normal_mini' && (
                        <>
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
                        </>
                      )}
                      {selectedCat.sizeType === 'box_sizes' && (
                        <>
                          <div className="form-group">
                            <label>Box Options</label>
                            <p className="form-hint" style={{ marginBottom: '12px' }}>Define the sizes available and their base price.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {boxPricing.map((bp, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <input type="number" placeholder="Size (e.g. 6)" value={bp.size || ''}
                                    onChange={e => { const u = [...boxPricing]; u[idx] = { ...u[idx], size: parseInt(e.target.value) || 0 }; setBoxPricing(u); }}
                                    style={{ flex: 1 }} />
                                  <input type="number" placeholder="Price (EGP)" value={bp.price || ''}
                                    onChange={e => { const u = [...boxPricing]; u[idx] = { ...u[idx], price: parseFloat(e.target.value) || 0 }; setBoxPricing(u); }}
                                    style={{ flex: 1 }} />
                                  <button type="button" onClick={() => setBoxPricing(boxPricing.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#a33832', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                              <button type="button" onClick={() => setBoxPricing([...boxPricing, { size: 0, price: 0 }])}
                                className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={14} /> Add Box Option
                              </button>
                            </div>
                          </div>
                          <div className="form-row" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                              <label>Global Stock Quantity *</label>
                              <input type="number" required min="0" step="1" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                              <p className="form-hint">Total number of boxes available.</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedCat.flavorType === 'array' && (
                      <div className="form-section">
                        <div className="form-section-title">Flavors Inventory</div>
                        <div className="form-row">
                      <div className="form-group">
                        <label>Global Stock Quantity *</label>
                        <input type="number" required min="0" step="1" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                        <p className="form-hint">Total number of boxes available.</p>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label>Available Flavors</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {flavors.map((flavor, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--off-white)', padding: '12px', borderRadius: '12px', border: '1px solid var(--pink)' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', background: 'var(--off-white)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px dashed var(--pink)' }}
                              onClick={() => { setCropTarget('flavor'); setFlavorCropIndex(idx); document.getElementById('hiddenFileInput')?.click(); }}>
                              {flavor.image ? (
                                <img src={resolveImageUrl(flavor.image)} alt={flavor.name || 'Flavor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <ImageIcon size={18} color="var(--ink)" />
                              )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <input type="text" placeholder={`Flavor ${idx + 1} name`} value={flavor.name}
                                onChange={e => { const u = [...flavors]; u[idx] = { ...u[idx], name: e.target.value }; setFlavors(u); }}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.82rem', background: 'var(--off-white)', color: 'var(--ink)' }} />
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--pink-light)', whiteSpace: 'nowrap' }}>+ EGP</span>
                                <input type="number" placeholder="Surcharge" min="0" step="0.01" value={flavor.price || ''}
                                  onChange={e => { const u = [...flavors]; u[idx] = { ...u[idx], price: parseFloat(e.target.value) || 0 }; setFlavors(u); }}
                                  style={{ width: '90px', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.82rem', background: 'var(--off-white)', color: 'var(--ink)' }} />
                                <button type="button" style={{ fontSize: '0.7rem', color: 'var(--ink)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onClick={() => { setCropTarget('flavor'); setFlavorCropIndex(idx); document.getElementById('hiddenFileInput')?.click(); }}>
                                  {flavor.image ? 'Change img' : 'Upload img'}
                                </button>
                              </div>
                            </div>
                            <button type="button" onClick={() => setFlavors(flavors.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#a33832', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setFlavors([...flavors, { name: '', image: '', price: 0 }])}
                          className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Plus size={14} /> Add Flavor
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              <div className="form-section">
                <div className="form-section-title">Customizations (Extra Charges)</div>
                <div className="form-group">
                  <label>Extra Options</label>
                  <p className="form-hint" style={{ marginBottom: '12px' }}>Allow customers to add extra options (e.g. Extra Chocolate for +50 EGP).</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customizations.map((cust, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <input type="text" placeholder="Option Name" value={cust.name}
                            onChange={e => { const u = [...customizations]; u[idx] = { ...u[idx], name: e.target.value }; setCustomizations(u); }}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.85rem' }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--brown-light)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!cust.requiresText}
                              onChange={e => { const u = [...customizations]; u[idx] = { ...u[idx], requiresText: e.target.checked }; setCustomizations(u); }}
                              style={{ accentColor: 'var(--pink-dark)' }} />
                            Requires text input from customer?
                          </label>
                        </div>
                        
                        {(() => {
                          if (selectedCat.sizeType === 'none') {
                            return (
                              <>
                                <span style={{ fontSize: '0.85rem', color: 'var(--brown-light)' }}>+ EGP</span>
                                <input type="number" placeholder="Price" min="0" step="0.01" value={cust.price === 0 ? '' : cust.price}
                                  onChange={e => { const u = [...customizations]; u[idx] = { ...u[idx], price: parseFloat(e.target.value) || 0 }; setCustomizations(u); }}
                                  style={{ width: '80px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.85rem' }} />
                              </>
                            );
                          } else if (selectedCat.sizeType === 'normal_mini') {
                            return (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--brown-light)' }}>Normal +EGP</span>
                                  <input type="number" placeholder="Price" min="0" step="0.01" value={cust.pricing?.['Normal'] || ''}
                                    onChange={e => { 
                                      const u = [...customizations]; 
                                      u[idx] = { ...u[idx], pricing: { ...(u[idx].pricing || {}), 'Normal': parseFloat(e.target.value) || 0 } }; 
                                      setCustomizations(u); 
                                    }}
                                    style={{ width: '60px', padding: '8px 6px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.85rem' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--brown-light)' }}>Mini +EGP</span>
                                  <input type="number" placeholder="Price" min="0" step="0.01" value={cust.pricing?.['Mini'] || ''}
                                    onChange={e => { 
                                      const u = [...customizations]; 
                                      u[idx] = { ...u[idx], pricing: { ...(u[idx].pricing || {}), 'Mini': parseFloat(e.target.value) || 0 } }; 
                                      setCustomizations(u); 
                                    }}
                                    style={{ width: '60px', padding: '8px 6px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.85rem' }} />
                                </div>
                              </div>
                            );
                          } else if (selectedCat.sizeType === 'box_sizes') {
                            return (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {boxPricing.filter(bp => bp.size > 0).map(bp => (
                                  <div key={bp.size} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--brown-light)' }}>Box of {bp.size} +EGP</span>
                                    <input type="number" placeholder="Price" min="0" step="0.01" value={cust.pricing?.[bp.size.toString()] || ''}
                                      onChange={e => { 
                                        const u = [...customizations]; 
                                        u[idx] = { ...u[idx], pricing: { ...(u[idx].pricing || {}), [bp.size.toString()]: parseFloat(e.target.value) || 0 } }; 
                                        setCustomizations(u); 
                                      }}
                                      style={{ width: '60px', padding: '8px 6px', borderRadius: '8px', border: '1px solid var(--pink)', fontSize: '0.85rem' }} />
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        })()}

                        <button type="button" onClick={() => setCustomizations(customizations.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#a33832', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCustomizations([...customizations, { name: '', price: 0 }])}
                      className="btn btn-sm btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={14} /> Add Customization
                    </button>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Manual Order Modal */}
      <div className={`modal-overlay ${isManualOrderModalOpen ? 'active' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <button className="modal-close" onClick={() => setIsManualOrderModalOpen(false)}>&times;</button>
            <h2>Add Manual Order</h2>
            <p className="modal-subtitle">Log a walk-in or offline order to sync inventory.</p>
          </div>

          <form onSubmit={handleCreateManualOrder} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <div className="modal-body">
              <div className="form-section">
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
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">
                Save Manual Order
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Management Modal */}
      <div className={`modal-overlay ${isCategoryModalOpen ? 'active' : ''}`}>
        <div className="modal" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <button className="modal-close" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}>&times;</button>
            <h2>{editingCategory ? 'Edit Category' : 'Manage Categories'}</h2>
            <p className="modal-subtitle">Configure product types and their properties.</p>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* List of categories */}
            {!editingCategory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--ink)', margin: 0 }}>Current Categories</h3>
                  <button onClick={() => { setEditingCategory({ id: '', name: '', hasDescription: true, flavorType: 'none', sizeType: 'none', isBoxBuilder: false }); setCategoryForm({ id: '', name: '', hasDescription: true, flavorType: 'none', sizeType: 'none', isBoxBuilder: false }); }} className="btn btn-sm btn-secondary">
                    + New Category
                  </button>
                </div>
                <div style={{ background: 'var(--off-white)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(243, 195, 206, 0.2)' }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(243, 195, 206, 0.15)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem' }}>{cat.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--pink-light)' }}>
                          Flavors: {cat.flavorType} | Sizes: {cat.sizeType}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEditingCategory(cat); setCategoryForm(cat); }} style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Edit</button>
                        {['cookie', 'cake', 'item'].includes(cat.id) ? (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>Default</span>
                        ) : (
                          <button onClick={() => { if(confirm('Are you sure you want to delete this category?')) deleteCategory(cat.id); }} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Form */}
            {editingCategory && (
              <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Category Name *</label>
                  <input type="text" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="e.g. Brownies" />
                </div>
                
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="checkbox" checked={categoryForm.hasDescription} onChange={e => setCategoryForm({...categoryForm, hasDescription: e.target.checked})} style={{ width: 'auto' }} />
                    Needs Description Field
                  </label>
                </div>

                <div className="form-group">
                  <label>Flavors Handling</label>
                  <select value={categoryForm.flavorType} onChange={e => setCategoryForm({...categoryForm, flavorType: e.target.value as any})}>
                    <option value="none">No Flavors</option>
                    <option value="single">Single text input (like standard Cookies)</option>
                    <option value="array">Multiple Flavors with images & surcharges</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sizes Handling</label>
                  <select value={categoryForm.sizeType} onChange={e => setCategoryForm({...categoryForm, sizeType: e.target.value as any})}>
                    <option value="none">Fixed Price (No sizes)</option>
                    <option value="normal_mini">Two Sizes (Normal & Mini)</option>
                    <option value="box_sizes">Multiple custom Box sizes & prices</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                    <input type="checkbox" checked={categoryForm.isBoxBuilder} onChange={e => setCategoryForm({...categoryForm, isBoxBuilder: e.target.checked})} style={{ width: 'auto' }} />
                    Use "Box Builder" UI (Requires picking exactly X flavors to match Box Size)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Category</button>
                  <button type="button" onClick={() => setEditingCategory(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {/* Cropper Modal — z-index must be above everything else */}
      {isCropping && imageSrc && (
        <div className="modal-overlay active" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ height: '80vh', maxWidth: '600px' }}>
            <div className="modal-header">
              <button className="modal-close" onClick={cancelCrop}>&times;</button>
              <h2>Crop Image</h2>
              <p className="modal-subtitle">Adjust the framing of your image for the best look.</p>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', flex: 1, width: '100%', background: '#333', borderRadius: '12px', overflow: 'hidden', minHeight: '300px' }}>
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
              <div style={{ padding: '20px 0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown)' }}>Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--pink-dark)' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={cancelCrop} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={showCroppedImage} disabled={isUploading} style={{ flex: 2, opacity: isUploading ? 0.7 : 1 }}>
                {isUploading ? 'Uploading to Firebase...' : 'Confirm Crop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
