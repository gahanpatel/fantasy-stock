'use client';

import { useState, useRef, useEffect } from 'react';
import { STOCKS, INITIAL_HOLDINGS, getStock, fmt, fmtPct } from '@/lib/data';
import { Stock } from '@/lib/types';

export default function TradePage() {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [cash, setCash] = useState(18420);
  const dropRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? STOCKS.filter(s => s.ticker.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  function selectStock(s: Stock) {
    setSelected(s);
    setQuery(s.ticker + ' — ' + s.name);
    setDropdownOpen(false);
    setShares('');
    setFeedback(null);
  }

  function setQuickQty(frac: number) {
    if (!selected) return;
    if (side === 'buy') {
      setShares(String(Math.max(1, Math.floor(cash / selected.price * frac))));
    } else {
      const held = INITIAL_HOLDINGS.find(h => h.ticker === selected.ticker);
      setShares(String(held ? Math.floor(held.shares * frac) : 0));
    }
  }

  function submitOrder() {
    if (!selected) { setFeedback({ msg: 'Please select a stock first.', type: 'error' }); return; }
    const qty = parseInt(shares);
    if (!qty || qty < 1) { setFeedback({ msg: 'Enter a valid number of shares.', type: 'error' }); return; }
    const total = qty * selected.price;
    if (side === 'buy' && total > cash) { setFeedback({ msg: 'Insufficient cash balance.', type: 'error' }); return; }
    if (side === 'sell') {
      const held = INITIAL_HOLDINGS.find(h => h.ticker === selected.ticker);
      if (!held || held.shares < qty) { setFeedback({ msg: "You don't own enough shares to sell.", type: 'error' }); return; }
    }
    setCash(c => side === 'buy' ? c - total : c + total);
    setShares('');
    setFeedback({ msg: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} share(s) of ${selected.ticker} for ${fmt(total)}.`, type: 'success' });
    setTimeout(() => setFeedback(null), 4000);
  }

  const qty = parseInt(shares) || 0;
  const total = selected ? qty * selected.price : 0;
  const cashAfter = side === 'buy' ? cash - total : cash + total;

  // Close dropdown on outside click
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
        <p className="text-slate-400 text-sm mt-1">Buy and sell stocks at simulated live prices</p>
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
              placeholder="Search ticker or company..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
            />
            {dropdownOpen && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 border-t-0 rounded-b-lg z-50 max-h-48 overflow-y-auto shadow-lg">
                {filtered.map(s => (
                  <div
                    key={s.ticker}
                    onClick={() => selectStock(s)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <span className="font-bold w-12 text-slate-800">{s.ticker}</span>
                    <span className="flex-1 text-slate-400 truncate">{s.name}</span>
                    <span className={`font-semibold ${s.chg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(s.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Stock Card */}
          {selected && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xl font-extrabold text-slate-800">{selected.ticker}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-slate-800">{fmt(selected.price)}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${selected.chg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selected.chg >= 0 ? '▲' : '▼'} {fmtPct(selected.chg)}
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
                type="number" min="1"
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

        {/* Right: Challenge + Market Table */}
        <div className="flex flex-col gap-4">
          {/* Weekly Challenge */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Weekly Challenge · Week of Mar 29</p>
            <h3 className="text-lg font-extrabold mb-1.5">Build a portfolio with beta under 0.8</h3>
            <p className="text-sm opacity-85 leading-relaxed">Reduce your portfolio's market sensitivity. Holdings with beta &lt; 0.8 earn 1.5× points this week.</p>
            <p className="text-xs opacity-70 mt-3">Ends Friday, April 4 at 4:00 PM ET</p>
          </div>

          {/* Market Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Market Overview</h2>
              <span className="text-xs text-slate-400">Click a row to select</span>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Symbol', 'Company', 'Price', 'Change', 'Volume'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STOCKS.map(s => (
                  <tr
                    key={s.ticker}
                    onClick={() => selectStock(s)}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm">{s.ticker}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{fmt(s.price)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${s.chg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {s.chg >= 0 ? '▲' : '▼'} {fmtPct(s.chg)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.vol}</td>
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
