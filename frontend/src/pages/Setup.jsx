import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsApi, plaidApi } from '../services/api.js';
import { usePlaidLink } from 'react-plaid-link';
import { useApp } from '../context/AppContext.jsx';

function Step({ n, active, done, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
        ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
        {done ? '✓' : n}
      </span>
      <span className={active ? 'text-white font-medium' : done ? 'text-gray-400' : 'text-gray-600'}>
        {label}
      </span>
    </div>
  );
}

function PlaidStep({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState('idle');

  async function getLinkToken() {
    setStatus('loading');
    const data = await plaidApi.createLinkToken();
    setLinkToken(data.link_token);
    setStatus('ready');
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setStatus('exchanging');
      await plaidApi.exchangeToken(publicToken);
      setStatus('syncing');
      await plaidApi.sync();
      onSuccess();
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm">
        Connect your Chase card and bank account to auto-sync transactions.
      </p>
      {!linkToken ? (
        <button
          onClick={getLinkToken}
          disabled={status === 'loading'}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
        >
          {status === 'loading' ? 'Preparing...' : 'Connect bank'}
        </button>
      ) : (
        <button
          onClick={() => open()}
          disabled={!ready || status !== 'ready'}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
        >
          {status === 'exchanging' ? 'Connecting...' : status === 'syncing' ? 'Syncing transactions...' : 'Open Plaid'}
        </button>
      )}
      <button
        onClick={onSuccess}
        className="block text-xs text-gray-600 hover:text-gray-400 mt-2"
      >
        Skip for now (add transactions manually)
      </button>
    </div>
  );
}

export default function Setup() {
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState('');
  const { loadAll } = useApp();
  const navigate = useNavigate();

  async function handleIncome(e) {
    e.preventDefault();
    await settingsApi.update({ monthly_take_home: parseFloat(income) });
    setStep(2);
  }

  async function handleBankDone() {
    setStep(3);
  }

  async function handleFinish() {
    await settingsApi.update({ setup_complete: true });
    await loadAll();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Budget Tracker</h1>
          <p className="text-gray-400 mt-1">Let's get you set up in 3 steps.</p>
        </div>

        <div className="space-y-4">
          <Step n={1} active={step === 1} done={step > 1} label="Enter monthly take-home income" />
          <Step n={2} active={step === 2} done={step > 2} label="Connect bank & card via Plaid" />
          <Step n={3} active={step === 3} done={false} label="Go live" />
        </div>

        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
          {step === 1 && (
            <form onSubmit={handleIncome} className="space-y-4">
              <label className="block">
                <span className="text-sm text-gray-400 mb-2 block">Monthly take-home (after tax)</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  placeholder="e.g. 6500"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg"
                />
              </label>
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                Continue
              </button>
            </form>
          )}

          {step === 2 && <PlaidStep onSuccess={handleBankDone} />}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Your budget categories are pre-loaded and transactions have been pulled in.
                Head to your dashboard!
              </p>
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
