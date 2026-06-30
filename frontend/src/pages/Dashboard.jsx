import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import CategoryRow from '../components/ui/CategoryRow.jsx';
import QuickAddExpense from '../components/ui/QuickAddExpense.jsx';
import SpendingBreakdown from '../components/ui/SpendingBreakdown.jsx';
import DashboardSkeleton from '../components/ui/DashboardSkeleton.jsx';
import useCountUp from '../hooks/useCountUp.js';
import clsx from 'clsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtFull(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function Dashboard() {
  const {
    categories,
    loading,
    error,
    syncing,
    syncTransactions,
    dailySpend,
    discretionaryRemaining,
    monthlySurplus,
    settings,
  } = useApp();

  // Hooks must run before any early return
  const dailyAnim = useCountUp(dailySpend);
  const surplusAnim = useCountUp(monthlySurplus);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl bg-red-950/40 border border-red-800 p-6 text-red-300">
        {error}
      </div>
    );
  }

  const fixedCats = categories.filter((c) => c.type === 'fixed');
  const semiFixedCats = categories.filter((c) => c.type === 'semi_fixed');
  const discretionaryCats = categories.filter((c) => c.type === 'discretionary');
  const savingsCats = categories.filter((c) => c.type === 'savings');

  const totalSpent = categories.reduce((s, c) => s + (c.spent || 0), 0);
  const hasSpending = totalSpent > 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-8">
      {/* Hero: Daily spend + surplus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-900/40 border border-indigo-800/70 p-7">
          <p className="text-sm text-indigo-300 font-medium mb-2">You can spend today</p>
          <p className={clsx(
            'text-6xl font-bold tracking-tight tabular-nums leading-none',
            dailySpend < 0 ? 'text-red-400' : 'text-white'
          )}>
            {dailyAnim < 0 ? '-' : ''}{fmt(Math.abs(dailyAnim))}
          </p>
          {/* Self-explaining math so the number isn't a mystery */}
          {discretionaryRemaining >= 0 ? (
            <p className="text-xs text-indigo-300/80 mt-3 tabular-nums">
              {fmtFull(discretionaryRemaining)} left ÷ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in {monthName}
            </p>
          ) : (
            <p className="text-xs text-red-300/90 mt-3">
              You're {fmtFull(Math.abs(discretionaryRemaining))} over your discretionary budget this month
            </p>
          )}
          <p className="text-[11px] text-indigo-400/60 mt-1.5">
            Spend less today → tomorrow's number rises. Overspend → it drops.
          </p>
        </div>

        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-7 flex flex-col justify-center">
          <p className="text-sm text-gray-400 font-medium mb-2">Monthly savings forecast</p>
          <p className={clsx(
            'text-3xl font-bold tracking-tight tabular-nums',
            monthlySurplus < 0 ? 'text-red-400' : 'text-emerald-400'
          )}>
            {monthlySurplus < 0 ? 'Over by ' : 'On track to save '}
            {fmtFull(Math.abs(surplusAnim))}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Take-home {fmtFull(settings?.monthly_take_home || 0)} · projected spend deducted
          </p>
        </div>
      </div>

      {/* Quick add expense + (optional) sync */}
      <div className="flex items-start justify-between gap-4">
        <QuickAddExpense />
        {settings?.plaid_item_id && (
          <button
            onClick={syncTransactions}
            disabled={syncing}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {syncing ? 'Syncing…' : '↻ Sync transactions'}
          </button>
        )}
      </div>

      {/* Spending breakdown, or a calm empty state on a clean slate */}
      {hasSpending ? (
        <SpendingBreakdown categories={categories} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-800 p-10 text-center">
          <div className="text-3xl mb-3">🧾</div>
          <p className="text-gray-300 font-medium">No expenses logged yet this month</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Tap <span className="text-indigo-400 font-medium">+ Add expense</span> above each time you spend.
            In a week or two you'll see exactly where your money goes.
          </p>
        </div>
      )}

      {/* Category sections */}
      {[
        { label: 'Discretionary', cats: discretionaryCats, hint: 'Day-to-day spending you control' },
        { label: 'Semi-Fixed', cats: semiFixedCats, hint: 'Roughly predictable each month' },
        { label: 'Fixed', cats: fixedCats, hint: 'Set-and-forget bills' },
        { label: 'Savings Goals', cats: savingsCats, hint: 'Money set aside' },
      ]
        .filter(({ cats }) => cats.length > 0)
        .map(({ label, cats, hint }) => (
          <section key={label}>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {label}
              </h2>
              <span className="text-xs text-gray-600">{hint}</span>
            </div>
            <div className="space-y-3">
              {cats.map((cat) => (
                <CategoryRow key={cat.id} category={cat} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
