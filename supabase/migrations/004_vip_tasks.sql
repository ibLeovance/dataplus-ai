-- AI COMPUTER PLUS — Round 14: VIP Task packages + purchases
-- NOTE: this project's managed Supabase cannot run raw SQL via API,
-- so VIP data is stored in the app_settings table (JSON rows).
-- This file is kept for reference if you ever apply it in the
-- Supabase SQL Editor: https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/sql/new

CREATE TABLE IF NOT EXISTS vip_plans (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  deposit_amount NUMERIC(14,4) NOT NULL,
  daily_earn_rate NUMERIC(14,4) NOT NULL,
  task_amount NUMERIC(14,4) NOT NULL,
  max_daily_tasks INTEGER NOT NULL DEFAULT 1,
  validity_days INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vip_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  amount NUMERIC(14,4) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO vip_plans (name, deposit_amount, daily_earn_rate, task_amount, max_daily_tasks, validity_days, status)
VALUES
  ('VIP Bronze',   5,    0.08,  0.10, 5,  60,  'active'),
  ('VIP Silver',   50,   1.00,  1.20, 8,  60,  'active'),
  ('VIP Gold',     100,  2.20,  2.60, 10, 120, 'active'),
  ('VIP Platinum', 300,  7.50,  8.00, 12, 120, 'active'),
  ('VIP Diamond',  500,  14.00, 15.00, 15, 240, 'active'),
  ('VIP Elite',    1000, 35.00, 38.00, 20, 365, 'not_yet_active')
ON CONFLICT DO NOTHING;
