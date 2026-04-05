'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Question {
  id: number;
  text: string;
  type: string;
  options: string[];
  values: (string | number)[];
}

interface ProfileResult {
  risk_score: number;
  strategy: string;
  style: string;
  risk_label: string;
  description: string;
}

interface Analytics {
  sharpe_ratio: number | null;
  annualized_return: number | null;
  volatility: number | null;
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ questions: Question[] }>('/questionnaire/questions')
      .then(d => setQuestions(d.questions))
      .catch(() => setError('Failed to load questions.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(type: string, value: string | number) {
    setAnswers(prev => ({ ...prev, [type]: value }));
  }

  function handleNext() {
    if (step < questions.length - 1) setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        risk_tolerance:       answers['risk_tolerance'],
        experience_years:     answers['experience_years'],
        time_horizon:         answers['time_horizon'],
        portfolio_preference: answers['portfolio_preference'],
        loss_tolerance:       answers['loss_tolerance'],
      };
      const [res, analyticsRes] = await Promise.all([
        apiFetch<ProfileResult>('/questionnaire/submit', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
        apiFetch<Analytics>('/portfolio/analytics').catch(() => null),
      ]);
      setResult(res);
      setAnalytics(analyticsRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Loading questionnaire…</p>
      </div>
    );
  }

  if (result) {
    const scoreColor =
      result.risk_score < 30 ? 'text-emerald-500' :
      result.risk_score < 55 ? 'text-yellow-500' :
      result.risk_score < 75 ? 'text-orange-500' :
      'text-red-500';

    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Your Investor Profile</h2>
          <p className="text-slate-400 text-sm mb-6">Here's what your answers tell us about you.</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Risk Score</p>
              <p className={`text-2xl font-extrabold ${scoreColor}`}>{result.risk_score}</p>
              <p className="text-xs text-slate-400 mt-0.5">out of 100</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Strategy</p>
              <p className="text-lg font-extrabold text-slate-800">{result.strategy}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Style</p>
              <p className="text-lg font-extrabold text-slate-800">{result.style}</p>
            </div>
          </div>

          {analytics && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Sharpe Ratio</p>
                <p className={`text-2xl font-extrabold ${analytics.sharpe_ratio !== null && analytics.sharpe_ratio >= 1 ? 'text-emerald-500' : analytics.sharpe_ratio !== null && analytics.sharpe_ratio >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {analytics.sharpe_ratio !== null ? analytics.sharpe_ratio.toFixed(2) : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">risk-adjusted return</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Ann. Return</p>
                <p className={`text-2xl font-extrabold ${analytics.annualized_return !== null && analytics.annualized_return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {analytics.annualized_return !== null ? `${analytics.annualized_return > 0 ? '+' : ''}${analytics.annualized_return.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">annualized</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Volatility</p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {analytics.volatility !== null ? `${analytics.volatility.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">annualized</p>
              </div>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">{result.risk_label} Investor</p>
            <p className="text-slate-700 text-sm leading-relaxed">{result.description}</p>
          </div>

          <button
            onClick={() => router.replace('/dashboard')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold text-sm transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  const current = questions[step];
  const answered = current ? answers[current.type] !== undefined : false;
  const isLast = step === questions.length - 1;
  const progress = ((step) / questions.length) * 100;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Investor Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Answer 5 quick questions so we can tailor your experience.</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
        <div
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {current && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Question {step + 1} of {questions.length}
          </p>
          <h2 className="text-lg font-bold text-slate-800 mb-6">{current.text}</h2>

          <div className="flex flex-col gap-3">
            {current.options.map((option, i) => {
              const val = current.values[i];
              const selected = answers[current.type] === val;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(current.type, val)}
                  className={`text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Back
            </button>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={!answered || submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!answered}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
