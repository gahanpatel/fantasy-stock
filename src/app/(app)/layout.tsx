'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
      return;
    }
    // Skip check if already on the questionnaire page
    if (pathname === '/questionnaire') return;

    apiFetch<{ completed: boolean }>('/questionnaire/status')
      .then(({ completed }) => {
        if (!completed) router.replace('/questionnaire');
      })
      .catch(() => {/* allow through if check fails */});
  }, [user, router, pathname]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 min-h-screen">{children}</main>
    </div>
  );
}
