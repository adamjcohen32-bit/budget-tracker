import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { transactionsApi } from '../services/api.js';
import { todayET, monthRangeET } from '../utils/date.js';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import clsx from 'clsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function Transactions() {
  const { categories, loadAll } = useApp();

  // Which month we're viewing (0 = this month, -1 = last, ...)
  const [monthOffset, setMonthOffset] = useState(0);
  const range = monthRangeET(monthOffset);

  const [monthTxns, setMonthTxns] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [addForm, setAddForm] = useState({ amount: '', merchant_name: '', date: todayET(), category_id: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedCat, setExpandedCat] = useState(null);

  const fetchMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const data = await transactionsApi.list({ start: range.start, end: range.end });
      setMonthTxns(data);
    } finally {
      setLoadingMonth(false);
    }
  }, [range.start, range.end]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // After any change, refresh this month's list AND the dashboard totals
  async function refresh() {
    await Promise.all([fetchMonth(), loadAll()]);
  }

  async function handleRecategorize(id, category_id) {
    await transactionsApi.recategorize(id, category_id || null);
    await refresh();
  }
  async function handleToggleExcluded(id, excluded) {
    await transactionsApi.setExcluded(id, excluded);
    await refresh();
  }
  async function handleDelete(id) {
    await transactionsApi.remove(id);
    await refresh();
  }
  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionsApi.create({
        ...addForm,
        amount: parseFloat(addForm.amount),
        category_id: addForm.category_id || null,
      });
      setAddForm({ amount: '', merchant_name: '', date: todayET(), category_id: '' });
      setShowAdd(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(txn) {
    setEditingId(txn.id);
    setEditForm({
      amount: txn.amount,
      merchant_name: txn.merchant_name || '',
      date: txn.date,
      category_id: txn.category_id || '',
    });
  }
  async function saveEdit(id) {
    await transactionsApi.update(id, {
      amount: parseFloat(editForm.amount),
      merchant_name: editForm.merchant_name || null,
      date: editForm.date,
      category_id: editForm.category_id || null,
    });
    setEditingId(null);
    await refresh();
  }

  const filtered = monthTxns
    .filter((t) =>
      !search || (t.merchant_name || t.description || '').toLowerCase().includes(search.toLowerCase())
    )
    // Most recent first: by date, then by when it was logged
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.created_at || '') < (b.created_at || '') ? 1 : -1;
    });

  // Per-category breakdown for the selected month (for adjusting limits)
  const monthTotal = monthTxns.filter((t) => !t.excluded).reduce((s, t) => s + Number(t.amount), 0);
  const spentByCat = {};
  for (const t of monthTxns) {
    if (t.excluded) continue;
    const key = t.category_id || 'none';
    spentByCat[key] = (spentByCat[key] || 0) + Number(t.amount);
  }
  const breakdown = categories
    .map((c) => ({ ...c, monthSpent: spentByCat[c.id] || 0 }))
    .filter((c) => c.monthSpent > 0)
    .sort((a, b) => b.monthSpent - a.monthSpent);
  const uncategorized = spentByCat['none'] || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
        >
          + Add manual
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl bg-gray-900 border border-gray-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="number" placeholder="Amount" step="0.01" required value={addForm.amount}
            onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-gray-700" />
          <input type="text" placeholder="What for" value={addForm.merchant_name}
            onChange={(e) => setAddForm({ ...addForm, merchant_name: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-gray-700" />
          <input type="date" required value={addForm.date}
            onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700" />
          <select value={addForm.category_id}
            onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700">
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={saving}
            className="col-span-2 sm:col-span-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Add transaction'}
          </button>
        </form>
      )}

      {/* Month navigator */}
      <div className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-4 py-3">
        <button onClick={() => setMonthOffset(monthOffset - 1)}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 text-lg leading-none">‹</button>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">{range.label}</div>
          <div className="text-xs text-gray-500 tabular-nums">{fmt(monthTotal)} spent</div>
        </div>
        <button onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))} disabled={monthOffset >= 0}
          className="px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 text-lg leading-none disabled:opacity-30">›</button>
      </div>

      {/* Per-category breakdown for this month — for understanding & adjusting limits */}
      {(breakdown.length > 0 || uncategorized > 0) && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <button onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center justify-between w-full text-left">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              {range.label.split(' ')[0]} by category
            </span>
            <span className="text-xs text-gray-500">{showBreakdown ? 'Hide' : 'Show'}</span>
          </button>
          {showBreakdown && (
            <div className="space-y-3 mt-4">
              {breakdown.map((c) => {
                const pct = c.budget_amount > 0 ? (c.monthSpent / c.budget_amount) * 100 : 0;
                const over = c.monthSpent > c.budget_amount && c.budget_amount > 0;
                const isOpen = expandedCat === c.id;
                const charges = isOpen
                  ? monthTxns
                      .filter((t) => t.category_id === c.id && !t.excluded)
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                  : [];
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpandedCat(isOpen ? null : c.id)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-gray-200">
                          <span className="text-gray-600 group-hover:text-gray-400 transition-colors w-3 inline-block">
                            {isOpen ? '▾' : '▸'}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="tabular-nums">
                          <span className="text-white font-medium">{fmt(c.monthSpent)}</span>
                          {c.budget_amount > 0 && (
                            <span className={clsx('ml-1 text-xs', over ? 'text-red-400' : 'text-gray-500')}>
                              / {fmt(c.budget_amount)}
                            </span>
                          )}
                        </span>
                      </div>
                      {c.budget_amount > 0 && <ProgressBar pct={pct} />}
                    </button>
                    {isOpen && (
                      <div className="mt-2 ml-6 space-y-1.5 border-l border-gray-800 pl-3">
                        {charges.length === 0 ? (
                          <p className="text-xs text-gray-600">No charges</p>
                        ) : (
                          charges.map((t) => (
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
              })}
              {uncategorized > 0 && (
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-gray-400">Uncategorized</span>
                  <span className="text-white font-medium tabular-nums">{fmt(uncategorized)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                Spending more than your limit on something? Adjust it in{' '}
                <a href="/budget" className="text-indigo-400 hover:underline">Budget Settings</a>.
              </p>
            </div>
          )}
        </div>
      )}

      <input type="text" placeholder="Search this month..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500" />

      {loadingMonth ? (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 text-center text-gray-500 py-12">
          No transactions in {range.label}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) =>
            editingId === txn.id ? (
              /* ---- Inline edit form ---- */
              <div key={txn.id} className="rounded-xl border border-indigo-700 bg-gray-900 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-400">Amount
                    <input type="number" step="0.01" value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-xs text-gray-400">Date
                    <input type="date" value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-xs text-gray-400 col-span-2">What for
                    <input type="text" value={editForm.merchant_name}
                      onChange={(e) => setEditForm({ ...editForm, merchant_name: e.target.value })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-xs text-gray-400 col-span-2">Category
                    <select value={editForm.category_id}
                      onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">Uncategorized</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(txn.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">Save</button>
                  <button onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              /* ---- Normal transaction card ---- */
              <div key={txn.id}
                className={clsx('rounded-xl border p-4 flex flex-col gap-2.5',
                  txn.excluded ? 'bg-gray-950/40 border-gray-800/70' : 'bg-gray-900 border-gray-800')}>
                <div className="flex items-center justify-between gap-3">
                  <span className={clsx('font-medium truncate', txn.excluded ? 'text-gray-500' : 'text-white')}>
                    {txn.merchant_name || txn.description || '—'}
                  </span>
                  <span className={clsx('font-semibold tabular-nums whitespace-nowrap',
                    txn.excluded ? 'text-gray-500' : 'text-white')}>
                    {fmt(txn.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{txn.date}</span>
                    <span className={clsx('px-1.5 py-0.5 rounded',
                      txn.source === 'plaid' ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-800 text-gray-400')}>
                      {txn.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {txn.excluded ? (
                      <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-500">
                        {txn.pfc_primary === 'INCOME' ? 'Income' : 'Transfer / payment'}
                      </span>
                    ) : (
                      <select value={txn.category_id || ''}
                        onChange={(e) => handleRecategorize(txn.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 max-w-[160px]">
                        <option value="">Uncategorized</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => startEdit(txn)}
                      className="text-gray-500 hover:text-white text-xs transition-colors px-1">Edit</button>
                    <button onClick={() => handleToggleExcluded(txn.id, !txn.excluded)}
                      title={txn.excluded ? 'Count this toward budgets' : 'Exclude from budgets'}
                      className="text-gray-500 hover:text-indigo-400 text-xs transition-colors px-1">
                      {txn.excluded ? 'Include' : 'Exclude'}
                    </button>
                    {txn.source === 'manual' && (
                      <button onClick={() => handleDelete(txn.id)}
                        className="text-gray-600 hover:text-red-400 text-xs transition-colors px-1">✕</button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
