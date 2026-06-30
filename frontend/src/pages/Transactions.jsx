import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { transactionsApi } from '../services/api.js';
import clsx from 'clsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function Transactions() {
  const { transactions, categories, loadAll } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    merchant_name: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
  });
  const [saving, setSaving] = useState(false);

  const filtered = transactions.filter((t) =>
    !search ||
    (t.merchant_name || t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleRecategorize(txnId, categoryId) {
    await transactionsApi.recategorize(txnId, categoryId || null);
    await loadAll();
  }

  async function handleToggleExcluded(txnId, excluded) {
    await transactionsApi.setExcluded(txnId, excluded);
    await loadAll();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await transactionsApi.create({
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
      });
      setForm({ amount: '', merchant_name: '', date: '', category_id: '' });
      setShowAdd(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await transactionsApi.remove(id);
    await loadAll();
  }

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
        <form onSubmit={handleAdd} className="rounded-xl bg-gray-900 border border-gray-800 p-4 grid grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-gray-700"
          />
          <input
            type="text"
            placeholder="Merchant"
            value={form.merchant_name}
            onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-gray-700"
          />
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          />
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="col-span-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add transaction'}
          </button>
        </form>
      )}

      <input
        type="text"
        placeholder="Search transactions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500"
      />

      <div className="rounded-xl overflow-hidden border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Merchant</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-12">
                  No transactions yet
                </td>
              </tr>
            )}
            {filtered.map((txn) => (
              <tr key={txn.id} className={clsx(
                'transition-colors',
                txn.excluded ? 'bg-gray-950/50 hover:bg-gray-900' : 'bg-gray-950 hover:bg-gray-900'
              )}>
                <td className="px-4 py-3 text-gray-400">{txn.date}</td>
                <td className={clsx('px-4 py-3 font-medium', txn.excluded ? 'text-gray-500' : 'text-white')}>
                  {txn.merchant_name || txn.description || '—'}
                </td>
                <td className="px-4 py-3">
                  {txn.excluded ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">
                      {txn.pfc_primary === 'INCOME' ? 'Income' : 'Transfer / payment'}
                    </span>
                  ) : (
                    <select
                      value={txn.category_id || ''}
                      onChange={(e) => handleRecategorize(txn.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className={clsx(
                  'px-4 py-3 text-right font-medium',
                  txn.excluded ? 'text-gray-500' : 'text-white'
                )}>
                  {fmt(txn.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded',
                    txn.source === 'plaid' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-400'
                  )}>
                    {txn.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleToggleExcluded(txn.id, !txn.excluded)}
                    title={txn.excluded ? 'Count this toward budgets' : 'Exclude from budgets (income/transfer)'}
                    className="text-gray-600 hover:text-indigo-400 text-xs transition-colors mr-3"
                  >
                    {txn.excluded ? 'Include' : 'Exclude'}
                  </button>
                  {txn.source === 'manual' && (
                    <button
                      onClick={() => handleDelete(txn.id)}
                      className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
