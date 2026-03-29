'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { fmt, fmtPct } from '@/lib/data';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const STARTING_CASH = 100000;

interface PortfolioValue { cash: number; holdings_value: number; total_value: number }
interface Holding { ticker: string; quantity: number; average_cost: number; current_price: number; market_value: number; pnl: number; pnl_percent: number }
interface LeaderboardEntry { user_id: string; display_name: string; total_value: number; rank: number }
interface HistoryEntry { snapshot_date: string; total_value: number }

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
  const [pv, setPv] = useState<PortfolioValue | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<PortfolioValue>('/portfolio/value'),
      apiFetch<{ holdings: Holding[] }>('/portfolio/holdings'),
      apiFetch<{ leaderboard: LeaderboardEntry[] }>('/leaderboard'),
      apiFetch<{ history: HistoryEntry[] }>('/portfolio/history'),
    ]).then(([v, h, lb, hist]) => {
      setPv(v);
      setHoldings(h.holdings);
      setLeaderboard(lb.leaderboard);
      setHistory(hist.history);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalReturn = pv ? pv.total_value - STARTING_CASH : 0;
  const totalReturnPct = (totalReturn / STARTING_CASH) * 100;
  const myRank = leaderboard.find(e => e.display_name === user?.name)?.rank ?? '—';

  const chartLabels = history.length > 0
    ? ['Start', ...history.map(h => h.snapshot_date)]
    : ['Start', 'Now'];
  const chartValues = history.length > 0
    ? [STARTING_CASH, ...history.map(h => h.total_value)]
    : [STARTING_CASH, pv?.total_value ?? STARTING_CASH];

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'My Portfolio',
      data: chartValues,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      fill: true,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 12 }, boxWidth: 12 } },
      tooltip: { mode: 'index' as const, intersect: false, callbacks: { label: (c: { raw: unknown }) => ' ' + fmt(c.raw as number) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: unknown) => '$' + ((v as number) / 1000).toFixed(0) + 'k' } },
    },
    interaction: { mode: 'index' as const, intersect: false },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.name ?? '…'}</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Portfolio Value"
              value={pv ? fmt(pv.total_value) : '—'}
              change={`${totalReturn >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(totalReturnPct))} all-time`}
              sub={`Started with ${fmt(STARTING_CASH)}`}
              changeColor={totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}
            />
            <StatCard
              label="Holdings Value"
              value={pv ? fmt(pv.holdings_value) : '—'}
              change={`${holdings.length} position${holdings.length !== 1 ? 's' : ''}`}
              sub="Market value"
            />
            <StatCard
              label="Cash Balance"
              value={pv ? fmt(pv.cash) : '—'}
              change="Available to invest"
              sub={pv ? `${((pv.cash / pv.total_value) * 100).toFixed(1)}% of portfolio` : ''}
            />
            <StatCard
              label="Leaderboard Rank"
              value={`#${myRank}`}
              change={`of ${leaderboard.length} players`}
              sub="By total portfolio value"
            />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Portfolio Performance</h2>
                <p className={`text-sm font-semibold mt-0.5 ${totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {totalReturn >= 0 ? '+' : ''}{fmt(totalReturn)} ({totalReturn >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%) all-time
                </p>
              </div>
            </div>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className="grid grid-cols-[1fr_280px] gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Top Holdings</h2>
                <Link href="/portfolio" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View all →</Link>
              </div>
              {holdings.length === 0 ? (
                <p className="px-5 py-8 text-slate-400 text-sm text-center">No holdings yet. <Link href="/trade" className="text-indigo-600">Make your first trade →</Link></p>
              ) : (
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
                    {holdings.slice(0, 5).map(h => (
                      <tr key={h.ticker} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-800">{h.ticker}</td>
                        <td className="px-4 py-3 text-sm">{h.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{fmt(h.market_value)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${h.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {h.pnl >= 0 ? '▲' : '▼'} {fmt(Math.abs(h.pnl))}
                          <span className="text-xs ml-1">({fmtPct(h.pnl_percent)})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">🏆 Leaderboard</h2>
                <Link href="/leaderboard" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Full →</Link>
              </div>
              {leaderboard.slice(0, 7).map((p, i) => {
                const isMe = p.display_name === user?.name;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const ret = ((p.total_value - STARTING_CASH) / STARTING_CASH) * 100;
                return (
                  <div key={p.user_id} className={`flex items-center gap-3 px-5 py-3 border-t border-slate-100 ${isMe ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <span className={`w-6 text-center font-extrabold text-sm ${i < 3 ? '' : 'text-slate-400'}`}>
                      {medal ?? i + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700">
                      {p.display_name}{isMe && <span className="ml-1 text-xs text-indigo-500">(you)</span>}
                    </span>
                    <span className={`text-sm font-bold ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
