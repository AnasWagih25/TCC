"use client";
import { useRef, useState } from 'react';
import { confirmWrite } from '@/lib/confirm-write';
export function useAdminAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState({ error: false, text: '' });
  const perform = async (key: string, action: () => Promise<void>, success: string) => {
    if (lock.current) return false;
    lock.current = true; setBusy(key); setNotice({ error: false, text: '' });
    try { await confirmWrite(action(), 45000); setNotice({ error: false, text: success }); return true; }
    catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : 'The change could not be saved. Check your connection and retry.' }); return false; }
    finally { lock.current = false; setBusy(''); }
  };
  return { busy, notice, perform };
}
