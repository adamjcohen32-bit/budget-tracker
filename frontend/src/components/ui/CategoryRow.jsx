import React from 'react';
import clsx from 'clsx';
import ProgressBar from './ProgressBar.jsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function CategoryRow({ category }) {
  const { name, budget_amount, spent, remaining, pct, projected_monthly, type, color } = category;
  const isOver = pct >= 100;

  return (
    <div
      className={clsx(
        'rounded-xl p-4 border transition-colors',
        isOver ? 'bg-red-950/30 border-red-800' : 'bg-gray-900 border-gray-800'
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
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
    </div>
  );
}
