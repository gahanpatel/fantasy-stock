'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

const NAV = [
  { href: '/dashboard',     icon: '📊', label: 'Dashboard'   },
  { href: '/portfolio',     icon: '💼', label: 'Portfolio'   },
  { href: '/trade',         icon: '⚡', label: 'Trade'       },
  { href: '/leaderboard',   icon: '🏆', label: 'Leaderboard' },
  { href: '/history',       icon: '🕒', label: 'History'     },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.name) return;
    apiFetch<{ leaderboard: { display_name: string; rank: number }[] }>('/leaderboard')
      .then(d => {
        const me = d.leaderboard.find(e => e.display_name === user.name);
        if (me) setRank(me.rank);
      })
      .catch(() => null);
  }, [user?.name]);

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 bg-slate-950 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-xl font-extrabold text-white tracking-tight">
          Tamid<span className="text-emerald-400">Trades</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs">{rank ? `Rank #${rank}` : 'Loading…'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-slate-500 hover:text-red-400 text-xs transition-colors"
        >
          ← Log out
        </button>
      </div>
    </aside>
  );
}
