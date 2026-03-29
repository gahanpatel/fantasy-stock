'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 min-h-screen">{children}</main>
    </div>
  );
}
