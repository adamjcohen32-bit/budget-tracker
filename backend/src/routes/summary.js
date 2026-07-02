import { Router } from 'express';
import supabase from '../db/supabase.js';
import { monthStartET, todayET, etParts } from '../utils/date.js';

const router = Router();
const pad = (n) => String(n).padStart(2, '0');

// Dashboard headline numbers: spent this month, what's left, and a
// same-point-in-time comparison vs last month.
router.get('/', async (req, res) => {
  const { year, month, day } = etParts(); // month & day are 1-based
  const startThis = monthStartET();
  const endThis = todayET();

  const lastMonth = month === 1 ? 12 : month - 1;
  const lastYear = month === 1 ? year - 1 : year;
  const startLast = `${lastYear}-${pad(lastMonth)}-01`;
  const daysInLast = new Date(lastYear, lastMonth, 0).getDate();
  const endLastFull = `${lastYear}-${pad(lastMonth)}-${pad(daysInLast)}`;
  // "through the same day of the month" for a fair pace comparison
  const endLastToDate = `${lastYear}-${pad(lastMonth)}-${pad(Math.min(day, daysInLast))}`;

  const { data: rows, error } = await supabase
    .from('transactions')
    .select('amount, date')
    .gte('date', startLast)
    .lte('date', endThis)
    .eq('excluded', false)
    .eq('pending', false);

  if (error) return res.status(500).json({ error: error.message });

  let spentThis = 0;
  let spentLastFull = 0;
  let spentLastToDate = 0;
  for (const r of rows || []) {
    const amt = Number(r.amount);
    if (r.date >= startThis) {
      spentThis += amt;
    } else {
      spentLastFull += amt;
      if (r.date <= endLastToDate) spentLastToDate += amt;
    }
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('monthly_take_home')
    .limit(1)
    .maybeSingle();
  const takeHome = Number(settings?.monthly_take_home || 0);

  const round = (n) => Math.round(n * 100) / 100;
  res.json({
    spent_this_month: round(spentThis),
    spent_last_month_full: round(spentLastFull),
    spent_last_month_to_date: round(spentLastToDate),
    take_home: takeHome,
    left_this_month: round(takeHome - spentThis),
  });
});

export default router;
