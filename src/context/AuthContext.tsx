'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let version = 0;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const request = ++version;
      let admin = false;
      if (currentUser) {
        try { admin = (await currentUser.getIdTokenResult(true)).claims.admin === true; }
        catch { try { admin = (await currentUser.getIdTokenResult()).claims.admin === true; } catch { /* Staff access remains unavailable. */ } }
      }
      if (!active || request !== version) return;
      setUser(currentUser);
      setIsAdmin(admin);
      setLoading(false);
    });

    return () => { active = false; unsubscribe(); };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      throw new Error('Sign out failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
