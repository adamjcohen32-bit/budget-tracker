import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { useApp } from '../../context/AppContext.jsx';
import { transactionsApi } from '../../services/api.js';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function QuickAddExpense() {
  const { categories, loadAll } = useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const amountRef = useRef(null);

  // Only let people file expenses against real spending categories
  const spendCats = categories.filter((c) => c.type !== 'savings');

  async function submit(e) {
    e.preventDefault();
    if (!amount || !date) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        amount: parseFloat(amount),
        category_id: categoryId || null,
        merchant_name: note || null,
        date,
      });
      const catName = categories.find((c) => c.id === categoryId)?.name;
      setJustAdded(`Added $${parseFloat(amount).toFixed(2)}${catName ? ' to ' + catName : ''}`);
      // Reset for the next entry, keep the form open for rapid logging
      setAmount('');
      setNote('');
      setDate(todayISO());
      await loadAll();
      amountRef.current?.focus();
      setTimeout(() => setJustAdded(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => amountRef.current?.focus(), 50);
        }}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/30"
      >
        + Add expense
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 w-full">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-gray-400">
          Amount
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-28 bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-white text-lg font-medium"
            />
          </div>
        </label>

        <label className="flex flex-col text-xs text-gray-400 flex-1 min-w-[140px]">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white"
          >
            <option value="">Uncategorized</option>
            {spendCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs text-gray-400 flex-1 min-w-[120px]">
          What for (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. lunch with Sam"
            className="mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white"
          />
        </label>

        <button
          type="submit"
          disabled={saving || !amount}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setJustAdded(null); }}
          className="px-3 py-2.5 text-sm text-gray-500 hover:text-white transition-colors"
        >
          Done
        </button>
      </form>

      <div className="h-5 mt-2">
        <span className={clsx(
          'text-xs text-emerald-400 transition-opacity',
          justAdded ? 'opacity-100' : 'opacity-0'
        )}>
          ✓ {justAdded} — log another or hit Done
        </span>
      </div>
    </div>
  );
}
