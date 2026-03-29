'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { fmt, fmtPct } from '@/lib/data';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const STARTING_CASH = 100000;

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#6366f1',
  Financials: '#10b981',
  'Health Care': '#f59e0b',
  'Consumer Discretionary': '#f97316',
  Cash: '#94a3b8',
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

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [pv, setPv] = useState<PortfolioValue | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ holdings: Holding[] }>('/portfolio/holdings'),
      apiFetch<PortfolioValue>('/portfolio/value'),
      apiFetch<{ history: HistoryEntry[] }>('/portfolio/history'),
    ]).then(([h, v, hist]) => {
      setHoldings(h.holdings);
      setPv(v);
      setHistory(hist.history);
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
    const sector = h.sector ?? 'Other';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + h.market_value;
  });
  if (pv?.cash) sectorMap['Cash'] = pv.cash;
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

  const chartLabels = history.length > 0 ? history.map(h => h.snapshot_date) : ['Start'];
  const chartValues = history.length > 0 ? history.map(h => h.total_value) : [STARTING_CASH];

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
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total Value',     value: pv ? fmt(pv.total_value)   : '—', change: `${totalPnlPct >= 0 ? '▲' : '▼'} ${Math.abs(totalPnlPct).toFixed(2)}% all-time`, color: totalPnlPct >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Unrealized P&L', value: fmt(totalPnl),              change: `${totalPnl >= 0 ? '▲' : '▼'} on cost basis`,                                           color: totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Cash Balance',   value: pv ? fmt(pv.cash) : '—',   change: 'Available to invest',                                                                    color: 'text-slate-400' },
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
