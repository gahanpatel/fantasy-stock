'use client';

import { INITIAL_HOLDINGS, STOCKS, CHART_LABELS, PORTFOLIO_VALUES, SP500_VALUES, getStock, fmt, fmtPct } from '@/lib/data';
import { useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#6366f1',
  Financials: '#10b981',
  'Health Care': '#f59e0b',
  Cash: '#94a3b8',
};

function HoldingCard({ ticker, shares, avgCost }: { ticker: string; shares: number; avgCost: number }) {
  const s = getStock(ticker)!;
  const val = s.price * shares;
  const chgColor = s.chg >= 0 ? 'text-emerald-500' : 'text-red-500';
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
      <p className="text-lg font-extrabold text-slate-800">{ticker}</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">{s.name}</p>
      <p className="text-base font-bold text-slate-800">{fmt(s.price)}</p>
      <p className={`text-xs font-semibold mt-1 ${chgColor}`}>{s.chg >= 0 ? '▲' : '▼'} {fmtPct(s.chg)} today</p>
      <p className="text-xs text-slate-400 mt-2">{shares} shares · {fmt(val)}</p>
    </div>
  );
}

export default function PortfolioPage() {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  // Sector breakdown
  const sectorMap: Record<string, number> = {};
  INITIAL_HOLDINGS.forEach(h => {
    const s = getStock(h.ticker)!;
    sectorMap[s.sector] = (sectorMap[s.sector] ?? 0) + s.price * h.shares;
  });
  sectorMap['Cash'] = 18420;
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

  const lineData = {
    labels: CHART_LABELS,
    datasets: [
      { label: 'My Portfolio', data: PORTFOLIO_VALUES.map(v => v / 1000), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.1)', tension: 0.4, pointRadius: 3, fill: true },
      { label: 'S&P 500',      data: SP500_VALUES.map(v => v / 1000),     borderColor: '#94a3b8', backgroundColor: 'transparent',          tension: 0.4, pointRadius: 2, borderDash: [4, 4] },
    ],
  };

  const rows = INITIAL_HOLDINGS.map(h => {
    const s = getStock(h.ticker)!;
    const mv = s.price * h.shares;
    const pl = (s.price - h.avgCost) * h.shares;
    const plPct = ((s.price - h.avgCost) / h.avgCost) * 100;
    return { ticker: h.ticker, name: s.name, shares: h.shares, avgCost: h.avgCost, price: s.price, mv, pl, plPct };
  });

  function handleSort(col: number) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortCol === null) return 0;
    const keys = ['ticker', 'name', 'shares', 'avgCost', 'price', 'mv', 'pl', 'plPct'] as const;
    const k = keys[sortCol];
    const av = a[k] as string | number, bv = b[k] as string | number;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const tech = INITIAL_HOLDINGS.filter(h => getStock(h.ticker)?.sector === 'Technology');
  const fin  = INITIAL_HOLDINGS.filter(h => ['Financials','Health Care'].includes(getStock(h.ticker)?.sector ?? ''));

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">My Portfolio</h1>
        <p className="text-slate-400 text-sm mt-1">8 positions · $109,380 invested · $18,420 cash</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Total Return',    value: '+$27,800', change: '▲ +27.8% all-time' },
          { label: 'Unrealized P&L', value: '+$24,350', change: '▲ +28.6% on cost'  },
          { label: 'Realized P&L',   value: '+$3,450',  change: '▲ Locked in gains' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{c.label}</p>
            <p className="text-2xl font-extrabold text-emerald-500">{c.value}</p>
            <p className="text-sm font-semibold text-emerald-500 mt-1">{c.change}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1fr_240px] gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-bold text-slate-800">Portfolio vs S&amp;P 500</h2>
            <span className="text-sm text-emerald-500 font-semibold">+27.5% vs +13.3%</span>
          </div>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 10 } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => v + 'k' } } } }} />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">Sector Allocation</h2>
          <Doughnut
            data={sectorChartData}
            options={{ cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.label + ': ' + fmt(c.raw) } } } }}
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
        </div>
      </div>

      {/* Holdings cards */}
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Technology</p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {tech.map(h => <HoldingCard key={h.ticker} {...h} />)}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Financials &amp; Health Care</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {fin.map(h => <HoldingCard key={h.ticker} {...h} />)}
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">All Holdings</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <Th col={0}>Ticker</Th>
              <Th col={1}>Company</Th>
              <Th col={2}>Shares</Th>
              <Th col={3}>Avg Cost</Th>
              <Th col={4}>Current</Th>
              <Th col={5}>Mkt Value</Th>
              <Th col={6}>P&L</Th>
              <Th col={7}>% Chg</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.ticker} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-800">{r.ticker}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.name}</td>
                <td className="px-4 py-3 text-sm">{r.shares}</td>
                <td className="px-4 py-3 text-sm">{fmt(r.avgCost)}</td>
                <td className="px-4 py-3 text-sm font-semibold">{fmt(r.price)}</td>
                <td className="px-4 py-3 text-sm font-bold">{fmt(r.mv)}</td>
                <td className={`px-4 py-3 text-sm font-semibold ${r.pl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {r.pl >= 0 ? '+' : ''}{fmt(r.pl)}
                </td>
                <td className={`px-4 py-3 text-sm font-semibold ${r.plPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtPct(r.plPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
