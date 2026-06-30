import React from 'react';
import clsx from 'clsx';

export default function ProgressBar({ pct, className }) {
  const capped = Math.min(pct, 100);
  const color =
    pct >= 100
      ? 'bg-red-500'
      : pct >= 75
      ? 'bg-yellow-400'
      : 'bg-emerald-400';

  return (
    <div className={clsx('h-2 rounded-full bg-gray-800 overflow-hidden', className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${capped}%` }}
      />
    </div>
  );
}
