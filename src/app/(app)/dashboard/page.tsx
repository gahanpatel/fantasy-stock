'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { INITIAL_HOLDINGS, LEADERBOARD, CHART_LABELS, PORTFOLIO_VALUES, SP500_VALUES, getStock, fmt, fmtPct } from '@/lib/data';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function StatCard({ label, value, change, sub, changeColor }: {
  label: string; value: string; change: string; sub?: string; changeColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800 leading-tight">{value}</p>
      <p className={`text-sm font-semibold mt-1.5 ${changeColor ?? 'text-slate-400'}`}>{change}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const chartData = {
    labels: CHART_LABELS,
    datasets: [
      {
        label: 'My Portfolio',
        data: PORTFOLIO_VALUES,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
      },
      {
        label: 'S&P 500',
        data: SP500_VALUES,
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 2,
        borderDash: [4, 4],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 12 }, boxWidth: 12 } },
      tooltip: { mode: 'index' as const, intersect: false, callbacks: { label: (c: any) => ' ' + fmt(c.raw) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => '$' + (v / 1000).toFixed(0) + 'k' } },
    },
    interaction: { mode: 'index' as const, intersect: false },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.name ?? '…'}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard label="Portfolio Value"  value="$127,800" change="▲ +27.8% all-time"    sub="Started with $100,000"    changeColor="text-emerald-500" />
        <StatCard label="Today's Gain"     value="+$1,250"  change="▲ +0.98% today"       sub="As of market close"       changeColor="text-emerald-500" />
        <StatCard label="Cash Balance"     value="$18,420"  change="Available to invest"   sub="14.4% of portfolio" />
        <StatCard label="Sharpe Ratio"     value="1.42"     change="▲ Strong risk-adj."    sub="Rank #3 overall"          changeColor="text-emerald-500" />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Portfolio Performance</h2>
            <p className="text-sm text-emerald-500 font-semibold mt-0.5">+27.5% all-time · outperforming S&amp;P 500 by 14.2%</p>
          </div>
        </div>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Top Holdings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Top Holdings</h2>
            <Link href="/portfolio" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View all →</Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Stock</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Shares</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {INITIAL_HOLDINGS.slice(0, 5).map(h => {
                const s = getStock(h.ticker)!;
                const val = s.price * h.shares;
                const pl = (s.price - h.avgCost) * h.shares;
                const plPct = ((s.price - h.avgCost) / h.avgCost) * 100;
                return (
                  <tr key={h.ticker} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{h.ticker}</p>
                      <p className="text-xs text-slate-400">{s.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{h.shares}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{fmt(val)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${pl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {pl >= 0 ? '▲' : '▼'} {fmt(Math.abs(pl))}
                      <span className="text-xs ml-1">({fmtPct(plPct)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mini Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">🏆 Leaderboard</h2>
            <Link href="/leaderboard" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Full →</Link>
          </div>
          {LEADERBOARD.slice(0, 7).map((p, i) => {
            const isMe = p.name === user?.name;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={p.name} className={`flex items-center gap-3 px-5 py-3 border-t border-slate-100 ${isMe ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                <span className="w-6 text-center font-extrabold text-sm">{medal ?? <span className="text-slate-400">{i + 1}</span>}</span>
                <span className="flex-1 text-sm font-semibold text-slate-700">
                  {p.name}{isMe && <span className="ml-1 text-xs text-indigo-500">(you)</span>}
                </span>
                <span className={`text-sm font-bold ${p.ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtPct(p.ret)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
