import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import BudgetSettings from './pages/BudgetSettings.jsx';
import Goals from './pages/Goals.jsx';
import Setup from './pages/Setup.jsx';
import Login from './pages/Login.jsx';
import { authApi, getToken, setToken } from './services/api.js';

function AppRoutes() {
  const { settings, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  // Show setup if first time (no income set and bank not connected)
  if (!settings?.setup_complete) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budget" element={<BudgetSettings />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AuthGate() {
  // 'checking' | 'login' | 'authed'
  const [state, setState] = useState('checking');

  useEffect(() => {
    (async () => {
      try {
        const { auth_required } = await authApi.status();
        if (!auth_required) {
          // No password set (local dev) — grab a token transparently
          if (!getToken()) {
            const { token } = await authApi.login('');
            setToken(token);
          }
          setState('authed');
        } else {
          setState(getToken() ? 'authed' : 'login');
        }
      } catch {
        setState('login');
      }
    })();
  }, []);

  if (state === 'checking') {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }
  if (state === 'login') {
    return <Login onSuccess={() => setState('authed')} />;
  }
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}
