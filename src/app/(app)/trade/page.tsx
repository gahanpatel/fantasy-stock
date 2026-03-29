'use client';

import { useState, useRef, useEffect } from 'react';
import { STOCKS, fmt, fmtPct } from '@/lib/data';
import { apiFetch } from '@/lib/api';

interface Quote { ticker: string; name: string; price: number; change: number; change_percent: number; sector: string }
interface PortfolioValue { cash: number; holdings_value: number; total_value: number }
interface Holding { ticker: string; quantity: number; market_value: number; pnl: number; pnl_percent: number }

export default function TradePage() {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [cash, setCash] = useState(0);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<PortfolioValue>('/portfolio/value').then(v => setCash(v.cash)).catch(console.error);
    apiFetch<{ holdings: Holding[] }>('/portfolio/holdings').then(h => setHoldings(h.holdings)).catch(console.error);
  }, []);

  const filtered = query.trim()
    ? STOCKS.filter(s => s.ticker.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  async function selectStock(ticker: string, name: string) {
    setQuery(ticker + ' — ' + name);
    setDropdownOpen(false);
    setShares('');
    setFeedback(null);
    setLoadingQuote(true);
    try {
      const q = await apiFetch<Quote>(`/market/quote/${ticker}`);
      setSelected(q);
    } catch {
      setFeedback({ msg: `Could not fetch quote for ${ticker}.`, type: 'error' });
    } finally {
      setLoadingQuote(false);
    }
  }

  function setQuickQty(frac: number) {
    if (!selected) return;
    if (side === 'buy') {
      setShares(String(Math.max(1, Math.floor(cash / selected.price * frac))));
    } else {
      const held = holdings.find(h => h.ticker === selected.ticker);
      setShares(String(held ? Math.floor((held as { quantity: number } & Holding).quantity * frac) : 0));
    }
  }

  async function submitOrder() {
    if (!selected) { setFeedback({ msg: 'Please select a stock first.', type: 'error' }); return; }
    const qty = parseFloat(shares);
    if (!qty || qty <= 0) { setFeedback({ msg: 'Enter a valid number of shares.', type: 'error' }); return; }

    try {
      const endpoint = side === 'buy' ? '/trading/buy' : '/trading/sell';
      const result = await apiFetch<{ message: string; cash_remaining?: number; cash_balance?: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ ticker: selected.ticker, quantity: qty }),
      });
      const newCash = result.cash_remaining ?? result.cash_balance ?? cash;
      setCash(newCash);
      // Refresh holdings
      apiFetch<{ holdings: Holding[] }>('/portfolio/holdings').then(h => setHoldings(h.holdings)).catch(console.error);
      setShares('');
      setFeedback({ msg: result.message, type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: unknown) {
      setFeedback({ msg: e instanceof Error ? e.message : 'Trade failed', type: 'error' });
    }
  }

  const qty = parseFloat(shares) || 0;
  const total = selected ? qty * selected.price : 0;
  const cashAfter = side === 'buy' ? cash - total : cash + total;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Trade</h1>
        <p className="text-slate-400 text-sm mt-1">Buy and sell stocks at live prices</p>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-5">
        {/* Left: Order Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="font-bold text-slate-800 mb-5">Place Order</h2>

          {/* Search */}
          <div className="relative mb-4" ref={dropRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
              onFocus={() => query && setDropdownOpen(true)}
              placeholder="Search ticker or company…"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
            />
            {dropdownOpen && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 border-t-0 rounded-b-lg z-50 max-h-48 overflow-y-auto shadow-lg">
                {filtered.map(s => (
                  <div
                    key={s.ticker}
                    onClick={() => selectStock(s.ticker, s.name)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <span className="font-bold w-12 text-slate-800">{s.ticker}</span>
                    <span className="flex-1 text-slate-400 truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Stock Card */}
          {loadingQuote && <p className="text-slate-400 text-sm mb-4">Fetching quote…</p>}
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

          {/* Buy/Sell Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${side === 'buy' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >Buy</button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${side === 'sell' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >Sell</button>
          </div>

          {/* Shares Input */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Shares</label>
              <input
                type="number" min="1" step="any"
                value={shares} onChange={e => setShares(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Price / Share</label>
              <input
                readOnly
                value={selected ? fmt(selected.price) : 'Market'}
                className="w-full border border-slate-100 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          {/* Quick Qty Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[0.25, 0.5, 0.75, 1].map(f => (
              <button
                key={f}
                onClick={() => setQuickQty(f)}
                className="py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors"
              >
                {f === 1 ? 'Max' : `${f * 100}%`}
              </button>
            ))}
          </div>

          {/* Order Preview */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
            <div className="flex justify-between text-sm py-1"><span className="text-slate-500">Price per share</span><span className="font-medium">{selected ? fmt(selected.price) : '—'}</span></div>
            <div className="flex justify-between text-sm py-1"><span className="text-slate-500">Shares</span><span className="font-medium">{qty || '—'}</span></div>
            <div className="flex justify-between text-sm font-bold py-2 border-t border-slate-200 mt-1">
              <span>Total cost</span><span>{qty && selected ? fmt(total) : '—'}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-400">Cash after trade</span>
              <span className={cashAfter < 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}>{fmt(Math.max(0, cashAfter))}</span>
            </div>
          </div>

          <button
            onClick={submitOrder}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 ${side === 'buy' ? 'bg-emerald-500' : 'bg-red-500'}`}
          >
            {side === 'buy' ? 'Buy Stock' : 'Sell Stock'}
          </button>

          {feedback && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Right: Market Table */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Stocks</h2>
              <span className="text-xs text-slate-400">Click a row to select · prices fetched live on select</span>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Symbol', 'Company', 'Sector'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STOCKS.map(s => (
                  <tr
                    key={s.ticker}
                    onClick={() => selectStock(s.ticker, s.name)}
                    className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${selected?.ticker === s.ticker ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm">{s.ticker}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
