import json, urllib.request

URL = "https://uqtirisxgqmhxupncink.supabase.co/rest/v1/rpc/exec_sql"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438"

# Try the edge-function SQL RPC first; fall back to direct DDL via /rest/v1 (not supported), so use RPC.
SQL = """
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigserial PRIMARY KEY,
  user_id bigint NULL,
  is_broadcast boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'broadcast',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
"""

body = json.dumps({"sql": SQL}).encode()
req = urllib.request.Request(URL, data=body, method="POST", headers={
    "apikey": KEY, "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json", "Prefer": "return=representation"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print("OK", r.status, r.read().decode()[:300])
except Exception as e:
    print("RPC failed:", e)
    # Fallback: use supabase-js style via management API is not possible; print fallback note
    print("FALLBACK: need another way (e.g. create via JS client postgrest insert to test existence)")
