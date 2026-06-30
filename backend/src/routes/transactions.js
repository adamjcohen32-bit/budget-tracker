import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// Get all transactions (current month by default, or ?start=&end=)
router.get('/', async (req, res) => {
  const now = new Date();
  const start =
    req.query.start ||
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = req.query.end || now.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(id, name, color, type)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Manual transaction entry
router.post('/', async (req, res) => {
  const { category_id, amount, merchant_name, description, date } = req.body;
  if (!amount || !date) return res.status(400).json({ error: 'amount and date required' });

  const { data, error } = await supabase
    .from('transactions')
    .insert({ category_id, amount, merchant_name, description, date, source: 'manual' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
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
