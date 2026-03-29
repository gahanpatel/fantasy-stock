'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

interface User { name: string; email: string; token: string }

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tt_session');
    if (saved) setUser(JSON.parse(saved));
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

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
