"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ArrowUpRight, ClipboardList, Cookie, Grid2X2, LogOut, MessageSquare, RefreshCw, Settings2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { db } from '@/lib/firebase';
import { confirmWrite } from '@/lib/confirm-write';
import { normalizeAdminOrder } from '@/lib/admin-orders';
import { useAdminAction } from '@/components/admin/useAdminAction';
import ThemeSwitch from '@/components/ThemeSwitch';
import ReviewAdmin from '@/components/ReviewAdmin';
import OrdersPanel, { type AdminOrder } from '@/components/admin/OrdersPanel';
import CatalogPanel, { CategoriesPanel } from '@/components/admin/CatalogPanel';
import SettingsPanel from '@/components/admin/SettingsPanel';
import ManualOrder from '@/components/admin/ManualOrder';

type Tab = 'orders' | 'products' | 'categories' | 'reviews' | 'settings';
const tabs = [{ id: 'orders', label: 'Orders', icon: ClipboardList }, { id: 'products', label: 'Products', icon: Cookie }, { id: 'categories', label: 'Categories', icon: Grid2X2 }, { id: 'reviews', label: 'Reviews', icon: MessageSquare }, { id: 'settings', label: 'Store settings', icon: Settings2 }] as const;
export default function AdminDashboard() {
  const { user, isAdmin, loading, logout } = useAuth();
  const { products } = useCart();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'cached' | 'saving' | 'failed'>('connecting');
  const [ordersError, setOrdersError] = useState('');
  const [version, setVersion] = useState(0);
  const [manual, setManual] = useState(false);
  const [health, setHealth] = useState('Checking server ordering…');
  const [healthy, setHealthy] = useState(false);
  const { busy, notice, perform } = useAdminAction();
  useEffect(() => { if (!loading && (!user || !isAdmin)) router.replace('/admin/login'); }, [user, isAdmin, loading, router]);
  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(collection(db, 'orders'), { includeMetadataChanges: true }, snapshot => {
      setOrders(snapshot.docs.map(document => normalizeAdminOrder(document.id, document.data())).sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)));
      setConnection(snapshot.metadata.hasPendingWrites ? 'saving' : snapshot.metadata.fromCache ? 'cached' : 'live'); setOrdersError('');
    }, () => { setConnection('failed'); setOrdersError('Orders could not be loaded. Check your connection and staff permissions. The previous list may be out of date.'); });
  }, [user, isAdmin, version]);
  useEffect(() => {
    if (!user || !isAdmin) return;
    let active = true;
    const controller = new AbortController();
    user.getIdToken(true).then(token => fetch('/api/admin/health', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })).then(response => response.json()).then(result => {
      if (!active) return;
      setHealthy(Boolean(result.ready && result.emailConfigured && result.retryConfigured));
      setHealth(result.ready ? !result.emailConfigured ? 'Email credentials are missing. Orders save, but notifications need configuration.' : !result.retryConfigured ? 'Order saving is ready. Automatic email retries still need ORDER_EMAIL_RETRY_SECRET.' : 'Server ordering & notification queue are configured.' : result.error || 'Server setup needs attention.');
    }).catch(() => { if (active) { setHealthy(false); setHealth('Server ordering could not be verified. Check your connection and server setup.'); } });
    return () => { active = false; controller.abort(); };
  }, [user, isAdmin, version]);
  if (loading || !user || !isAdmin) return <div className="aw-auth-loading" role="status">Opening the bakery workspace…</div>;
  const activeOrders = orders.filter(order => !order.archived);
  const pending = activeOrders.filter(order => order.status === 'pending');
  const revenue = activeOrders.filter(order => order.status === 'fulfilled').reduce((sum, order) => sum + order.total, 0);
  const outstanding = activeOrders.filter(order => ['failed', 'pending', 'sending'].includes(order.email?.status || '')).length;
  const onUpdate = (id: string, change: Record<string, unknown>) => perform(id, () => confirmWrite(updateDoc(doc(db, 'orders', id), { ...change, updatedAt: new Date().toISOString(), updatedBy: user.uid })), 'Order updated.');
  const retryEmail = async (id: string) => {
    const saved = await perform(id, async () => {
      const response = await fetch('/api/send-order-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ orderId: id }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The email is still queued. Check its status and retry.');
    }, 'Notification checked. Its latest status appears on the order.');
    if (!saved) throw new Error('The notification could not be retried. Check server configuration and staff access.');
  };
  return <div className="admin-workspace">
    <header className="aw-header"><Link href="/" className="brand-mark" aria-label="The Cookie Concept storefront"><span>the</span><strong>cookie concept.</strong></Link><span className="aw-workspace-label">Bakery workspace</span><div className="aw-header-actions"><ThemeSwitch /><Link className="aw-shop-link" href="/">View shop <ArrowUpRight size={15} /></Link><button className="aw-icon" aria-label="Sign out" onClick={() => perform('logout', logout, 'Signed out.')}><LogOut size={18} /></button></div></header>
    <div className="aw-layout"><aside className="aw-sidebar"><div className="aw-profile"><span>{(user.displayName || user.email || 'B')[0].toUpperCase()}</span><div><strong>{user.displayName || 'The bakery team'}</strong><small>Make someone’s day.</small></div></div><nav aria-label="Workspace navigation">{tabs.map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={19} strokeWidth={1.5} /><span>{label}</span>{id === 'orders' && pending.length > 0 && <small>{pending.length}</small>}</button>)}</nav><div className="aw-sidebar-note"><ShoppingBag size={22} strokeWidth={1.2} /><p>Good cookies.<br />Thoughtful little details.</p><Link href="/shop">Visit the menu <ArrowUpRight size={14} /></Link></div></aside>
    <div className="aw-main"><div className="aw-page-top"><div><span className="aw-kicker">The Cookie Concept / {tabs.find(item => item.id === tab)?.label}</span><h1>{tab === 'orders' ? 'Hello, cookie crew.' : tabs.find(item => item.id === tab)?.label}</h1></div><button className="aw-live-state" onClick={() => { setConnection('connecting'); setVersion(current => current + 1); }} title="Reconnect orders and check server setup"><span className={`aw-live-dot ${connection === 'live' ? 'connected' : ''}`} />{connection === 'live' ? 'Orders connected' : connection === 'cached' ? 'Cached · reconnecting' : connection === 'failed' ? 'Connection needs attention' : connection === 'saving' ? 'Saving changes…' : 'Connecting…'}<RefreshCw size={13} /></button></div>
    {!healthy && <div className="aw-alert aw-setup-note" role="status"><strong>Ordering setup</strong><p>{health}</p><p>Follow ADMIN_SETUP.md in the project. Your staff user ID is available in Store settings.</p></div>}
    {ordersError && <p className="aw-alert" role="alert">{ordersError}</p>}{notice.text && <p className={notice.error ? 'aw-alert' : 'aw-notice'} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
    <div className="aw-metrics"><article><span>To prepare</span><strong>{pending.length}</strong><small>Orders waiting for the kitchen</small></article><article><span>Fulfilled sales</span><strong><small>EGP</small> {revenue.toLocaleString('en-EG', { maximumFractionDigits: 2 })}</strong><small>Fulfilled, unarchived order totals</small></article><article><span>On the menu</span><strong>{products.length}</strong><small>{products.filter(product => product.stock < 1).length} currently out of stock</small></article><article><span>Email attention</span><strong>{outstanding}</strong><small>Queued, sending, or failed notices</small></article></div>
    <section className="aw-content" aria-label={tabs.find(item => item.id === tab)?.label}>{tab === 'orders' ? <OrdersPanel orders={orders} loading={connection === 'connecting' && !orders.length} busy={busy} onUpdate={onUpdate} onRetryEmail={retryEmail} onManual={() => setManual(true)} /> : tab === 'products' ? <CatalogPanel /> : tab === 'categories' ? <CategoriesPanel /> : tab === 'reviews' ? <ReviewAdmin /> : <SettingsPanel onProfileSaved={() => setVersion(current => current + 1)} />}</section>
    <footer className="aw-footer"><span>A good idea. An even better workday.</span><span>The Cookie Concept · Cairo</span></footer></div></div>{manual && <ManualOrder onClose={() => setManual(false)} />}
  </div>;
}
