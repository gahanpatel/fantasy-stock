'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User { name: string; email: string; token: string }

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const MOCK_USERS = [
  { email: 'shloka@tamid.org',  password: 'tamid123', name: 'Shloka'    },
  { email: 'demo@tamid.org',    password: 'demo',     name: 'Demo User' },
  { email: 'nshloka.nathan@gmail.com', password: 'tamid123', name: 'Shloka' },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tt_session');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    const found = MOCK_USERS.find(u => u.email === email.toLowerCase() && u.password === password);
    if (!found) return 'Invalid email or password.';
    const u: User = { name: found.name, email: found.email, token: 'mock-token' };
    setUser(u);
    localStorage.setItem('tt_session', JSON.stringify(u));
    return null;
  }

  async function register(name: string, email: string, password: string): Promise<string | null> {
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (MOCK_USERS.find(u => u.email === email.toLowerCase())) return 'Email already registered.';
    MOCK_USERS.push({ email: email.toLowerCase(), password, name });
    return login(email, password);
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
