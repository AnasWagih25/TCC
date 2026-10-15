"use client";
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function AdminDialog({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} className={`aw-dialog ${wide ? 'aw-dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="aw-dialog-heading"><h2 id={titleId}>{title}</h2><button className="aw-icon" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></div>
    <div className="aw-dialog-content">{children}</div>
  </dialog>;
}
