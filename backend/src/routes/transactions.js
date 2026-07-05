import { Router } from 'express';
import supabase from '../db/supabase.js';
import { monthStartET, todayET } from '../utils/date.js';

const router = Router();

// Get all transactions (current month by default, or ?start=&end=)
router.get('/', async (req, res) => {
  const start = req.query.start || monthStartET();
  const end = req.query.end || todayET();

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(id, name, color, type)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manual transaction entry.
// Accepts either category_id (UUID) or category_name (resolved server-side),
// and defaults the date to today (Eastern) — handy for the Siri Shortcut,
// which just sends { amount, category_name, note }.
router.post('/', async (req, res) => {
  const { amount, merchant_name, description, note, date } = req.body;
  let { category_id } = req.body;
  if (amount == null || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'amount required' });
  }

  // Resolve category by name if an id wasn't provided
  if (!category_id && req.body.category_name) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('is_active', true)
      .ilike('name', req.body.category_name.trim())
      .maybeSingle();
    if (cat) category_id = cat.id;
  }

  const row = {
    category_id: category_id || null,
    amount: Number(amount),
    merchant_name: merchant_name || note || null,
    description: description || null,
    date: date || todayET(),
    source: 'manual',
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Edit a submitted transaction (amount, note, date, category)
router.patch('/:id', async (req, res) => {
  const allowed = ['amount', 'merchant_name', 'description', 'date', 'category_id'];
  const updates = {};
  for (const k of allowed) {
    if (k in req.body) updates[k] = req.body[k];
  }
  if ('amount' in updates) {
    if (isNaN(Number(updates.amount))) {
      return res.status(400).json({ error: 'amount must be a number' });
    }
    updates.amount = Number(updates.amount);
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no editable fields provided' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Re-categorize a transaction
router.patch('/:id/category', async (req, res) => {
  const { category_id } = req.body;
  const { data, error } = await supabase
    .from('transactions')
    .update({ category_id })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Toggle whether a transaction counts toward budgets (fix misclassified
// income/transfers, or exclude a one-off you don't want tracked)
router.patch('/:id/excluded', async (req, res) => {
  const { excluded } = req.body;
  const { data, error } = await supabase
    .from('transactions')
    .update({ excluded: !!excluded })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete a manual transaction
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', req.params.id)
    .eq('source', 'manual');

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
