import React, { useState } from 'react';
import clsx from 'clsx';
import ProgressBar from './ProgressBar.jsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function CategoryRow({ category, charges = [] }) {
  const { name, budget_amount, spent, remaining, pct, projected_monthly, type, color } = category;
  const isOver = pct >= 100;
  const [open, setOpen] = useState(false);

  const sortedCharges = [...charges].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div
      className={clsx(
        'rounded-xl p-4 border transition-colors',
        isOver ? 'bg-red-950/30 border-red-800' : 'bg-gray-900 border-gray-800'
      )}
    >
      <button onClick={() => setOpen(!open)} className="w-full text-left group">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-600 group-hover:text-gray-400 transition-colors w-3 inline-block flex-shrink-0 text-xs">
              {open ? '▾' : '▸'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="font-medium text-sm text-white truncate">{name}</span>
            <span
              className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded capitalize flex-shrink-0 hidden sm:inline',
                type === 'fixed' && 'bg-gray-800 text-gray-400',
                type === 'semi_fixed' && 'bg-orange-900/50 text-orange-300',
                type === 'discretionary' && 'bg-indigo-900/50 text-indigo-300',
                type === 'savings' && 'bg-blue-900/50 text-blue-300'
              )}
            >
              {type.replace('_', ' ')}
            </span>
          </div>
          {/* The headline number: what's left */}
          <span
            className={clsx(
              'font-semibold text-sm whitespace-nowrap tabular-nums flex-shrink-0',
              isOver ? 'text-red-400' : 'text-emerald-400'
            )}
          >
            {isOver ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
            <span className="text-gray-500 font-normal"> left</span>
          </span>
        </div>

        <ProgressBar pct={pct} />

        <div className="flex justify-between mt-1.5 text-xs text-gray-500 gap-2">
          <span className="truncate">
            {fmt(spent)} of {fmt(budget_amount)} · {Math.round(pct)}%
          </span>
          {projected_monthly != null && projected_monthly > 0 && (
            <span className="whitespace-nowrap">
              Proj.{' '}
              <span className={projected_monthly > budget_amount ? 'text-red-400' : 'text-gray-400'}>
                {fmt(projected_monthly)}
              </span>
            </span>
          )}
        </div>
      </button>

      {/* Drill-down: individual charges this month */}
      {open && (
        <div className="mt-3 ml-5 border-l border-gray-800 pl-3 space-y-1.5">
          {sortedCharges.length === 0 ? (
            <p className="text-xs text-gray-600">No charges yet this month</p>
          ) : (
            sortedCharges.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-gray-400 truncate">
                  <span className="text-gray-600 mr-2 tabular-nums">{t.date.slice(5)}</span>
                  {t.merchant_name || t.description || '—'}
                </span>
                <span className="text-gray-300 tabular-nums whitespace-nowrap">{fmt(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
