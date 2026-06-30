-- ============================================================
-- Migration 001: smarter categorization + income/transfer handling
-- Safe & non-destructive — only adds columns. Re-runnable.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Plaid's own category tags (far more reliable than merchant-name matching)
alter table transactions add column if not exists pfc_primary text;
alter table transactions add column if not exists pfc_detailed text;

-- Whether this transaction counts toward budget spend.
-- Income, transfers, and credit-card payments are money movements,
-- not discretionary spending, so they're excluded.
alter table transactions add column if not exists excluded boolean not null default false;

create index if not exists idx_transactions_excluded on transactions(excluded);
