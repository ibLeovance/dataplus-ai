// Create the notifications table via Supabase Management API (POST /v1/projects/{ref}/sql)
// The service role key used so far is the database JWT key — try the Management API;
// if rejected, fall back to creating the table lazily through the app itself is not possible.
import { createClient } from '@supabase/supabase-js';

const REF = 'uqtirisxgqmhxupncink';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438';

const url = `https://api.supabase.com/v1/projects/${REF}/sql`;
const sql = `
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NULL, -- NULL = broadcast to all users
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
const txt = await res.text();
console.log('STATUS', res.status);
console.log(txt.slice(0, 500));
