"use client";
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import getCroppedImg from '@/lib/cropImage';
import OptimizedImage from '@/components/OptimizedImage';
import AdminDialog from './AdminDialog';

export default function AdminImageField({ value, onChange, label = 'Image' }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [source, setSource] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [area, setArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTask = useRef<UploadTask | null>(null);
  useEffect(() => () => { uploadTask.current?.cancel(); }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const close = () => { setSource(''); setArea(null); setCrop({ x: 0, y: 0 }); setZoom(1); };
  const upload = async () => {
    if (!source || !area) return;
    setBusy(true); setError('');
    try {
      const data = await getCroppedImg(source, area);
      const target = ref(storage, `images/${crypto.randomUUID()}.png`);
      const blob = await (await fetch(data)).blob();
      const task = uploadBytesResumable(target, blob, { contentType: 'image/png' });
      uploadTask.current = task;
      const timeout = setTimeout(() => task.cancel(), 45000);
      try { await task; } finally { clearTimeout(timeout); uploadTask.current = null; }
      onChange(await getDownloadURL(target)); close();
    } catch { setError('The upload was cancelled or could not finish. Check your connection and image permissions, then retry.'); }
    finally { setBusy(false); }
  };
  return <div className="aw-image-field"><label>{label}<input type="url" value={value.startsWith('http') ? value : ''} placeholder="Paste an image URL, or upload below" onChange={event => onChange(event.target.value)} /></label><div className="aw-image-row">{value ? <OptimizedImage src={value} alt={`${label} preview`} width={72} height={72} /> : <span className="aw-image-placeholder">Photo</span>}<button className="aw-button secondary" type="button" onClick={() => fileInput.current?.click()}>Upload & crop</button>{value && <button className="aw-inline-link" type="button" onClick={() => onChange('')}>Remove</button>}</div><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; setError(''); if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('Choose a JPG, PNG, or WebP photo under 8 MB.'); return; } setSource(URL.createObjectURL(file)); }} />{error && !source && <p className="aw-alert" role="alert">{error}</p>}{source && <AdminDialog title="Frame your photo" onClose={close} busy={busy}><div className="aw-crop-area"><Cropper image={source} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} /></div><label>Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label><label>Image shape<select value={aspect} onChange={event => setAspect(Number(event.target.value))}><option value={1}>Square</option><option value={1.5}>Landscape</option><option value={0.8}>Portrait</option></select></label>{error && <p className="aw-alert" role="alert">{error}</p>}<div className="aw-dialog-actions"><button type="button" className="aw-button secondary" onClick={() => { if (busy) uploadTask.current?.cancel(); else close(); }}>{busy ? 'Cancel upload' : 'Cancel'}</button><button type="button" className="aw-button" disabled={busy || !area} onClick={upload}>{busy ? 'Uploading…' : 'Use this photo'}</button></div></AdminDialog>}</div>;
}
