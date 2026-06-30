-- ============================================================
-- Budget Tracker - Supabase Schema
-- Run this in the Supabase SQL editor to initialize the DB.
--
-- This script is NON-DESTRUCTIVE and safe to re-run: it only
-- creates tables/seeds that don't already exist, and never drops
-- or wipes data. To intentionally wipe and start over, run
-- db/reset.sql first.
-- ============================================================

-- User settings (single-user app, one row)
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_take_home numeric(10,2) not null default 0,
  plaid_access_token text,
  plaid_item_id text,
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Budget categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  budget_amount numeric(10,2) not null default 0,
  type text not null check (type in ('fixed', 'semi_fixed', 'discretionary', 'savings')),
  color text not null default '#6366f1',
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions (from Plaid or manual entry)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  plaid_transaction_id text unique,
  category_id uuid references categories(id) on delete set null,
  amount numeric(10,2) not null,
  merchant_name text,
  description text,
  date date not null,
  account_id text,
  pending boolean not null default false,
  source text not null check (source in ('plaid', 'manual')) default 'plaid',
  -- Plaid's own category tags (more reliable than merchant-name matching)
  pfc_primary text,
  pfc_detailed text,
  -- Income, transfers, and card payments are excluded from budget spend
  excluded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alert log (prevents duplicate alerts)
create table if not exists alert_log (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  threshold integer not null check (threshold in (80, 100)),
  month_year text not null, -- e.g. "2026-06"
  sent_at timestamptz not null default now(),
  unique (category_id, threshold, month_year)
);

-- Merchant categorization rules (auto-categorize by merchant name)
create table if not exists merchant_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_pattern text not null,
  category_id uuid references categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Savings goals (fully editable from the UI)
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  current_amount numeric(10,2) not null default 0,
  target_amount numeric(10,2) not null default 0,
  -- 'fixed_target' = save toward a lump sum (shows months to completion)
  -- 'annual_limit' = yearly cap like a Roth IRA (shows on track / behind)
  goal_type text not null check (goal_type in ('fixed_target', 'annual_limit')) default 'fixed_target',
  -- optional link to a savings category, so monthly contribution is read from its budget
  category_id uuid references categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Seed default categories
-- ============================================================

-- Only seed when the categories table is empty, so re-running never duplicates.
insert into categories (name, budget_amount, type, color, sort_order)
select * from (values
  ('Tesla Payment',    500,  'fixed',         '#ef4444', 1),
  ('Claude Pro',        20,  'fixed',         '#8b5cf6', 2),
  ('Work Lunches',     173,  'semi_fixed',    '#f97316', 3),
  ('Weekend Dining',   150,  'discretionary', '#f59e0b', 4),
  ('Golf',             280,  'discretionary', '#10b981', 5),
  ('Nightlife / Bars', 150,  'discretionary', '#3b82f6', 6),
  ('Misc / Buffer',    100,  'discretionary', '#6b7280', 7),
  ('Emergency Fund',   700,  'savings',       '#0ea5e9', 8),
  ('Roth IRA',         400,  'savings',       '#a855f7', 9)
) as v(name, budget_amount, type, color, sort_order)
where not exists (select 1 from categories);

-- ============================================================
-- Seed merchant auto-categorization rules
-- ============================================================

insert into merchant_rules (merchant_pattern, category_id)
select pattern, id from (
select 'tesla' as pattern, id from categories where name = 'Tesla Payment'
union all
select 'anthropic', id from categories where name = 'Claude Pro'
union all
select 'claude', id from categories where name = 'Claude Pro'
union all
select 'chipotle', id from categories where name = 'Work Lunches'
union all
select 'sweetgreen', id from categories where name = 'Work Lunches'
union all
select 'subway', id from categories where name = 'Work Lunches'
union all
select 'panera', id from categories where name = 'Work Lunches'
union all
select 'shake shack', id from categories where name = 'Work Lunches'
union all
select 'golf', id from categories where name = 'Golf'
union all
select 'pga', id from categories where name = 'Golf'
union all
select 'topgolf', id from categories where name = 'Golf'
union all
select 'bar', id from categories where name = 'Nightlife / Bars'
union all
select 'nightclub', id from categories where name = 'Nightlife / Bars'
) as r
where not exists (select 1 from merchant_rules);

-- ============================================================
-- Seed savings goals (editable starting points — change or delete in the app)
-- ============================================================

insert into goals (name, current_amount, target_amount, goal_type, category_id, sort_order)
select * from (
  select 'Emergency Fund' as name, 0 as current_amount, 9375 as target_amount,
         'fixed_target' as goal_type, id as category_id, 1 as sort_order
    from categories where name = 'Emergency Fund'
  union all
  select 'Roth IRA', 0, 7000, 'annual_limit', id, 2
    from categories where name = 'Roth IRA'
) as g
where not exists (select 1 from goals);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category_id on transactions(category_id);
create index if not exists idx_transactions_plaid_id on transactions(plaid_transaction_id);
create index if not exists idx_alert_log_category_month on alert_log(category_id, month_year);
create index if not exists idx_transactions_excluded on transactions(excluded);

-- ============================================================
-- Updated_at trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_settings_updated_at on user_settings;
create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

drop trigger if exists trg_goals_updated_at on goals;
create trigger trg_goals_updated_at
  before update on goals
  for each row execute function update_updated_at();
