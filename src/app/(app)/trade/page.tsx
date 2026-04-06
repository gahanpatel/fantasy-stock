'use client';

import { useState, useRef, useEffect } from 'react';
import { STOCKS, fmt, fmtPct } from '@/lib/data';
import { apiFetch } from '@/lib/api';

interface Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  sector?: string;
  market_cap: number | null;
  beta: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  eps: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  avg_volume: number | null;
  dividend_yield: number | null;
  price_to_book: number | null;
}
interface PortfolioValue { cash: number; holdings_value: number; total_value: number }

export default function TradePage() {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [shares, setShares] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [cash, setCash] = useState(0);
const [liveData, setLiveData] = useState<Record<string, { price: number; change_percent: number }>>({});
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<PortfolioValue>('/portfolio/value').then(v => setCash(v.cash)).catch(console.error);
    (async () => {
      const batchSize = 5;
      for (let i = 0; i < STOCKS.length; i += batchSize) {
        await Promise.all(STOCKS.slice(i, i + batchSize).map(async s => {
          try {
            const res = await fetch(`/api/quote/${s.ticker}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.error) setLiveData(prev => ({ ...prev, [s.ticker]: { price: data.price, change_percent: data.change_percent } }));
          } catch { /* silently skip */ }
        }));
        if (i + batchSize < STOCKS.length) await new Promise(r => setTimeout(r, 300));
      }
    })();
  }, []);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCKS;
    const matches = STOCKS.filter(s =>
      s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
    return matches.sort((a, b) => {
      const aTickerStarts = a.ticker.toLowerCase().startsWith(q);
      const bTickerStarts = b.ticker.toLowerCase().startsWith(q);
      const aNameStarts   = a.name.toLowerCase().startsWith(q);
      const bNameStarts   = b.name.toLowerCase().startsWith(q);
      const aScore = aTickerStarts ? 0 : aNameStarts ? 1 : 2;
      const bScore = bTickerStarts ? 0 : bNameStarts ? 1 : 2;
      return aScore - bScore;
    });
  })();

  const topGainers = [...STOCKS]
    .sort((a, b) => (liveData[b.ticker]?.change_percent ?? b.chg) - (liveData[a.ticker]?.change_percent ?? a.chg))
    .slice(0, 15);

  async function selectStock(ticker: string, name: string) {
    const cleanTicker = ticker.split(/[\s—–-]/)[0].toUpperCase();
    setQuery(cleanTicker + (name !== cleanTicker ? ' — ' + name : ''));
    setDropdownOpen(false);
    setShares('');
    setFeedback(null);
    setLoadingQuote(true);
    try {
      // Fetch extended quote (price + metrics) from Next.js API route → Yahoo Finance
      const res = await fetch(`/api/quote/${cleanTicker}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to fetch');
      setSelected(data as Quote);
    } catch {
      setFeedback({ msg: `Could not fetch quote for ${cleanTicker}.`, type: 'error' });
    } finally {
      setLoadingQuote(false);
    }
  }

  function setQuickQty(frac: number) {
    if (!selected) return;
    setShares(String(Math.max(1, Math.floor(cash / selected.price * frac))));
  }

  async function submitOrder() {
    if (!selected) { setFeedback({ msg: 'Please select a stock first.', type: 'error' }); return; }
    const qty = parseFloat(shares);
    if (!qty || qty <= 0) { setFeedback({ msg: 'Enter a valid number of shares.', type: 'error' }); return; }

    try {
      const result = await apiFetch<{ message: string; cash_remaining?: number; cash_balance?: number }>('/trading/buy', {
        method: 'POST',
        body: JSON.stringify({ ticker: selected.ticker, quantity: qty }),
      });
      const newCash = result.cash_remaining ?? result.cash_balance ?? cash;
      setCash(newCash);
      setShares('');
      setFeedback({ msg: result.message, type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: unknown) {
      setFeedback({ msg: e instanceof Error ? e.message : 'Trade failed', type: 'error' });
    }
  }

  const qty = parseFloat(shares) || 0;
  const total = selected ? qty * selected.price : 0;
  const cashAfter = cash - total;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function fmtCap(n: number | null): string {
    if (n === null) return '—';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  }

  function fmtVol(n: number | null): string {
    if (n === null) return '—';
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toLocaleString();
  }

  function fmtNum(n: number | null, decimals = 2): string {
    return n === null ? '—' : n.toFixed(decimals);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Trade</h1>
        <p className="text-slate-400 text-sm mt-1">Buy and sell stocks at live prices</p>
      </div>

      <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[380px_1fr] gap-5 items-start">
        {/* Left: Order Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-5">Place Order</h2>

          <div className="relative mb-4" ref={dropRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={e => { e.target.select(); setDropdownOpen(true); }}
                  onKeyDown={e => { if (e.key === 'Enter') { const t = query.trim().toUpperCase(); setDropdownOpen(false); selectStock(t, t); } }}
                  placeholder="Search or type any ticker…"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                onClick={() => { const t = query.trim().toUpperCase(); if (t) { setDropdownOpen(false); selectStock(t, t); } }}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >Go</button>
            </div>
            {dropdownOpen && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 border-t-0 rounded-b-lg z-50 max-h-72 overflow-y-auto shadow-lg">
                {filtered.map(s => (
                  <div key={s.ticker} onClick={() => selectStock(s.ticker, s.name)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm">
                    <span className="font-bold w-12 text-slate-800">{s.ticker}</span>
                    <span className="flex-1 text-slate-400 truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loadingQuote && <p className="text-slate-400 text-sm mb-4">Fetching live price…</p>}
          {selected && !loadingQuote && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xl font-extrabold text-slate-800">{selected.ticker}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-slate-800">{fmt(selected.price)}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${selected.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selected.change >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(selected.change_percent))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Shares</label>
              <input type="number" min="1" step="1" value={shares} onChange={e => setShares(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Price / Share</label>
              <input readOnly value={selected ? fmt(selected.price) : 'Market'} className="w-full border border-slate-100 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[0.25, 0.5, 0.75, 1].map(f => (
              <button key={f} onClick={() => setQuickQty(f)} className="py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors">
                {f === 1 ? 'Max' : `${f * 100}%`}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
            <div className="flex justify-between text-sm py-1"><span className="text-slate-500">Price per share</span><span className="font-medium">{selected ? fmt(selected.price) : '—'}</span></div>
            <div className="flex justify-between text-sm py-1"><span className="text-slate-500">Shares</span><span className="font-medium">{qty || '—'}</span></div>
            <div className="flex justify-between text-sm font-bold py-2 border-t border-slate-200 mt-1"><span>Total cost</span><span>{qty && selected ? fmt(total) : '—'}</span></div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-400">Cash after trade</span>
              <span className={cashAfter < 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}>{fmt(Math.max(0, cashAfter))}</span>
            </div>
          </div>

          <button onClick={submitOrder} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 bg-emerald-500">
            Buy Stock
          </button>

          {feedback && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Right: Top Gainers */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Top Gainers</h2>
            <span className="text-xs text-slate-400">Top 15 by % change today · click to select</span>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Symbol', 'Company', 'Sector', 'Price', 'Change'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topGainers.map(s => (
                <tr key={s.ticker} onClick={() => selectStock(s.ticker, s.name)} className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${selected?.ticker === s.ticker ? 'bg-indigo-50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-slate-800 text-sm">{s.ticker}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.sector}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{fmt(liveData[s.ticker]?.price ?? s.price)}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${(liveData[s.ticker]?.change_percent ?? s.chg) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {(liveData[s.ticker]?.change_percent ?? s.chg) >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(liveData[s.ticker]?.change_percent ?? s.chg))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics — full width below both columns */}
      {selected && !loadingQuote && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800">{selected.ticker} — Key Metrics</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selected.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold text-slate-800">{fmt(selected.price)}</p>
              <p className={`text-xs font-semibold ${selected.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {selected.change >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(selected.change))} ({fmtPct(Math.abs(selected.change_percent))})
              </p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Market Cap',     value: fmtCap(selected.market_cap) },
              { label: 'Beta',           value: fmtNum(selected.beta) },
              { label: 'P/E Ratio',      value: fmtNum(selected.pe_ratio) },
              { label: 'Forward P/E',    value: fmtNum(selected.forward_pe) },
              { label: 'EPS',            value: selected.eps !== null ? `$${fmtNum(selected.eps)}` : '—' },
              { label: '52W High',       value: selected.week_52_high !== null ? fmt(selected.week_52_high) : '—' },
              { label: '52W Low',        value: selected.week_52_low !== null ? fmt(selected.week_52_low) : '—' },
              { label: 'Avg Volume',     value: fmtVol(selected.avg_volume) },
              { label: 'Dividend Yield', value: selected.dividend_yield !== null ? `${fmtNum(selected.dividend_yield)}%` : '—' },
              { label: 'Price/Book',     value: fmtNum(selected.price_to_book) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-extrabold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
