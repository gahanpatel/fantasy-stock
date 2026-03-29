'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LEADERBOARD } from '@/lib/data';
import { fmtPct } from '@/lib/data';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type SortKey = 'ret' | 'sharpe' | 'vol';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>('ret');

  const sorted = [...LEADERBOARD].sort((a, b) =>
    sortKey === 'vol' ? a.vol - b.vol : b[sortKey] - a[sortKey]
  );

  const barData = {
    labels: LEADERBOARD.map(p => p.name),
    datasets: [{
      label: 'Return %',
      data: LEADERBOARD.map(p => p.ret),
      backgroundColor: LEADERBOARD.map(p => p.name === user?.name ? '#6366f1' : '#e2e8f0'),
      borderRadius: 6,
    }],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => fmtPct(c.raw) } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, callback: (v: any) => v + '%' } },
    },
  };

  const WALL_OF_FAME = [
    { week: 'Week 4', winner: 'Gahan'  },
    { week: 'Week 3', winner: 'Zach'   },
    { week: 'Week 2', winner: 'Shloka' },
    { week: 'Week 1', winner: 'Pablo'  },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Leaderboard</h1>
        <p className="text-slate-400 text-sm mt-1">Season standings · Updated at market close</p>
      </div>

      {/* Weekly Challenge */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white mb-5">
        <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Active Challenge · Week 5</p>
        <h3 className="text-lg font-extrabold mb-1">Build a portfolio with beta under 0.8</h3>
        <p className="text-sm opacity-85">Defensive plays earn 1.5× points. Current challenge leader: <strong>Shreya</strong> (beta: 0.71)</p>
        <p className="text-xs opacity-70 mt-2.5">Ends Friday, April 4 · 4:00 PM ET</p>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Rankings Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Season Rankings</h2>
            <div className="flex gap-2">
              {(['ret', 'sharpe', 'vol'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${sortKey === k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}
                >
                  {k === 'ret' ? 'Return' : k === 'sharpe' ? 'Sharpe' : 'Volatility'}
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 gap-3">
            <span className="w-7">#</span>
            <span className="flex-1">Player</span>
            <span className="w-24 text-right">Return</span>
            <span className="w-24 text-right">Sharpe</span>
            <span className="w-24 text-right">Volatility</span>
          </div>

          {sorted.map((p, i) => {
            const isMe = p.name === user?.name;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            const deltaEl = p.delta > 0
              ? <span className="text-emerald-500">▲{p.delta}</span>
              : p.delta < 0
              ? <span className="text-red-500">▼{Math.abs(p.delta)}</span>
              : <span className="text-slate-300">—</span>;
            return (
              <div key={p.name} className={`flex items-center px-5 py-3.5 border-t border-slate-100 gap-3 ${isMe ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                <span className="w-7 text-center font-extrabold text-sm">{medal ?? <span className="text-slate-400">{i + 1}</span>}</span>
                <div className="flex-1">
                  <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                  {isMe && <span className="ml-1.5 text-xs text-indigo-500">(you)</span>}
                  <span className="ml-2 text-xs">{deltaEl}</span>
                </div>
                <div className="w-24 text-right">
                  <p className={`text-sm font-bold ${p.ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtPct(p.ret)}</p>
                  <p className="text-xs text-slate-400">Return</p>
                </div>
                <div className="w-24 text-right">
                  <p className="text-sm font-bold text-slate-700">{p.sharpe.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">Sharpe</p>
                </div>
                <div className="w-24 text-right">
                  <p className={`text-sm font-bold ${p.vol < 15 ? 'text-emerald-500' : 'text-red-500'}`}>{p.vol.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400">Volatility</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Wall of Fame */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-5 text-white">
            <h2 className="font-extrabold text-base mb-4">🌟 Wall of Fame</h2>
            {WALL_OF_FAME.map(w => (
              <div key={w.week} className="flex justify-between py-2 border-b border-white/20 text-sm last:border-0">
                <span className="opacity-85">{w.week} Winner</span>
                <strong>{w.winner}</strong>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-4">Return Distribution</h2>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
