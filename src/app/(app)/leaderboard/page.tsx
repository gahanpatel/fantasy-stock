'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { fmt } from '@/lib/data';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const STARTING_CASH = 100000;

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  cash_balance: number;
  holdings_value: number;
  total_value: number;
  rank: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ leaderboard: LeaderboardEntry[] }>('/leaderboard')
      .then(d => setLeaderboard(d.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const barData = {
    labels: leaderboard.map(p => p.display_name),
    datasets: [{
      label: 'Return %',
      data: leaderboard.map(p => ((p.total_value - STARTING_CASH) / STARTING_CASH) * 100),
      backgroundColor: leaderboard.map(p => p.display_name === user?.name ? '#6366f1' : '#e2e8f0'),
      borderRadius: 6,
    }],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: { raw: unknown }) => (c.raw as number).toFixed(2) + '%' } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, callback: (v: unknown) => (v as number) + '%' } },
    },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Leaderboard</h1>
        <p className="text-slate-400 text-sm mt-1">Season standings · Live portfolio values</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-[1fr_280px] gap-5">
          {/* Rankings Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Season Rankings</h2>
            </div>

            <div className="flex items-center px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 gap-3">
              <span className="w-7">#</span>
              <span className="flex-1">Player</span>
              <span className="w-28 text-right">Portfolio Value</span>
              <span className="w-24 text-right">Return</span>
            </div>

            {leaderboard.map((p, i) => {
              const isMe = p.display_name === user?.name;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const ret = ((p.total_value - STARTING_CASH) / STARTING_CASH) * 100;
              return (
                <div key={p.user_id} className={`flex items-center px-5 py-3.5 border-t border-slate-100 gap-3 ${isMe ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <span className="w-7 text-center font-extrabold text-sm">{medal ?? <span className="text-slate-400">{i + 1}</span>}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-slate-800">{p.display_name}</span>
                    {isMe && <span className="ml-1.5 text-xs text-indigo-500">(you)</span>}
                  </div>
                  <div className="w-28 text-right">
                    <p className="text-sm font-bold text-slate-700">{fmt(p.total_value)}</p>
                    <p className="text-xs text-slate-400">Total value</p>
                  </div>
                  <div className="w-24 text-right">
                    <p className={`text-sm font-bold ${ret >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</p>
                    <p className="text-xs text-slate-400">Return</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Bar chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-4">Return Distribution</h2>
              {leaderboard.length > 0 && <Bar data={barData} options={barOptions} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
