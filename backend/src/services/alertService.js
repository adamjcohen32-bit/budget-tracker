import { Resend } from 'resend';
import supabase from '../db/supabase.js';
import 'dotenv/config';

// Resend is optional — only instantiate if a key is configured, so the
// app runs (and alerts are simply skipped) before email is set up.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'adamjcohen32@gmail.com';
const ALERT_FROM = process.env.ALERT_FROM || 'Budget Tracker <onboarding@resend.dev>';

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Check all categories and fire alerts if thresholds crossed and not yet sent
export async function checkAndSendAlerts(categorySpend) {
  // Email not configured yet — skip silently.
  if (!resend) return;

  // categorySpend: [{ id, name, budget_amount, spent }]
  const monthYear = currentMonthYear();

  for (const cat of categorySpend) {
    const pct = cat.budget_amount > 0 ? (cat.spent / cat.budget_amount) * 100 : 0;
    const thresholds = [];
    if (pct >= 100) thresholds.push(100, 80);
    else if (pct >= 80) thresholds.push(80);

    for (const threshold of thresholds) {
      // Check if alert already sent this month
      const { data: existing } = await supabase
        .from('alert_log')
        .select('id')
        .eq('category_id', cat.id)
        .eq('threshold', threshold)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (existing) continue;

      const remaining = cat.budget_amount - cat.spent;
      const subject =
        threshold === 80
          ? `Budget alert: 80% of ${cat.name} budget used`
          : `Budget alert: ${cat.name} budget exceeded`;

      const body =
        threshold === 80
          ? `You've hit 80% of your ${cat.name} budget — $${Math.max(0, remaining).toFixed(2)} left for the month.`
          : `You've hit 100% of your ${cat.name} budget — you're $${Math.abs(Math.min(0, remaining)).toFixed(2)} over.`;

      await resend.emails.send({
        from: ALERT_FROM,
        to: ALERT_EMAIL,
        subject,
        text: body,
        html: `<p>${body}</p>`,
      });

      await supabase.from('alert_log').insert({
        category_id: cat.id,
        threshold,
        month_year: monthYear,
      });
    }
  }
}
