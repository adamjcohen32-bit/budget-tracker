import React, { useState } from 'react';
import { authApi, setToken } from '../services/api.js';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await authApi.login(password);
      setToken(token);
      onSuccess();
    } catch (err) {
      setError('Incorrect password');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="text-2xl font-bold text-white tracking-tight">Budget</span>
          <span className="text-2xl font-bold text-indigo-400 tracking-tight">Tracker</span>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-4">
          {/* Hidden username so iOS/Keychain saves & autofills the password */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="budget"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <label className="block">
            <span className="text-sm text-gray-400 mb-2 block">Enter your password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
