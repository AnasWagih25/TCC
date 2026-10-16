"use client";
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, ShieldCheck } from 'lucide-react';
import type { Order } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { paymentReviewLabel, remainingPaymentLabel } from '@/lib/admin-orders';
import { confirmWrite } from '@/lib/confirm-write';

const currency = (value: number) => `EGP ${value.toFixed(2)}`;

export default function OrderPaymentReview({ order, busy, onBusyChange }: { order: Order; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const { user } = useAuth();
  const payment = order.payment!;
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => () => { if (receiptUrl) URL.revokeObjectURL(receiptUrl); }, [receiptUrl]);
  const openReceipt = async () => {
    if (!user || loadingReceipt || receiptUrl) return;
    setLoadingReceipt(true); setError('');
    const pending = new AbortController(); controller.current = pending;
    try {
      const response = await fetch(`/api/admin/payment-receipt/${encodeURIComponent(order.id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal: pending.signal, cache: 'no-store' });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'The screenshot could not be opened.'); }
      const blob = await response.blob();
      if (!pending.signal.aborted) setReceiptUrl(URL.createObjectURL(blob));
    } catch (error) { if (!pending.signal.aborted) setError(error instanceof Error ? error.message : 'The screenshot could not be opened.'); }
    finally { if (!pending.signal.aborted) setLoadingReceipt(false); }
  };
  const updatePayment = async (action: string) => {
    if (!user || saving || busy) return;
    setSaving(action); setError(''); onBusyChange(true);
    try {
      const response = await confirmWrite(fetch(`/api/admin/payments/${encodeURIComponent(order.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ action }) }), 30000);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The payment update was not saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'The payment update could not be confirmed. Retry the same action.'); }
    finally { setSaving(''); onBusyChange(false); }
  };
  return <section className="aw-payment-review" aria-label="Instapay transfer review">
    <div className="aw-payment-heading"><div><span className="aw-kicker">Instapay · {payment.plan === 'full' ? 'Full payment' : '50% deposit'}</span><h4>{paymentReviewLabel(order)}</h4></div><ShieldCheck size={24} strokeWidth={1.3} /></div>
    <dl className="aw-payment-amounts"><div><dt>Order total</dt><dd>{currency(order.total)}</dd></div><div><dt>Submitted transfer</dt><dd>{currency(payment.amountSubmitted)}</dd></div><div><dt>{order.paymentStatus === 'paid' ? 'Balance outstanding' : 'Balance after transfer'}</dt><dd>{currency(order.paymentStatus === 'paid' ? 0 : payment.remainingAmount)}</dd></div></dl>
    <p>Screenshot amount: <strong>{currency(payment.receipt.detectedAmount)}</strong>. {payment.status === 'pending_review' ? 'The amount check matched; verify the recipient and actual funds in your account before accepting this transfer.' : payment.status === 'rejected' ? 'This transfer was rejected. Contact the customer before preparing the order.' : 'The submitted transfer was verified by staff.'}</p>
    {payment.remainingAmount > 0 && <p>Remaining payment method: <strong>{remainingPaymentLabel(order)}</strong>.{payment.balanceReceivedAt && <> Balance received {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(payment.balanceReceivedAt))}.</>}</p>}
    {receiptUrl ? <div className="aw-receipt-preview">
      {/* Private authenticated blobs are deliberately kept outside image optimization and public URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={receiptUrl} alt={`Instapay transaction screenshot for ${order.id}`} />
      <a className="aw-inline-link" href={receiptUrl} target="_blank" rel="noopener noreferrer">Open full-size screenshot</a>
    </div> : <button className="aw-button secondary" type="button" disabled={loadingReceipt || Boolean(saving)} onClick={openReceipt}><ImageIcon size={16} />{loadingReceipt ? 'Opening screenshot…' : 'View payment screenshot'}</button>}
    <p className="aw-muted">Receipt {payment.receipt.id}. Screenshots are private to authorized staff.</p>
    {error && <p className="aw-alert" role="alert">{error}</p>}
    {payment.status !== 'verified' ? <div className="aw-payment-actions"><button type="button" className="aw-button secondary" disabled={busy || Boolean(saving) || payment.status === 'rejected'} onClick={() => updatePayment('reject_transfer')}>{saving === 'reject_transfer' ? 'Saving…' : 'Reject transfer'}</button><button type="button" className="aw-button" disabled={busy || Boolean(saving) || !receiptUrl} onClick={() => updatePayment('verify_transfer')}><CheckCircle2 size={16} />{saving === 'verify_transfer' ? 'Saving…' : payment.plan === 'full' ? 'Confirm full payment received' : 'Confirm deposit received'}</button>{!receiptUrl && <small>Open the screenshot before confirming the transfer.</small>}</div> : payment.plan === 'deposit' && order.paymentStatus !== 'paid' ? <div className="aw-payment-actions"><button type="button" className="aw-button" disabled={busy || Boolean(saving)} onClick={() => updatePayment('receive_balance')}>{saving ? 'Saving…' : `Record ${currency(payment.remainingAmount)} balance received`}</button><small>Use this only after collecting the balance by {remainingPaymentLabel(order)}.</small></div> : <p className="aw-payment-complete" role="status"><CheckCircle2 size={17} /> Payment received in full.</p>}
  </section>;
}
