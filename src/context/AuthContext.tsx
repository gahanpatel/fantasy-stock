'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

interface User { name: string; email: string; token: string }

interface AuthContextType {
  user: User | null;
  /** True until the stored session has been read. `user` is meaningless before this is false. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // The session lives in localStorage, which is unavailable during prerender, so
  // it can only be read in an effect. Consumers must wait for this to flip before
  // treating a null `user` as "signed out" — otherwise route guards fire against
  // the pre-hydration null and bounce signed-in users to /login.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tt_session');
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem('tt_session'); // corrupt entry — don't crash the app
    }
    setInitializing(false);
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    try {
      const data = await apiFetch<{ token: string; display_name: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const u: User = { name: data.display_name, email, token: data.token };
      setUser(u);
      localStorage.setItem('tt_session', JSON.stringify(u));
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Login failed';
    }
  }

  async function register(name: string, email: string, password: string): Promise<string | null> {
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: name }),
      });
      return await login(email, password);
    } catch (e: unknown) {
      return e instanceof Error ? e.message : 'Registration failed';
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('tt_session');
  }

  return <AuthContext.Provider value={{ user, initializing, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
