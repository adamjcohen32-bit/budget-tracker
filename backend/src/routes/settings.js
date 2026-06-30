import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('id, monthly_take_home, setup_complete, plaid_item_id')
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { monthly_take_home: 0, setup_complete: false });
});

router.put('/', async (req, res) => {
  const { monthly_take_home, setup_complete } = req.body;

  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  const updates = {};
  if (monthly_take_home != null) updates.monthly_take_home = monthly_take_home;
  if (setup_complete != null) updates.setup_complete = setup_complete;

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('user_settings')
      .insert(updates)
      .select()
      .single());
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
