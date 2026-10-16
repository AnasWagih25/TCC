'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, ImagePlus, LoaderCircle, X } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { amountMatchesPayment, paymentAmounts, remainingAfterPayment, type CheckoutPayment as Payment, type PaymentPlan, type RemainingPaymentMethod } from '@/lib/payment-types';
import './checkout-payment.css';

export const INSTAPAY_LINK = 'https://ipn.eg/S/halamorshdy/instapay/5C7G4R';
const egp = (value: number) => `EGP ${value.toFixed(2)}`;

async function prepareScreenshot(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP screenshot up to 12 MB.');
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('This screenshot could not be opened. Try a JPG or PNG.'); }
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('This screenshot could not be prepared.')), 'image/jpeg', .92));
  if (blob.size > 3.8 * 1024 * 1024) throw new Error('This screenshot is still too large. Use a smaller, clear screenshot.');
  return new File([blob], 'payment-receipt.jpg', { type: 'image/jpeg' });
}

export default function CheckoutPayment({ total, disabled, onChange }: { total: number; disabled: boolean; onChange: (value: Payment | null) => void }) {
  const [plan, setPlan] = useState<PaymentPlan>('deposit');
  const [remainingMethod, setRemainingMethod] = useState<RemainingPaymentMethod>('cash');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [validated, setValidated] = useState<{ token: string; amount: number; total: number; plan: PaymentPlan } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const { amountDue, remainingAmount: scheduledBalance } = paymentAmounts(total, plan);
  const matches = validated !== null && validated.total === total && validated.plan === plan && amountMatchesPayment(validated.amount, amountDue);
  const remainingAmount = matches ? remainingAfterPayment(total, validated.amount) : scheduledBalance;
  const roundedAmount = Math.ceil(amountDue);

  useEffect(() => {
    onChange(matches && validated ? { plan, remainingMethod: plan === 'full' ? 'instapay' : remainingMethod, proofToken: validated.token } : null);
  }, [matches, validated, plan, remainingMethod, onChange]);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);

  async function scan(file: File) {
    const attempt = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setScreenshot(file); setPreview(''); setValidated(null); setError(''); setScanning(true);
    const timer = setTimeout(() => abort.abort(), 58000);
    try {
      const prepared = await prepareScreenshot(file);
      if (attempt !== sequence.current) return;
      setPreview(URL.createObjectURL(prepared));
      const body = new FormData(); body.set('file', prepared); body.set('total', String(total));
      const response = await fetch('/api/payment-proof', { method: 'POST', body, signal: abort.signal });
      const result = await response.json().catch(() => { throw new Error('Receipt scanning is unavailable right now. Please retry.'); });
      if (!response.ok) throw new Error(result.error || 'The screenshot could not be checked.');
      if (!result.proofToken || !result.receipt || !['deposit', 'full'].includes(result.plan)) throw new Error('The scan returned an incomplete result. Please retry.');
      if (attempt !== sequence.current) return;
      setPlan(result.plan);
      setValidated({ token: result.proofToken, amount: result.receipt.detectedAmount, total, plan: result.plan });
    } catch (error) {
      if (attempt === sequence.current) setError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'The scan was interrupted. Please retry your screenshot.');
    } finally {
      clearTimeout(timer);
      if (attempt === sequence.current) setScanning(false);
    }
  }

  function removeScreenshot() {
    sequence.current++; controller.current?.abort(); setScreenshot(null); setPreview(''); setValidated(null); setError(''); setScanning(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  return <section className="checkout-transfer" aria-labelledby="checkout-payment-title">
    <div className="checkout-transfer__intro"><span className="checkout-transfer__eyebrow">One last thing</span><h2 id="checkout-payment-title">Reserve your batch.</h2><p>A 50% InstaPay deposit is required for every order. You can also pay the full amount now.</p></div>
    <fieldset disabled={disabled || scanning} className="checkout-transfer__plans"><legend>How much would you like to pay now?</legend>
      <label className={plan === 'deposit' ? 'is-selected' : ''}><input type="radio" name="payment-plan" value="deposit" checked={plan === 'deposit'} onChange={() => setPlan('deposit')} /><span><strong>50% deposit</strong><small>{egp(paymentAmounts(total, 'deposit').amountDue)} now</small></span>{plan === 'deposit' && <Check size={18} aria-hidden="true" />}</label>
      <label className={plan === 'full' ? 'is-selected' : ''}><input type="radio" name="payment-plan" value="full" checked={plan === 'full'} onChange={() => setPlan('full')} /><span><strong>Pay in full</strong><small>{egp(total)} now</small></span>{plan === 'full' && <Check size={18} aria-hidden="true" />}</label>
    </fieldset>
    {plan === 'deposit' && <fieldset disabled={disabled} className="checkout-transfer__balance"><legend>Pay the remaining {egp(remainingAmount)} with</legend>
      <label><input type="radio" name="balance-method" checked={remainingMethod === 'cash'} onChange={() => setRemainingMethod('cash')} /> Cash on delivery / pickup</label>
      <label><input type="radio" name="balance-method" checked={remainingMethod === 'instapay'} onChange={() => setRemainingMethod('instapay')} /> InstaPay</label>
    </fieldset>}
    <div className="checkout-transfer__send"><div><span>Transfer now through InstaPay</span><strong>{egp(amountDue)}</strong><small>{plan === 'deposit' ? `Then ${egp(remainingAmount)} on delivery or pickup.` : 'Your full order total, including delivery.'}</small></div>
      <a href={INSTAPAY_LINK} target="_blank" rel="noopener noreferrer">Open InstaPay <ExternalLink size={16} aria-hidden="true" /></a>
    </div>
    {roundedAmount > amountDue && <p className="checkout-transfer__privacy">You can round {egp(amountDue)} up to {egp(roundedAmount)}. Any extra deposit reduces your remaining balance.</p>}
    <div className="checkout-transfer__proof"><label htmlFor="payment-screenshot" className="checkout-transfer__upload"><ImagePlus size={22} strokeWidth={1.5} aria-hidden="true" /><span><strong>{screenshot ? 'Choose a different screenshot' : 'Attach your transaction screenshot'}</strong><small>Required · JPG, PNG or WebP · up to 12 MB</small></span></label>
      <input ref={fileInput} id="payment-screenshot" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || scanning}
        onChange={event => { const file = event.target.files?.[0]; if (file) void scan(file); }} />
      {screenshot && <div className="checkout-transfer__receipt">
        {preview && <OptimizedImage src={preview} alt="Your transaction screenshot" width={320} height={400} objectFit="contain" style={{ width: '100%', height: '220px' }} />}
        <div><span>{screenshot.name}</span><button type="button" aria-label="Remove payment screenshot" disabled={disabled} onClick={removeScreenshot}><X size={18} /></button></div>
      </div>}
      <div aria-live="polite" aria-atomic="true">
        {scanning && <p className="checkout-transfer__scan"><LoaderCircle size={18} aria-hidden="true" /> Reading the amount… This can take a moment.</p>}
        {matches && <p className="checkout-transfer__match"><Check size={18} aria-hidden="true" /> Screenshot amount matches: {egp(validated.amount)} ({plan === 'full' ? 'full payment' : '50% deposit'}).</p>}
        {validated && !matches && !scanning && <p className="checkout-transfer__scan">Your total or payment option changed. Scan the matching receipt again.</p>}
        {error && <p className="checkout-transfer__error" role="alert">{error}</p>}
      </div>
      {screenshot && !matches && !scanning && <button type="button" className="checkout-transfer__retry" disabled={disabled} onClick={() => void scan(screenshot)}>Scan screenshot again</button>}
      <p className="checkout-transfer__privacy">Google Gemini reads the amount in your screenshot. It is stored privately for bakery review. The bakery confirms the transfer in its account before preparing your order.</p>
    </div>
  </section>;
}
