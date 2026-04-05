'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { fmt, fmtPct, STOCKS } from '@/lib/data';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const STARTING_CASH = 100000;

const SECTOR_COLORS: Record<string, string> = {
  Technology:              '#6366f1',
  Financials:              '#10b981',
  'Health Care':           '#f59e0b',
  'Consumer Discretionary':'#f97316',
  'Consumer Staples':      '#84cc16',
  Energy:                  '#ef4444',
  Industrials:             '#3b82f6',
  ETF:                     '#a855f7',
  Other:                   '#94a3b8',
};

interface Holding {
  ticker: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  pnl: number;
  pnl_percent: number;
  sector?: string;
}

interface PortfolioValue { cash: number; holdings_value: number; total_value: number }
interface HistoryEntry { snapshot_date: string; total_value: number }
interface Analytics { sharpe_ratio: number | null; annualized_return: number | null; volatility: number | null }

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [pv, setPv] = useState<PortfolioValue | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [sellModal, setSellModal] = useState<Holding | null>(null);
  const [sellShares, setSellShares] = useState('');
  const [sellFeedback, setSellFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selling, setSelling] = useState(false);

  function openSell(h: Holding) {
    setSellModal(h);
    setSellShares('');
    setSellFeedback(null);
  }

  async function submitSell() {
    if (!sellModal) return;
    const qty = parseFloat(sellShares);
    if (!qty || qty <= 0) { setSellFeedback({ msg: 'Enter a valid number of shares.', type: 'error' }); return; }
    if (qty > sellModal.quantity) { setSellFeedback({ msg: `You only have ${sellModal.quantity} shares.`, type: 'error' }); return; }
    setSelling(true);
    try {
      const result = await apiFetch<{ message: string; cash_balance?: number }>('/trading/sell', {
        method: 'POST',
        body: JSON.stringify({ ticker: sellModal.ticker, quantity: qty }),
      });
      setSellFeedback({ msg: result.message, type: 'success' });
      // Refresh data
      const [h, v] = await Promise.all([
        apiFetch<{ holdings: Holding[] }>('/portfolio/holdings'),
        apiFetch<PortfolioValue>('/portfolio/value'),
      ]);
      setHoldings(h.holdings);
      setPv(v);
      setTimeout(() => setSellModal(null), 1500);
    } catch (e: unknown) {
      setSellFeedback({ msg: e instanceof Error ? e.message : 'Sell failed', type: 'error' });
    } finally {
      setSelling(false);
    }
  }

  useEffect(() => {
    Promise.all([
      apiFetch<{ holdings: Holding[] }>('/portfolio/holdings'),
      apiFetch<PortfolioValue>('/portfolio/value'),
      apiFetch<{ history: HistoryEntry[] }>('/portfolio/history'),
      apiFetch<Analytics>('/portfolio/analytics').catch(() => null),
    ]).then(([h, v, hist, a]) => {
      setHoldings(h.holdings);
      setPv(v);
      setHistory(hist.history);
      setAnalytics(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  }

  const keys = ['ticker', 'quantity', 'average_cost', 'current_price', 'market_value', 'pnl', 'pnl_percent'] as const;
  const sorted = [...holdings].sort((a, b) => {
    if (sortCol === null) return 0;
    const k = keys[sortCol];
    const av = a[k] as string | number, bv = b[k] as string | number;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  function Th({ col, children }: { col: number; children: string }) {
    return (
      <th
        className={`text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors ${sortCol === col ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        onClick={() => handleSort(col)}
      >
        {children} {sortCol === col ? (sortAsc ? '↑' : '↓') : '↕'}
      </th>
    );
  }

  const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const totalPnlPct = ((pv?.total_value ?? STARTING_CASH) - STARTING_CASH) / STARTING_CASH * 100;

  // Sector breakdown
  const sectorMap: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = STOCKS.find(s => s.ticker === h.ticker)?.sector ?? 'Other';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + h.market_value;
  });
  const sectorLabels = Object.keys(sectorMap);
  const sectorValues = Object.values(sectorMap);
  const total = sectorValues.reduce((a, b) => a + b, 0);

  const sectorChartData = {
    labels: sectorLabels,
    datasets: [{
      data: sectorValues,
      backgroundColor: sectorLabels.map(l => SECTOR_COLORS[l] ?? '#e2e8f0'),
      borderWidth: 0,
    }],
  };

  const chartLabels = history.length > 0
    ? ['Start', ...history.map(h => h.snapshot_date)]
    : ['Start', 'Now'];
  const chartValues = history.length > 0
    ? [STARTING_CASH, ...history.map(h => h.total_value)]
    : [STARTING_CASH, pv?.total_value ?? STARTING_CASH];

  const lineData = {
    labels: chartLabels,
    datasets: [
      { label: 'My Portfolio', data: chartValues, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.1)', tension: 0.4, pointRadius: 3, fill: true },
    ],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">My Portfolio</h1>
        <p className="text-slate-400 text-sm mt-1">
          {holdings.length} position{holdings.length !== 1 ? 's' : ''} · {pv ? fmt(pv.holdings_value) : '…'} invested · {pv ? fmt(pv.cash) : '…'} cash
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Value',     value: pv ? fmt(pv.total_value) : '—', change: `${totalPnlPct >= 0 ? '▲' : '▼'} ${Math.abs(totalPnlPct).toFixed(2)}% all-time`, color: totalPnlPct >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Unrealized P&L', value: fmt(totalPnl),                   change: `${totalPnl >= 0 ? '▲' : '▼'} on cost basis`,                                    color: totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Cash Balance',   value: pv ? fmt(pv.cash) : '—',         change: 'Available to invest',                                                             color: 'text-slate-400' },
              {
                label: 'Sharpe Ratio',
                value: analytics?.sharpe_ratio !== null && analytics?.sharpe_ratio !== undefined ? analytics.sharpe_ratio.toFixed(2) : '—',
                change: 'Risk-adjusted return',
                color: analytics?.sharpe_ratio !== null && analytics?.sharpe_ratio !== undefined
                  ? analytics.sharpe_ratio >= 1 ? 'text-emerald-500' : analytics.sharpe_ratio >= 0 ? 'text-yellow-500' : 'text-red-500'
                  : 'text-slate-400',
              },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{c.label}</p>
                <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                <p className={`text-sm font-semibold mt-1 ${c.color}`}>{c.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_240px] gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-4">Portfolio History</h2>
              <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: unknown) => '$' + ((v as number) / 1000).toFixed(0) + 'k' } } } }} />
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-4">Sector Allocation</h2>
              {total > 0 ? (
                <>
                  <Doughnut
                    data={sectorChartData}
                    options={{ cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { label: string; raw: unknown }) => ' ' + c.label + ': ' + fmt(c.raw as number) } } } }}
                  />
                  <div className="mt-3 flex flex-col gap-1.5">
                    {sectorLabels.map((l, i) => (
                      <div key={l} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: SECTOR_COLORS[l] ?? '#e2e8f0' }} />
                        <span className="flex-1 text-slate-400">{l}</span>
                        <span className="font-bold text-slate-700">{((sectorValues[i] / total) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm">No holdings yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">All Holdings</h2>
            </div>
            {holdings.length === 0 ? (
              <p className="px-5 py-8 text-slate-400 text-sm text-center">No holdings yet.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <Th col={0}>Ticker</Th>
                    <Th col={1}>Shares</Th>
                    <Th col={2}>Avg Cost</Th>
                    <Th col={3}>Current</Th>
                    <Th col={4}>Mkt Value</Th>
                    <Th col={5}>P&L</Th>
                    <Th col={6}>% Chg</Th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.ticker} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">{r.ticker}</td>
                      <td className="px-4 py-3 text-sm">{r.quantity}</td>
                      <td className="px-4 py-3 text-sm">{fmt(r.average_cost)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{fmt(r.current_price)}</td>
                      <td className="px-4 py-3 text-sm font-bold">{fmt(r.market_value)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${r.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {r.pnl >= 0 ? '+' : ''}{fmt(r.pnl)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${r.pnl_percent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {fmtPct(r.pnl_percent)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openSell(r)} className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Sell Modal */}
            {sellModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setSellModal(null); }}>
                <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
                  <h2 className="font-bold text-slate-800 text-lg mb-1">Sell {sellModal.ticker}</h2>
                  <p className="text-xs text-slate-400 mb-4">You own {sellModal.quantity} share{sellModal.quantity !== 1 ? 's' : ''} · current price {fmt(sellModal.current_price)}</p>

                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Shares to sell</label>
                  <input
                    type="number" min="1" max={sellModal.quantity} step="any"
                    value={sellShares}
                    onChange={e => setSellShares(e.target.value)}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-red-400 mb-3"
                    autoFocus
                  />

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[0.25, 0.5, 0.75, 1].map(f => (
                      <button key={f} onClick={() => setSellShares(String(Math.floor(sellModal.quantity * f)))}
                        className="py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                        {f === 1 ? 'All' : `${f * 100}%`}
                      </button>
                    ))}
                  </div>

                  {sellShares && parseFloat(sellShares) > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm border border-slate-100">
                      <div className="flex justify-between py-0.5"><span className="text-slate-400">Proceeds</span><span className="font-bold">{fmt(parseFloat(sellShares) * sellModal.current_price)}</span></div>
                    </div>
                  )}

                  {sellFeedback && (
                    <div className={`mb-3 p-3 rounded-lg text-sm font-semibold ${sellFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {sellFeedback.msg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setSellModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={submitSell} disabled={selling} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                      {selling ? 'Selling…' : 'Confirm Sell'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
