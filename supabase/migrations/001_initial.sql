-- AI COMPUTER PLUS — initial schema
-- Apply once in the Supabase SQL Editor (https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/sql/new)
-- Backend (service_role) accesses tables via PostgREST; no RLS policies needed.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  btc_address TEXT DEFAULT '',
  usdt_address TEXT DEFAULT '',
  trx_address TEXT DEFAULT '',
  total_earned NUMERIC(20,8) NOT NULL DEFAULT 0,
  available_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  referral_bonus NUMERIC(20,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'video',
  reward NUMERIC(20,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  time_limit INTEGER NOT NULL DEFAULT 300,
  image_url TEXT NOT NULL DEFAULT '',
  required_proof TEXT NOT NULL DEFAULT 'screenshot',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  proof TEXT NOT NULL DEFAULT '',
  proof_image_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reward NUMERIC(20,8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | paid | rejected
  tx_hash TEXT NOT NULL DEFAULT '',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default payout wallets + minimum withdrawal
INSERT INTO app_settings (key, value) VALUES
  ('trx_wallet', 'TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4'),
  ('btc_wallet', 'bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct'),
  ('bsc_wallet', '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8'),
  ('bnb_wallet', '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8'),
  ('min_withdraw', '5.00'),
  ('referral_bonus_pct', '10')
ON CONFLICT (key) DO NOTHING;
