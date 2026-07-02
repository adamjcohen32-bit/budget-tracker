import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import CategoryRow from '../components/ui/CategoryRow.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import QuickAddExpense from '../components/ui/QuickAddExpense.jsx';
import SpendingBreakdown from '../components/ui/SpendingBreakdown.jsx';
import DashboardSkeleton from '../components/ui/DashboardSkeleton.jsx';
import useCountUp from '../hooks/useCountUp.js';
import { monthNameET } from '../utils/date.js';
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
    summary,
    settings,
  } = useApp();

  const spentThis = summary?.spent_this_month || 0;
  const leftThis = summary?.left_this_month || 0;
  const takeHome = summary?.take_home || 0;

  // Hooks must run before any early return
  const spentAnim = useCountUp(spentThis);
  const leftAnim = useCountUp(leftThis);

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

  const monthName = monthNameET();

  // Compare actual spending to your budget (what you should ideally spend).
  // Budget = all spending categories (everything except savings goals).
  const monthlyBudget = categories
    .filter((c) => c.type !== 'savings')
    .reduce((s, c) => s + (c.budget_amount || 0), 0);
  const budgetLeft = monthlyBudget - spentThis;
  const spentPctOfBudget = monthlyBudget > 0 ? (spentThis / monthlyBudget) * 100 : 0;
  const overBudget = spentThis > monthlyBudget;

  return (
    <div className="space-y-8">
      {/* Hero: Spent (vs budget) + Left to invest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spent this month, measured against your budget */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-900/40 border border-indigo-800/70 p-7">
          <p className="text-sm text-indigo-300 font-medium mb-2">Spent in {monthName}</p>
          <p className="text-6xl font-bold tracking-tight tabular-nums leading-none text-white">
            {fmtFull(spentAnim)}
          </p>
          {monthlyBudget > 0 ? (
            <>
              <ProgressBar pct={spentPctOfBudget} className="mt-4" />
              <p className="text-xs mt-3 tabular-nums">
                <span className="text-indigo-300/80">{fmtFull(spentThis)} of {fmtFull(monthlyBudget)} budgeted</span>
                {' · '}
                {overBudget ? (
                  <span className="text-red-400">over by {fmtFull(spentThis - monthlyBudget)}</span>
                ) : (
                  <span className="text-emerald-300">{fmtFull(budgetLeft)} left to spend</span>
                )}
              </p>
            </>
          ) : (
            <p className="text-xs text-indigo-400/70 mt-3">
              Set budgets in Budget Settings to track against a target
            </p>
          )}
        </div>

        {/* Left to invest */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-7 flex flex-col justify-center">
          <p className="text-sm text-gray-400 font-medium mb-2">Left to invest</p>
          <p className={clsx(
            'text-4xl font-bold tracking-tight tabular-nums',
            leftThis < 0 ? 'text-red-400' : 'text-emerald-400'
          )}>
            {leftThis < 0 ? '-' : ''}{fmtFull(Math.abs(leftAnim))}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            {fmtFull(spentThis)} spent of {fmtFull(takeHome)} take-home · rest is yours to invest
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
