import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import CategoryRow from '../components/ui/CategoryRow.jsx';
import QuickAddExpense from '../components/ui/QuickAddExpense.jsx';
import SpendingBreakdown from '../components/ui/SpendingBreakdown.jsx';
import DashboardSkeleton from '../components/ui/DashboardSkeleton.jsx';
import useCountUp from '../hooks/useCountUp.js';
import { monthNameET, daysInMonthET, etParts } from '../utils/date.js';
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
    transactions,
    loading,
    error,
    syncing,
    syncTransactions,
    summary,
    settings,
  } = useApp();

  const spentThis = summary?.spent_this_month || 0;
  const takeHome = summary?.take_home || 0;

  // "Left to invest" reserves your fixed bills (Tesla, Claude) up front, even
  // if they haven't been paid/logged yet — that money is already committed.
  const fixedBudget = categories
    .filter((c) => c.type === 'fixed')
    .reduce((s, c) => s + (c.budget_amount || 0), 0);
  const fixedSpent = categories
    .filter((c) => c.type === 'fixed')
    .reduce((s, c) => s + (c.spent || 0), 0);
  const reservedFixed = Math.max(0, fixedBudget - fixedSpent); // fixed not yet paid
  const leftThis = takeHome - spentThis - reservedFixed;

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

  // Projected month-end spend at the current pace (no budget calibration needed).
  const dayOfMonth = etParts().day;
  const daysInMonth = daysInMonthET();
  const dailyAvg = dayOfMonth > 0 ? spentThis / dayOfMonth : 0;
  const projectedSpend = dailyAvg * daysInMonth;
  const daysLeft = daysInMonth - dayOfMonth;
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Hero: Spent (on-pace projection) + Left to invest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spent this month, with projected month-end pace */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-900/40 border border-indigo-800/70 p-7">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-indigo-300 font-medium">Spent in {monthName}</p>
            <p className="text-xs text-indigo-400/70 tabular-nums">
              {todayLabel} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </p>
          </div>
          <p className="text-6xl font-bold tracking-tight tabular-nums leading-none text-white">
            {fmtFull(spentAnim)}
          </p>
          {spentThis > 0 ? (
            <p className="text-xs mt-3 tabular-nums text-indigo-300/80">
              On pace for <span className="text-white font-medium">~{fmt(projectedSpend)}</span> this month
              <span className="text-indigo-400/60"> · {fmt(dailyAvg)}/day</span>
            </p>
          ) : (
            <p className="text-xs mt-3 text-indigo-400/70">No spending logged yet this month</p>
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
            {fmtFull(takeHome)} take-home − {fmtFull(spentThis)} spent
            {reservedFixed > 0 && <> − {fmtFull(reservedFixed)} fixed bills</>}
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
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  charges={transactions.filter((t) => t.category_id === cat.id && !t.excluded)}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
