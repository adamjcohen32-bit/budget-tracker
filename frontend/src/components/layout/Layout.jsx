import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '↕' },
  { to: '/budget', label: 'Budget', icon: '⊞' },
  { to: '/goals', label: 'Goals', icon: '◎' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-tight">Budget</span>
          <span className="text-xl font-bold text-indigo-400 tracking-tight">Tracker</span>
        </div>
        <nav className="flex gap-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )
              }
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
