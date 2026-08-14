// Try applying the notifications migration via Supabase Management API using the
// alt.supabase.io dashboard access token (from the GitHub OAuth callback).
const token = process.env.SB_TOKEN;
if (!token) { console.log('NO TOKEN SET'); process.exit(1); }
const url = `https://api.supabase.com/v1/projects/uqtirisxgqmhxupncink/sql`;
const sql = `
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'broadcast',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
INSERT INTO app_settings (key, value) VALUES
  ('welcome_title', 'Welcome to AI COMPUTER PLUS!'),
  ('welcome_body', 'You have earned your referral code and can now complete tasks to earn crypto. Invite friends with your link and earn 10% of what they earn!')
ON CONFLICT (key) DO NOTHING;`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const txt = await res.text();
console.log('STATUS', res.status);
console.log(txt.slice(0, 400));
