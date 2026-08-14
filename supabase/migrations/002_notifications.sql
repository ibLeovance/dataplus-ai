-- AI COMPUTER PLUS — notifications schema
-- Apply in the Supabase SQL Editor (https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/sql/new)
-- Backward compatible: no changes to existing tables.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES users (id) ON DELETE CASCADE, -- NULL = broadcast to everyone
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'broadcast', -- broadcast | welcome | reward | withdrawal | info
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- Default welcome notification template (sent automatically to new registrants)
INSERT INTO app_settings (key, value) VALUES
  ('welcome_title', 'Welcome to AI COMPUTER PLUS!'),
  ('welcome_body', 'You have earned your referral code and can now complete tasks to earn crypto. Invite friends with your link and earn 10% of what they earn!')
ON CONFLICT (key) DO NOTHING;
