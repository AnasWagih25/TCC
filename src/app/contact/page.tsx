'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'General Inquiry',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to send');
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', inquiryType: 'General Inquiry', message: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="page active polka-bg" style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '100vh' }}>
      <div className="section-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--pink) 0%, var(--pink-dark) 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 16px', color: 'var(--brown)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}><MessageSquare size={30} /></div>
          <h2 style={{ fontSize: '3rem', color: '#FFFFFF', marginBottom: '16px' }}>Contact Us</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--pink-light)', maxWidth: '600px', margin: '0 auto' }}>
            Have a question, feedback, or a special request? We'd love to hear from you. Fill out the form below and our team will get back to you shortly.
          </p>
        </div>

        <div style={{ background: 'var(--white)', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(99, 61, 45, 0.08)', border: '1.5px solid rgba(99, 61, 45, 0.12)' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle2 size={64} color="#27ae60" style={{ margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '2rem', color: 'var(--brown)', marginBottom: '16px' }}>Message Sent!</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--brown-light)' }}>Thank you for reaching out. We will get back to you as soon as possible.</p>
              <button className="btn btn-primary" onClick={() => setStatus('idle')} style={{ marginTop: '24px' }}>Send Another Message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Full Name *</label>
                  <input
                    type="text" required placeholder="Ahmed Mohamed"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(99, 61, 45, 0.18)', background: 'var(--off-white)', fontSize: '1rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Email Address *</label>
                  <input
                    type="email" required placeholder="you@example.com"
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(99, 61, 45, 0.18)', background: 'var(--off-white)', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Phone Number</label>
                  <input
                    type="tel" placeholder="01xxxxxxxxx"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(99, 61, 45, 0.18)', background: 'var(--off-white)', fontSize: '1rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Inquiry Type *</label>
                  <select
                    required
                    value={formData.inquiryType} onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(99, 61, 45, 0.18)', background: 'var(--off-white)', fontSize: '1rem', appearance: 'none' }}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Corporate/Bulk Event">Corporate & Bulk Events</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Your Message *</label>
                <textarea
                  required placeholder="How can we help you today?"
                  value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(99, 61, 45, 0.18)', background: 'var(--off-white)', fontSize: '1rem', minHeight: '150px', fontFamily: 'inherit' }}
                />
              </div>

              {status === 'error' && (
                <div style={{ color: '#e74c3c', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
                  Failed to send message. Please try again later.
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={status === 'sending'}
                style={{ 
                  width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 600,
                  borderRadius: '12px', letterSpacing: '0.02em', boxShadow: '0 6px 20px rgba(99, 61, 45, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: status === 'sending' ? 0.7 : 1,
                  cursor: status === 'sending' ? 'not-allowed' : 'pointer'
                }}
              >
                {status === 'sending' ? 'Sending...' : <><Send size={20} /> Send Message</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
