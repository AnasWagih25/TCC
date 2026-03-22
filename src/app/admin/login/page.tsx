'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth context listens to onAuthStateChanged, so it handles the layout state
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Invalid credentials. Please verify your staff access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page active" id="adminLoginPage">
      <div className="admin-login-page">
        <div className="login-card">
          <div className="login-icon"><Lock size={36} color="var(--brown)" strokeWidth={1.5} /></div>
          <h2>Admin Access</h2>
          <p className="login-subtitle">For staff use only (Firebase Auth)</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label htmlFor="adminEmail">Email Address</label>
              <input 
                type="email" 
                id="adminEmail" 
                required 
                autoComplete="username" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label htmlFor="adminPass">Password</label>
              <input 
                type="password" 
                id="adminPass" 
                required 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="login-error show">{error}</div>}
            <button type="submit" className="btn btn-pink" style={{ width: '100%', marginTop: '8px' }} disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Log In'}
            </button>
          </form>
          <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--gray)' }}>
            <Link href="/" style={{ textDecoration: 'underline' }}>&larr; Back to website</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
