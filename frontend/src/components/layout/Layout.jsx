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
      {/* Top bar */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold text-white tracking-tight">Budget</span>
          <span className="text-lg sm:text-xl font-bold text-indigo-400 tracking-tight">Tracker</span>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
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

      {/* Content — extra bottom padding on mobile to clear the tab bar */}
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full pb-28 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t border-gray-800 bg-gray-950/95 backdrop-blur z-20 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-indigo-400' : 'text-gray-500'
              )
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
