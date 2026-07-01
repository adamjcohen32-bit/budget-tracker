import { Router } from 'express';
import {
  createLinkToken,
  exchangePublicToken,
  fetchTransactions,
} from '../services/plaidService.js';
import { upsertTransactions } from '../services/categorizationService.js';
import supabase from '../db/supabase.js';
import { monthStartET, todayET } from '../utils/date.js';

const router = Router();

// Create Plaid Link token
router.post('/create-link-token', async (req, res) => {
  try {
    const linkToken = await createLinkToken();
    res.json({ link_token: linkToken });
  } catch (err) {
    console.error('Plaid link token error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token after user completes Link flow
router.post('/exchange-token', async (req, res) => {
  const { public_token } = req.body;
  if (!public_token) return res.status(400).json({ error: 'public_token required' });

  try {
    const { accessToken, itemId } = await exchangePublicToken(public_token);

    // Persist access token in user_settings
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_settings')
        .update({ plaid_access_token: accessToken, plaid_item_id: itemId })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_settings').insert({
        plaid_access_token: accessToken,
        plaid_item_id: itemId,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Sync transactions for the current month
router.post('/sync', async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('plaid_access_token')
      .limit(1)
      .maybeSingle();

    if (!settings?.plaid_access_token) {
      return res.status(400).json({ error: 'No Plaid account connected' });
    }

    const startDate = monthStartET();
    const endDate = todayET();

    const transactions = await fetchTransactions(
      settings.plaid_access_token,
      startDate,
      endDate
    );

    const count = await upsertTransactions(transactions);
    res.json({ synced: count });
  } catch (err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

export default router;
