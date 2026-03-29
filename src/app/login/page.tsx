'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(loginEmail, loginPass);
    if (err) { setError(err); setLoading(false); }
    else router.push('/dashboard');
  }

  async function handleRegister(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await register(regName, regEmail, regPass);
    if (err) { setError(err); setLoading(false); }
    else router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-blue-950">
      <div className="bg-white rounded-2xl p-10 w-96 shadow-2xl">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-indigo-600">
            Tamid<span className="text-emerald-500">Trades</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Fantasy Stock League — compete smarter, not just luckier.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'login' ? 'Log In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
              <input
                type="email" required
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@northeastern.edu"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                type="password" required
                value={loginPass} onChange={e => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 font-bold text-sm transition-colors disabled:opacity-60">
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Display Name</label>
              <input
                type="text" required
                value={regName} onChange={e => setRegName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
              <input
                type="email" required
                value={regEmail} onChange={e => setRegEmail(e.target.value)}
                placeholder="you@northeastern.edu"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                type="password" required
                value={regPass} onChange={e => setRegPass(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 font-bold text-sm transition-colors disabled:opacity-60">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
