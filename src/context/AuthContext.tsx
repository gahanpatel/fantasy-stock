'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { MOCK_USERS } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  useEffect(() => {
    const saved = localStorage.getItem('tt_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  function login(email: string, password: string): string | null {
    const found = users.find(u => u.email === email.toLowerCase() && u.password === password);
    if (!found) return 'Invalid email or password.';
    setUser(found);
    localStorage.setItem('tt_user', JSON.stringify(found));
    return null;
  }

  function register(name: string, email: string, password: string): string | null {
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (users.find(u => u.email === email.toLowerCase())) return 'Email already registered.';
    const newUser: User = { email: email.toLowerCase(), password, name };
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    localStorage.setItem('tt_user', JSON.stringify(newUser));
    return null;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('tt_user');
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
