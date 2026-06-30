import React from 'react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// Horizontal "where your money's going" breakdown — share of total spend,
// sorted largest first, à la Copilot Money.
export default function SpendingBreakdown({ categories }) {
  const spending = categories
    .filter((c) => c.type !== 'savings' && c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const total = spending.reduce((s, c) => s + c.spent, 0);
  if (total <= 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Where your money's going
        </h2>
        <span className="text-sm text-gray-400">{fmt(total)} this month</span>
      </div>

      {/* Single stacked bar — the whole month at a glance */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-800 mb-5">
        {spending.map((c) => (
          <div
            key={c.id}
            className="h-full transition-all duration-700"
            style={{ width: `${(c.spent / total) * 100}%`, backgroundColor: c.color }}
            title={`${c.name}: ${fmt(c.spent)}`}
          />
        ))}
      </div>

      {/* Per-category rows */}
      <div className="space-y-3">
        {spending.map((c) => {
          const pctOfTotal = (c.spent / total) * 100;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm text-gray-200 w-36 flex-shrink-0 truncate">{c.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pctOfTotal}%`, backgroundColor: c.color }}
                />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
                {Math.round(pctOfTotal)}%
              </span>
              <span className="text-sm text-white w-20 text-right font-medium tabular-nums">
                {fmt(c.spent)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
