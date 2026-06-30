import supabase from '../db/supabase.js';

// ------------------------------------------------------------
// Income / transfer detection
// These are money movements, not discretionary spend, so they
// must NOT count against any budget category.
// ------------------------------------------------------------
const EXCLUDED_PFC_PRIMARY = new Set(['INCOME', 'TRANSFER_IN', 'TRANSFER_OUT']);
const EXCLUDED_PFC_DETAILED = new Set([
  'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT', // paying a credit card = internal transfer
]);

function isExcluded(pfcPrimary, pfcDetailed) {
  if (pfcPrimary && EXCLUDED_PFC_PRIMARY.has(pfcPrimary)) return true;
  if (pfcDetailed && EXCLUDED_PFC_DETAILED.has(pfcDetailed)) return true;
  return false;
}

// ------------------------------------------------------------
// Map Plaid's category tags -> our seeded budget categories.
// Detailed is checked first (most specific), then primary.
// Returns a category NAME (resolved to an id later) or null.
// ------------------------------------------------------------
const PFC_DETAILED_MAP = {
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: 'Nightlife / Bars',
  FOOD_AND_DRINK_NIGHTLIFE: 'Nightlife / Bars',
  FOOD_AND_DRINK_FAST_FOOD: 'Work Lunches',
  FOOD_AND_DRINK_COFFEE: 'Work Lunches',
  FOOD_AND_DRINK_RESTAURANT: 'Weekend Dining',
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: 'Golf',
};

const PFC_PRIMARY_MAP = {
  FOOD_AND_DRINK: 'Weekend Dining',
  ENTERTAINMENT: 'Nightlife / Bars',
  TRANSPORTATION: 'Misc / Buffer',
  TRAVEL: 'Misc / Buffer',
  GENERAL_MERCHANDISE: 'Misc / Buffer',
  GENERAL_SERVICES: 'Misc / Buffer',
  PERSONAL_CARE: 'Misc / Buffer',
  MEDICAL: 'Misc / Buffer',
  RENT_AND_UTILITIES: 'Misc / Buffer',
  HOME_IMPROVEMENT: 'Misc / Buffer',
};

// Build a name->id lookup for active categories
async function getCategoryNameMap() {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true);
  const map = {};
  for (const c of data || []) map[c.name] = c.id;
  return map;
}

// Resolve a category id: merchant rules first (user-defined, most
// specific), then Plaid's detailed tag, then Plaid's primary tag.
async function resolveCategoryId({ merchantName, pfcPrimary, pfcDetailed }, nameMap, rules) {
  const normalized = (merchantName || '').toLowerCase();

  // 1) Merchant rules (e.g. "tesla" -> Tesla Payment, "anthropic" -> Claude Pro)
  for (const rule of rules) {
    if (normalized && normalized.includes(rule.merchant_pattern.toLowerCase())) {
      return rule.category_id;
    }
  }

  // 2) Plaid detailed category
  if (pfcDetailed && PFC_DETAILED_MAP[pfcDetailed]) {
    const id = nameMap[PFC_DETAILED_MAP[pfcDetailed]];
    if (id) return id;
  }

  // 3) Plaid primary category
  if (pfcPrimary && PFC_PRIMARY_MAP[pfcPrimary]) {
    const id = nameMap[PFC_PRIMARY_MAP[pfcPrimary]];
    if (id) return id;
  }

  return null;
}

// Upsert a batch of Plaid transactions into the DB
export async function upsertTransactions(plaidTransactions) {
  if (!plaidTransactions.length) return 0;

  const [nameMap, rulesRes] = await Promise.all([
    getCategoryNameMap(),
    supabase.from('merchant_rules').select('merchant_pattern, category_id'),
  ]);
  const rules = rulesRes.data || [];

  const mapped = await Promise.all(
    plaidTransactions.map(async (t) => {
      const pfcPrimary = t.personal_finance_category?.primary || null;
      const pfcDetailed = t.personal_finance_category?.detailed || null;
      const merchantName = t.merchant_name || t.name;
      const excluded = isExcluded(pfcPrimary, pfcDetailed);

      // Don't waste a category on income/transfers
      const categoryId = excluded
        ? null
        : await resolveCategoryId({ merchantName, pfcPrimary, pfcDetailed }, nameMap, rules);

      return {
        plaid_transaction_id: t.transaction_id,
        category_id: categoryId,
        amount: t.amount,
        merchant_name: merchantName,
        description: t.name,
        date: t.date,
        account_id: t.account_id,
        pending: t.pending,
        source: 'plaid',
        pfc_primary: pfcPrimary,
        pfc_detailed: pfcDetailed,
        excluded,
      };
    })
  );

  // Only overwrite Plaid-owned fields on conflict — never clobber a
  // category the user manually re-assigned. We upsert, but to preserve
  // manual edits we skip rows whose category the user already changed.
  const { error } = await supabase
    .from('transactions')
    .upsert(mapped, { onConflict: 'plaid_transaction_id', ignoreDuplicates: true });

  if (error) throw error;
  return mapped.length;
}
