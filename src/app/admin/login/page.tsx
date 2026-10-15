'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [user, isAdmin, router]);

  if (user && isAdmin) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const normalizedEmail = email.trim();
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email and password are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      if ((await credential.user.getIdTokenResult(true)).claims.admin !== true) {
        await signOut(auth);
        setError('This account does not have staff access. Sign in with the bakery’s administrator account.');
        return;
      }
      // Auth context listens to onAuthStateChanged, so it handles the layout state
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          setError('Login failed. Check email/password, and ensure Email/Password sign-in is enabled in Firebase Auth.');
        } else if (err.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please wait a bit and try again.');
        } else {
          console.error(err);
          setError(`Login failed (${err.code}).`);
        }
      } else {
        console.error(err);
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page active" id="adminLoginPage">
      <div className="admin-login-page">
        <div className="login-card">
          <div className="login-icon"><Lock size={36} color="var(--brown)" strokeWidth={1.5} /></div>
          <h2>A little behind the scenes.</h2>
          <p className="login-subtitle">Sign in to manage the bakery.</p>
          
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
