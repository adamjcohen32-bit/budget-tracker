import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { categoriesApi, settingsApi, transactionsApi, goalsApi, plaidApi } from '../services/api.js';
import { daysInMonthET, daysLeftInMonthET } from '../utils/date.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [cats, txns, sett, gls] = await Promise.all([
        categoriesApi.list(),
        transactionsApi.list(),
        settingsApi.get(),
        goalsApi.list(),
      ]);
      setCategories(cats);
      setTransactions(txns);
      setSettings(sett);
      setGoals(gls);
    } catch (err) {
      setError('Failed to load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const syncTransactions = useCallback(async () => {
    setSyncing(true);
    try {
      await plaidApi.sync();
      await loadAll();
    } catch (err) {
      setError('Sync failed.');
    } finally {
      setSyncing(false);
    }
  }, [loadAll]);

  // Auto-sync transactions once on app load, if a bank is connected.
  // Runs in the background after the first data load so the UI isn't
  // blocked; the manual "Sync" button remains as a fallback.
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (!loading && settings?.plaid_item_id && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      syncTransactions();
    }
  }, [loading, settings, syncTransactions]);

  // Derived: discretionary budget remaining and daily spend number (Eastern time)
  const daysInMonth = daysInMonthET();
  const daysLeft = daysLeftInMonthET();

  const discretionaryCategories = categories.filter(
    (c) => c.type === 'discretionary'
  );
  const discretionaryBudget = discretionaryCategories.reduce(
    (s, c) => s + c.budget_amount, 0
  );
  const discretionarySpent = discretionaryCategories.reduce(
    (s, c) => s + (c.spent || 0), 0
  );
  const discretionaryRemaining = discretionaryBudget - discretionarySpent;
  const dailySpend = daysLeft > 0 ? discretionaryRemaining / daysLeft : 0;

  const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0);
  const totalProjected = categories.reduce(
    (s, c) => s + (c.projected_monthly || c.spent || 0), 0
  );
  const monthlySurplus = settings
    ? settings.monthly_take_home - totalProjected
    : 0;

  return (
    <AppContext.Provider
      value={{
        categories,
        setCategories,
        transactions,
        setTransactions,
        settings,
        setSettings,
        goals,
        setGoals,
        loading,
        syncing,
        error,
        loadAll,
        syncTransactions,
        dailySpend,
        discretionaryRemaining,
        monthlySurplus,
        totalBudget,
        totalProjected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
