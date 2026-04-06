'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { fmt } from '@/lib/data';

interface Trade {
  id: string;
  ticker: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSide, setFilterSide] = useState('all');
  const [filterTicker, setFilterTicker] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    apiFetch<{ trades: Trade[] }>('/portfolio/trades')
      .then(d => setTrades(d.trades))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allTickers = [...new Set(trades.map(t => t.ticker))].sort();

  const filtered = trades.filter(t => {
    if (filterSide !== 'all' && t.side !== filterSide) return false;
    if (filterTicker !== 'all' && t.ticker !== filterTicker) return false;
    if (filterPeriod !== 'all') {
      const cutoff = new Date(Date.now() - parseInt(filterPeriod) * 86400000).toISOString().slice(0, 10);
      if (t.created_at.slice(0, 10) < cutoff) return false;
    }
    return true;
  });

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortCol === null) return 0;
    const pairs: [string | number, string | number][] = [
      [a.created_at, b.created_at],
      [a.ticker,     b.ticker],
      [a.side,       b.side],
      [a.quantity,   b.quantity],
      [a.price,      b.price],
      [a.total,      b.total],
    ];
    const [av, bv] = pairs[sortCol] ?? ['', ''];
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  function Th({ col, children }: { col: number; children: string }) {
    return (
      <th
        onClick={() => handleSort(col)}
        className={`text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${sortCol === col ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {children} {sortCol === col ? (sortAsc ? '↑' : '↓') : '↕'}
      </th>
    );
  }

  const totalBuys  = filtered.filter(t => t.side === 'buy').reduce((s, t) => s + t.total, 0);
  const totalSells = filtered.filter(t => t.side === 'sell').reduce((s, t) => s + t.total, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Transaction History</h1>
        <p className="text-slate-400 text-sm mt-1">All your trades since account creation</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Trades</p>
          <p className="text-2xl font-extrabold text-slate-800">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Bought</p>
          <p className="text-2xl font-extrabold text-slate-800">{fmt(totalBuys)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Sold</p>
          <p className="text-2xl font-extrabold text-slate-800">{fmt(totalSells)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
          <select value={filterSide} onChange={e => setFilterSide(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-indigo-500">
            <option value="all">All Trades</option>
            <option value="buy">Buys Only</option>
            <option value="sell">Sells Only</option>
          </select>
          <select value={filterTicker} onChange={e => setFilterTicker(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-indigo-500">
            <option value="all">All Tickers</option>
            {allTickers.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-indigo-500">
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="7">Last 7 Days</option>
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <Th col={0}>Date</Th>
                <Th col={1}>Ticker</Th>
                <Th col={2}>Side</Th>
                <Th col={3}>Qty</Th>
                <Th col={4}>Price</Th>
                <Th col={5}>Total</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">No trades match your filters.</td></tr>
              ) : sorted.map(t => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-sm">{t.ticker}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.side === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.side === 'buy' ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{t.quantity}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{fmt(t.price)}</td>
                  <td className="px-4 py-3 text-sm font-bold">{fmt(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
