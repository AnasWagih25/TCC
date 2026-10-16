'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useCart, type Category, type Product } from '@/context/CartContext';
import { boxPrice, missingExtraText, selectedExtras } from '@/lib/menu-options';
import OptimizedImage from './OptimizedImage';
import './menu-item-dialogs.css';

const price = (amount: number) => `EGP ${amount.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
type DialogProps = { product: Product; onClose: () => void; onAdded: (message: string) => void };

function MenuDialog({ title, eyebrow, children, footer, onClose, box = false }: {
  title: string; eyebrow: string; children: ReactNode; footer: ReactNode; onClose: () => void; box?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const outside = useRef(false);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    const fitViewport = () => {
      if (!dialog || !viewport || viewport.scale !== 1) return;
      dialog.style.setProperty('--menu-viewport-height', `${viewport.height}px`);
      dialog.style.setProperty('--menu-viewport-top', `${viewport.offsetTop}px`);
      dialog.style.setProperty('--menu-viewport-bottom', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    fitViewport();
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      viewport?.removeEventListener('resize', fitViewport);
      viewport?.removeEventListener('scroll', fitViewport);
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={ref} className={`menu-dialog${box ? ' menu-dialog--box' : ''}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const target = event.shiftKey ? controls.at(-1) : controls[0];
      if (document.activeElement === (event.shiftKey ? controls[0] : controls.at(-1))) {
        event.preventDefault();
        target?.focus();
      }
    }}
    onPointerDown={event => { outside.current = event.target === event.currentTarget; }}
    onClick={event => { if (outside.current && event.target === event.currentTarget) onClose(); }}>
    <header className="menu-dialog__header">
      <div><p className="menu-dialog__eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2></div>
      <button type="button" className="menu-dialog__close" aria-label="Close dialog" onClick={onClose} autoFocus><X size={20} /></button>
    </header>
    <div className="menu-dialog__body">{children}</div>
    <footer className="menu-dialog__footer">{footer}</footer>
  </dialog>;
}

function ProductPhoto({ product }: { product: Product }) {
  return <aside className="menu-dialog__overview">
    <div className="menu-dialog__photo"><OptimizedImage src={product.image} alt={product.name} fill sizes="(max-width: 640px) 100vw, 340px" />
      <span className={`menu-dialog__stock${product.stock <= 0 ? ' menu-dialog__stock--out' : ''}`}>
        <span aria-hidden="true" />{product.stock <= 0 ? 'Sold out' : product.stock <= 10 ? `Only ${product.stock} left` : 'Ready for your order'}
      </span>
    </div>
    {(product.description || product.flavor) && <p className="menu-dialog__description">{product.description || product.flavor}</p>}
  </aside>;
}

function ExtraOptions({ product, size, selected, texts, onSelect, onText }: {
  product: Product; size: string; selected: Record<string, boolean>; texts: Record<string, string>;
  onSelect: (name: string, value: boolean) => void; onText: (name: string, text: string) => void;
}) {
  const id = useId();
  if (!product.customizations?.length) return null;
  return <fieldset className="menu-dialog__section">
    <legend>Make it yours <span>Optional</span></legend>
    <div className="menu-dialog__extras">{product.customizations.map((extra, index) => {
      const checked = !!selected[extra.name];
      const inputId = `${id}-${index}`;
      return <div className={`menu-extra${checked ? ' is-selected' : ''}`} key={extra.name}>
        <label className="menu-extra__choice"><input type="checkbox" checked={checked} onChange={event => onSelect(extra.name, event.target.checked)} />
          <span>{extra.name}</span><strong>+ {price(extra.pricing?.[size] ?? extra.price)}</strong>
        </label>
        {extra.requiresText && checked && <div className="menu-extra__message">
          <label htmlFor={inputId}>Your message <span>(required)</span></label>
          <input id={inputId} type="text" value={texts[extra.name] || ''} maxLength={500} required
            placeholder="e.g. Happy birthday, Sara!" onChange={event => onText(extra.name, event.target.value)} aria-describedby={`${inputId}-hint`} />
          <p id={`${inputId}-hint`}>We’ll use your exact wording. Up to 500 characters.</p>
        </div>}
      </div>;
    })}</div>
  </fieldset>;
}

function PurchaseFooter({ total, caption, disabled, button, hint, error, onAdd }: {
  total: number | null; caption: string; disabled: boolean; button: string; hint?: string; error: string; onAdd: () => void;
}) {
  const hintId = useId();
  return <>
    {hint && <p className="menu-dialog__hint" id={hintId}>{hint}</p>}
    {error && <p className="menu-dialog__error" role="alert">{error}</p>}
    <div className="menu-dialog__purchase">
      <div className="menu-dialog__total"><span>{caption}</span><strong>{total === null ? 'Your pick' : price(total)}</strong></div>
      <button type="button" className="menu-dialog__add" disabled={disabled} aria-describedby={hint ? hintId : undefined} onClick={onAdd}>
        <ShoppingBag size={18} aria-hidden="true" />{button}
      </button>
    </div>
  </>;
}

export function ProductDetailsDialog({ product: initialProduct, category, onClose, onAdded }: DialogProps & { category?: Category }) {
  const { products, addToCart } = useCart();
  const product = products.find(item => item.id === initialProduct.id) || initialProduct;
  const [size, setSize] = useState<'Normal' | 'Mini'>('Normal');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const hasSizes = category?.sizeType === 'normal_mini';
  const extras = selectedExtras(product, hasSizes ? size : 'Normal', selected, texts);
  const missingText = missingExtraText(product, selected, texts);
  const total = (size === 'Mini' ? product.price.mini : product.price.normal) + extras.reduce((sum, extra) => sum + extra.price, 0);
  const soldOut = product.stock <= 0;

  function add() {
    if (soldOut || missingText) return;
    const result = addToCart(product.id, size, undefined, extras);
    if (result.success) { onAdded(result.message); onClose(); } else setError(result.message);
  }

  return <MenuDialog title={product.name} eyebrow={category?.name || 'A little cookie joy'} onClose={onClose}
    footer={<PurchaseFooter total={total} caption="Your total" disabled={soldOut || missingText} button={soldOut ? 'Sold out' : 'Add to bag'}
      hint={missingText ? 'Add your message above to finish your order.' : undefined} error={error} onAdd={add} />}>
    <ProductPhoto product={product} />
    <div className="menu-dialog__options">
      {hasSizes && <fieldset className="menu-dialog__section"><legend>Choose your size</legend>
        <div className="menu-dialog__choices menu-dialog__choices--two">{(['Normal', 'Mini'] as const).map(option => <button type="button" key={option}
          className="menu-choice" aria-pressed={size === option} onClick={() => { setSize(option); setError(''); }}>
          <span className="menu-choice__name">{option}{size === option && <Check size={16} aria-hidden="true" />}</span>
          <span className="menu-choice__detail">{option === 'Normal' ? '7–8 slices' : '5 slices'}</span>
          <strong>{price(option === 'Normal' ? product.price.normal : product.price.mini)}</strong>
        </button>)}</div>
      </fieldset>}
      <ExtraOptions product={product} size={hasSizes ? size : 'Normal'} selected={selected} texts={texts}
        onSelect={(name, value) => { setSelected(previous => ({ ...previous, [name]: value })); setError(''); }}
        onText={(name, text) => setTexts(previous => ({ ...previous, [name]: text }))} />
      {!hasSizes && !product.customizations?.length && <div className="menu-dialog__simple"><ShoppingBag size={22} strokeWidth={1.5} aria-hidden="true" /><h3>A good choice.</h3><p>Add one to your bag. You can adjust the quantity there.</p></div>}
    </div>
  </MenuDialog>;
}

export function BuildBoxDialog({ product: initialProduct, onClose, onAdded }: DialogProps) {
  const { products, addBoxToCart } = useCart();
  const product = products.find(item => item.id === initialProduct.id) || initialProduct;
  const [size, setSize] = useState<number | null>(null);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const options = product.boxPricing?.length ? product.boxPricing : (product.boxSizes || []).map(size => ({ size, price: 0 }));
  const flavors = product.flavors || [];
  const totalPicked = Object.values(selections).reduce((sum, quantity) => sum + quantity, 0);
  const full = size !== null && totalPicked === size;
  const extras = selectedExtras(product, String(size), selected, texts);
  const missingText = missingExtraText(product, selected, texts);
  const pricing = boxPrice(product, size, selections, extras);
  const soldOut = product.stock <= 0;
  const remaining = (size || 0) - totalPicked;

  function changeQuantity(name: string, change: number) {
    setSelections(previous => {
      const picked = Object.values(previous).reduce((sum, quantity) => sum + quantity, 0);
      if (!size || (change > 0 && picked >= size) || (previous[name] || 0) + change < 0) return previous;
      return { ...previous, [name]: (previous[name] || 0) + change };
    });
    setError('');
  }

  function add() {
    if (!size || !full || missingText || soldOut) return;
    const result = addBoxToCart(product.id, size, Object.entries(selections).filter(([, quantity]) => quantity > 0).map(([name, quantity]) => ({ name, quantity })), extras);
    if (result.success) { onAdded(result.message); onClose(); } else setError(result.message);
  }

  return <MenuDialog box title="Build your cookie box." eyebrow={product.name} onClose={onClose}
    footer={<>
      {size !== null && <div className="menu-box__progress" aria-live="polite" aria-atomic="true">
        <span>{full ? <><Check size={16} aria-hidden="true" /> Your box is full</> : `Pick ${remaining} more cookie${remaining === 1 ? '' : 's'}`}</span>
        <strong>{totalPicked} / {size}</strong>
        <progress value={totalPicked} max={size} aria-label="Cookies selected" />
      </div>}
      <PurchaseFooter total={size === null ? null : pricing.total} caption="Box total" disabled={!full || missingText || soldOut || !flavors.length}
        button={soldOut ? 'Sold out' : 'Add box to bag'} hint={size === null ? 'Start by choosing a box size.' : missingText ? 'Add your message above to finish your box.' : undefined} error={error} onAdd={add} />
    </>}>
    <ProductPhoto product={product} />
    <div className="menu-dialog__options">
      <fieldset className="menu-dialog__section"><legend><span className="menu-dialog__step">1</span> Choose your box</legend>
        <div className="menu-dialog__choices">{options.map(option => <button type="button" key={option.size} className="menu-choice" aria-pressed={size === option.size}
          onClick={() => { if (size !== option.size) { setSize(option.size); setSelections({}); setError(''); } }}>
          <span className="menu-choice__name">{option.size} cookies</span><strong>{price(option.price)}</strong>
        </button>)}</div>
        {!options.length && <p className="menu-dialog__hint">This box is being prepared. Please choose another item for now.</p>}
      </fieldset>
      {size !== null && <fieldset className="menu-dialog__section"><legend><span className="menu-dialog__step">2</span> Pick your favorites</legend>
        <p className="menu-dialog__section-note">Mix them up or keep it classic. It’s your box.</p>
        <div className="menu-box__flavors">{flavors.map(flavor => {
          const quantity = selections[flavor.name] || 0;
          return <div key={flavor.name} className={`menu-flavor${quantity ? ' is-selected' : ''}`}>
            <div className="menu-flavor__photo"><OptimizedImage src={flavor.image} alt="" fill sizes="44px" /></div>
            <div className="menu-flavor__info"><span>{flavor.name}</span><small>{flavor.price > 0 ? `+ ${price(flavor.price)} each` : 'Included'}</small></div>
            <div className="menu-flavor__counter" role="group" aria-label={`${flavor.name} quantity`}>
              <button type="button" disabled={quantity === 0} aria-label={`Remove one ${flavor.name} cookie`} onClick={() => changeQuantity(flavor.name, -1)}><Minus size={16} /></button>
              <output aria-label={`${flavor.name} selected`}>{quantity}</output>
              <button type="button" disabled={full} aria-label={`Add one ${flavor.name} cookie`} onClick={() => changeQuantity(flavor.name, 1)}><Plus size={16} /></button>
            </div>
          </div>;
        })}</div>
        {!flavors.length && <p className="menu-dialog__hint">Flavors are unavailable right now. Please choose another item.</p>}
      </fieldset>}
      {size !== null && <ExtraOptions product={product} size={String(size)} selected={selected} texts={texts}
        onSelect={(name, value) => { setSelected(previous => ({ ...previous, [name]: value })); setError(''); }}
        onText={(name, text) => setTexts(previous => ({ ...previous, [name]: text }))} />}
      {size !== null && (pricing.flavors > 0 || pricing.additions > 0) && <dl className="menu-box__breakdown">
        <div><dt>Box of {size}</dt><dd>{price(pricing.base)}</dd></div>
        {pricing.flavors > 0 && <div><dt>Flavor upgrades</dt><dd>+ {price(pricing.flavors)}</dd></div>}
        {pricing.additions > 0 && <div><dt>Your extras</dt><dd>+ {price(pricing.additions)}</dd></div>}
      </dl>}
    </div>
  </MenuDialog>;
}
