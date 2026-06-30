import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { categoriesApi, settingsApi } from '../services/api.js';
import { usePlaidLink } from 'react-plaid-link';
import { plaidApi } from '../services/api.js';
import clsx from 'clsx';

const TYPES = ['fixed', 'semi_fixed', 'discretionary', 'savings'];
const COLORS = ['#6366f1', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#0ea5e9', '#a855f7', '#6b7280'];

function PlaidConnector({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);

  async function getLinkToken() {
    setLoading(true);
    try {
      const data = await plaidApi.createLinkToken();
      setLinkToken(data.link_token);
    } finally {
      setLoading(false);
    }
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      await plaidApi.exchangeToken(publicToken);
      await plaidApi.sync();
      onSuccess();
    },
  });

  if (!linkToken) {
    return (
      <button
        onClick={getLinkToken}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Connect bank account'}
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
    >
      Open Plaid Link
    </button>
  );
}

export default function BudgetSettings() {
  const { categories, settings, loadAll, setSettings } = useApp();
  const [income, setIncome] = useState(settings?.monthly_take_home || '');
  const [incomeMsg, setIncomeMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', budget_amount: '', type: 'discretionary', color: '#6366f1' });

  async function saveIncome(e) {
    e.preventDefault();
    const updated = await settingsApi.update({ monthly_take_home: parseFloat(income) });
    setSettings(updated);
    setIncomeMsg('Saved');
    setTimeout(() => setIncomeMsg(''), 2000);
  }

  function startEdit(cat) {
    setEditing(cat.id);
    setEditForm({ name: cat.name, budget_amount: cat.budget_amount, type: cat.type, color: cat.color });
  }

  async function saveEdit(id) {
    await categoriesApi.update(id, {
      ...editForm,
      budget_amount: parseFloat(editForm.budget_amount),
    });
    setEditing(null);
    await loadAll();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this category?')) return;
    await categoriesApi.remove(id);
    await loadAll();
  }

  async function handleAdd(e) {
    e.preventDefault();
    await categoriesApi.create({ ...addForm, budget_amount: parseFloat(addForm.budget_amount) });
    setAddForm({ name: '', budget_amount: '', type: 'discretionary', color: '#6366f1' });
    setShowAdd(false);
    await loadAll();
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Income */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Monthly take-home income</h2>
        <form onSubmit={saveIncome} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Amount ($)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">
            Save
          </button>
          {incomeMsg && <span className="text-emerald-400 text-sm">{incomeMsg}</span>}
        </form>
      </section>

      {/* Plaid */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Bank connection</h2>
        {settings?.plaid_item_id ? (
          <p className="text-emerald-400 text-sm">✓ Bank connected</p>
        ) : (
          <PlaidConnector onSuccess={loadAll} />
        )}
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Budget categories</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            + Add category
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4 grid grid-cols-2 gap-3">
            <input
              type="text" required placeholder="Name"
              value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            />
            <input
              type="number" required placeholder="Budget ($)" step="1" min="0"
              value={addForm.budget_amount} onChange={(e) => setAddForm({ ...addForm, budget_amount: e.target.value })}
              className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            />
            <select
              value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
              className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            >
              {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setAddForm({ ...addForm, color: c })}
                  className={clsx('w-6 h-6 rounded-full border-2', addForm.color === c ? 'border-white' : 'border-transparent')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button type="submit" className="col-span-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 text-sm font-medium">
              Add category
            </button>
          </form>
        )}

        <div className="space-y-2">
          {categories.map((cat) =>
            editing === cat.id ? (
              <div key={cat.id} className="rounded-xl bg-gray-900 border border-indigo-700 p-4 grid grid-cols-2 gap-3">
                <input
                  type="text" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
                />
                <input
                  type="number" value={editForm.budget_amount} step="1" min="0"
                  onChange={(e) => setEditForm({ ...editForm, budget_amount: e.target.value })}
                  className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
                />
                <select
                  value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
                >
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <div className="flex gap-2 items-center">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEditForm({ ...editForm, color: c })}
                      className={clsx('w-6 h-6 rounded-full border-2', editForm.color === c ? 'border-white' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(cat.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">Save</button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={cat.id} className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-gray-500">{cat.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">
                    ${cat.budget_amount.toLocaleString()}/mo
                  </span>
                  <button onClick={() => startEdit(cat)} className="text-xs text-gray-500 hover:text-white transition-colors">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
