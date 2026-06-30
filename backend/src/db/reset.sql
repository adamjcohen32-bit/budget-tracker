-- ============================================================
-- DESTRUCTIVE RESET — wipes ALL budget-tracker data.
-- Only run this when you intentionally want a clean slate.
-- After running, run schema.sql to recreate everything.
-- ============================================================

drop table if exists alert_log cascade;
drop table if exists merchant_rules cascade;
drop table if exists goals cascade;
drop table if exists transactions cascade;
drop table if exists categories cascade;
drop table if exists user_settings cascade;
