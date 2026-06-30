import { PlaidApi, PlaidEnvironments, Configuration } from 'plaid';
import 'dotenv/config';

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(config);

export async function createLinkToken() {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: 'budget-tracker-user' },
    client_name: 'Budget Tracker',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
  });
  return response.data.link_token;
}

export async function exchangePublicToken(publicToken) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function syncAllPages(accessToken) {
  let transactions = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    const data = response.data;
    transactions = transactions.concat(data.added);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  return transactions;
}

export async function fetchTransactions(accessToken, startDate, endDate) {
  // On a freshly linked Item, Plaid prepares transactions asynchronously,
  // so the first sync often returns empty. Retry a few times before giving up.
  let transactions = [];
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      transactions = await syncAllPages(accessToken);
    } catch (err) {
      // PRODUCT_NOT_READY = Plaid still preparing data; wait and retry
      const code = err.response?.data?.error_code;
      if (code !== 'PRODUCT_NOT_READY') throw err;
    }
    if (transactions.length > 0) break;
    if (attempt < maxAttempts) await sleep(2500);
  }

  // Filter to the requested date range
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= new Date(startDate) && d <= new Date(endDate);
  });
}

export async function fetchAccounts(accessToken) {
  const response = await plaidClient.accountsGet({ access_token: accessToken });
  return response.data.accounts;
}
