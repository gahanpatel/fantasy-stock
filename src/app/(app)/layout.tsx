'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for the stored session to load first. Child effects run before parent
    // effects, so without this guard we redirect on the pre-hydration null and
    // kick signed-in users to /login on every refresh.
    if (!initializing && !user) router.replace('/login');
  }, [user, initializing, router]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 min-h-screen">{children}</main>
    </div>
  );
}
