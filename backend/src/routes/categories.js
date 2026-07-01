import { Router } from 'express';
import supabase from '../db/supabase.js';
import { checkAndSendAlerts } from '../services/alertService.js';
import { monthStartET, todayET, daysInMonthET, etParts } from '../utils/date.js';

const router = Router();

// Get all active categories with current month spend (Eastern time)
router.get('/', async (req, res) => {
  const startDate = monthStartET();
  const endDate = todayET();
  const daysInMonth = daysInMonthET();
  const dayOfMonth = etParts().day;

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (catErr) return res.status(500).json({ error: catErr.message });

  // Sum spent per category for current month.
  // Exclude income/transfers/card-payments (excluded = true) so they
  // never count against a budget.
  const { data: spendRows, error: spendErr } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('pending', false)
    .eq('excluded', false);

  if (spendErr) return res.status(500).json({ error: spendErr.message });

  const spendMap = {};
  for (const row of spendRows || []) {
    if (row.category_id) {
      spendMap[row.category_id] = (spendMap[row.category_id] || 0) + row.amount;
    }
  }

  const result = categories.map((cat) => {
    const spent = spendMap[cat.id] || 0;
    const remaining = cat.budget_amount - spent;
    const pct = cat.budget_amount > 0 ? (spent / cat.budget_amount) * 100 : 0;
    // Project end-of-month spend based on daily pace
    const dailyRate = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const projectedMonthly = dailyRate * daysInMonth;

    return {
      ...cat,
      spent,
      remaining,
      pct: Math.round(pct * 10) / 10,
      projected_monthly: Math.round(projectedMonthly * 100) / 100,
    };
  });

  // Fire alerts asynchronously (don't block the response)
  checkAndSendAlerts(result).catch(console.error);

  res.json(result);
});

// Create a new category
router.post('/', async (req, res) => {
  const { name, budget_amount, type, color, icon } = req.body;
  if (!name || budget_amount == null || !type) {
    return res.status(400).json({ error: 'name, budget_amount, type required' });
  }

  const { data: last } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (last?.sort_order || 0) + 1;

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, budget_amount, type, color: color || '#6366f1', icon, sort_order })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update a category
router.patch('/:id', async (req, res) => {
  const allowed = ['name', 'budget_amount', 'type', 'color', 'icon', 'sort_order', 'is_active'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Soft-delete (deactivate) a category
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
