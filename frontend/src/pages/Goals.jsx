import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { goalsApi } from '../services/api.js';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import clsx from 'clsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function GoalCard({ goal, categories, onChanged }) {
  const { id, name, current, target, pct, monthly_contribution, months_to_completion, on_track, remaining, goal_type, category_id } = goal;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name, current_amount: current, target_amount: target, goal_type, category_id: category_id || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await goalsApi.update(id, {
        name: form.name,
        current_amount: parseFloat(form.current_amount),
        target_amount: parseFloat(form.target_amount),
        goal_type: form.goal_type,
        category_id: form.category_id || null,
      });
      setEditing(false);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete the "${name}" goal?`)) return;
    await goalsApi.remove(id);
    await onChanged();
  }

  const savingsCategories = categories.filter((c) => c.type === 'savings');

  if (editing) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-indigo-700 p-6 space-y-3">
        <input
          type="text" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          placeholder="Goal name"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">
            Saved so far
            <input
              type="number" step="1" min="0" value={form.current_amount}
              onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            />
          </label>
          <label className="text-xs text-gray-400">
            Target
            <input
              type="number" step="1" min="0" value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">
            Goal type
            <select
              value={form.goal_type}
              onChange={(e) => setForm({ ...form, goal_type: e.target.value })}
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            >
              <option value="fixed_target">Fixed target</option>
              <option value="annual_limit">Annual limit</option>
            </select>
          </label>
          <label className="text-xs text-gray-400">
            Funded by category
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
            >
              <option value="">None</option>
              {savingsCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (${c.budget_amount}/mo)</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {fmt(current)} saved of {fmt(target)} goal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-xs px-2.5 py-1 rounded-full font-medium',
            on_track ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
          )}>
            {on_track ? 'On track' : 'Behind'}
          </span>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-white transition-colors">Edit</button>
          <button onClick={remove} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
        </div>
      </div>

      <ProgressBar pct={pct} className="h-3 mb-3" />

      <div className="flex justify-between text-sm mt-4 text-gray-400">
        <span>{Math.round(pct)}% complete</span>
        <span>{fmt(remaining)} to go</span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Monthly contribution</p>
          <p className="text-white font-medium mt-0.5">{fmt(monthly_contribution)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">
            {goal_type === 'annual_limit' ? 'Pace' : 'Est. completion'}
          </p>
          <p className="text-white font-medium mt-0.5">
            {months_to_completion === 0
              ? 'Complete 🎉'
              : months_to_completion
              ? `${months_to_completion} month${months_to_completion !== 1 ? 's' : ''}`
              : 'Not contributing'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const { goals, categories, loading, loadAll } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', current_amount: '', target_amount: '', goal_type: 'fixed_target', category_id: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await goalsApi.create({
        ...addForm,
        current_amount: parseFloat(addForm.current_amount) || 0,
        target_amount: parseFloat(addForm.target_amount),
        category_id: addForm.category_id || null,
      });
      setAddForm({ name: '', current_amount: '', target_amount: '', goal_type: 'fixed_target', category_id: '' });
      setShowAdd(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading...</div>;
  }

  const savingsCategories = categories.filter((c) => c.type === 'savings');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Savings Goals</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
        >
          + Add goal
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl bg-gray-900 border border-gray-800 p-4 grid grid-cols-2 gap-3">
          <input
            type="text" required placeholder="Goal name"
            value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            className="col-span-2 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          />
          <input
            type="number" placeholder="Saved so far ($)" step="1" min="0"
            value={addForm.current_amount} onChange={(e) => setAddForm({ ...addForm, current_amount: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          />
          <input
            type="number" required placeholder="Target ($)" step="1" min="0"
            value={addForm.target_amount} onChange={(e) => setAddForm({ ...addForm, target_amount: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          />
          <select
            value={addForm.goal_type} onChange={(e) => setAddForm({ ...addForm, goal_type: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          >
            <option value="fixed_target">Fixed target</option>
            <option value="annual_limit">Annual limit</option>
          </select>
          <select
            value={addForm.category_id} onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700"
          >
            <option value="">Funded by… (none)</option>
            {savingsCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (${c.budget_amount}/mo)</option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 text-sm font-medium disabled:opacity-50">
            {saving ? 'Adding...' : 'Add goal'}
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
          No goals yet. Add one to start tracking your savings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} categories={categories} onChanged={loadAll} />
          ))}
        </div>
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-sm text-gray-400">
        Monthly contributions come from whichever savings category funds each goal. Adjust those amounts in{' '}
        <a href="/budget" className="text-indigo-400 hover:underline">Budget Settings</a>.
      </div>
    </div>
  );
}
