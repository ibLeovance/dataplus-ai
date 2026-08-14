-- AI COMPUTER PLUS — round 6: phone/country on users + video watch seconds on completions
-- Apply in Supabase SQL Editor: https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/sql/new
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
ALTER TABLE completions ADD COLUMN IF NOT EXISTS video_watched_seconds INTEGER NOT NULL DEFAULT 0;
