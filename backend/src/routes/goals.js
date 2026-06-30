import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// Get all active goals with derived progress + pace
router.get('/', async (req, res) => {
  const now = new Date();
  const monthsRemainingInYear = 12 - now.getMonth(); // includes current month

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*, categories(name, budget_amount)')
    .eq('is_active', true)
    .order('sort_order');

  if (error) return res.status(500).json({ error: error.message });

  const result = (goals || []).map((g) => {
    const monthlyContribution = g.categories?.budget_amount || 0;
    const remaining = g.target_amount - g.current_amount;
    const pct =
      g.target_amount > 0
        ? Math.round((g.current_amount / g.target_amount) * 1000) / 10
        : 0;

    let monthsToCompletion = null;
    let onTrack;

    if (g.goal_type === 'annual_limit') {
      // On track if remaining contributions this year would reach the target
      const projectedByYearEnd =
        g.current_amount + monthlyContribution * monthsRemainingInYear;
      onTrack = projectedByYearEnd >= g.target_amount;
      monthsToCompletion =
        monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null;
    } else {
      // fixed_target: months to reach the goal at current monthly pace
      monthsToCompletion =
        monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null;
      onTrack = monthsToCompletion !== null;
    }

    return {
      id: g.id,
      name: g.name,
      current: g.current_amount,
      target: g.target_amount,
      goal_type: g.goal_type,
      category_id: g.category_id,
      monthly_contribution: monthlyContribution,
      remaining,
      pct,
      months_to_completion: remaining <= 0 ? 0 : monthsToCompletion,
      on_track: remaining <= 0 ? true : onTrack,
    };
  });

  res.json(result);
});

// Create a new goal
router.post('/', async (req, res) => {
  const { name, current_amount, target_amount, goal_type, category_id } = req.body;
  if (!name || target_amount == null) {
    return res.status(400).json({ error: 'name and target_amount required' });
  }

  const { data: last } = await supabase
    .from('goals')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('goals')
    .insert({
      name,
      current_amount: current_amount || 0,
      target_amount,
      goal_type: goal_type || 'fixed_target',
      category_id: category_id || null,
      sort_order: (last?.sort_order || 0) + 1,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update a goal (name, saved amount, target, type, linked category)
router.patch('/:id', async (req, res) => {
  const allowed = ['name', 'current_amount', 'target_amount', 'goal_type', 'category_id', 'sort_order'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Soft-delete a goal
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
