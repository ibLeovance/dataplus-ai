#!/usr/bin/env python3
"""Query Supabase withdrawals table to inspect created_at/requested_at values."""
import requests, json, sys

URL = "https://uqtirisxgqmhxupncink.supabase.co/rest/v1/withdrawals"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Prefer": "return=representation",
}
r = requests.get(URL, headers=headers, params={"limit": "5", "order": "id.desc"})
rows = r.json()
for row in rows:
    print(json.dumps(row, indent=2))
print("\nColumns in first row:", list(rows[0].keys()) if rows else "none")
