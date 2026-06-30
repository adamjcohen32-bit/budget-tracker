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
        isOver
          ? 'bg-red-950/30 border-red-800'
          : 'bg-gray-900 border-gray-800'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-sm text-white">{name}</span>
          <span
            className={clsx(
              'text-xs px-1.5 py-0.5 rounded capitalize',
              type === 'fixed' && 'bg-gray-800 text-gray-400',
              type === 'semi_fixed' && 'bg-orange-900/50 text-orange-300',
              type === 'discretionary' && 'bg-indigo-900/50 text-indigo-300',
              type === 'savings' && 'bg-blue-900/50 text-blue-300'
            )}
          >
            {type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">{fmt(budget_amount)}</span>
          <span className="text-white font-medium w-20 text-right">{fmt(spent)}</span>
          <span
            className={clsx(
              'font-medium w-20 text-right',
              isOver ? 'text-red-400' : 'text-emerald-400'
            )}
          >
            {isOver ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
          </span>
        </div>
      </div>

      <ProgressBar pct={pct} />

      <div className="flex justify-between mt-1.5 text-xs text-gray-500">
        <span>{Math.round(pct)}% used</span>
        {projected_monthly != null && (
          <span>
            Projected:{' '}
            <span
              className={
                projected_monthly > budget_amount ? 'text-red-400' : 'text-gray-400'
              }
            >
              {fmt(projected_monthly)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
