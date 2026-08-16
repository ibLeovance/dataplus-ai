# Bug: "Invalid Date" in Withdrawal Records (Personal Center)

## Root cause
Live Supabase `withdrawals` rows have `requested_at` (ISO string, correct) but NO `created_at` column.
Frontend Wallet.tsx line 306: `new Date(w.createdAt).toLocaleString()` → `new Date(undefined)` → "Invalid Date".
The `my-withdrawals` endpoint returns `toCamelList(rows)` → `requestedAt` exists, `createdAt` is undefined.

## Fix plan (minimal, no style change)
1. In server/worker.ts `my-withdrawals`/`my` endpoints: alias `requested_at` as `created_at` in the returned camelCase row
   (map rows: `{ ...r, created_at: r.requested_at ?? r.created_at }`) so `createdAt` resolves.
2. Also fix db.get withdrawal rows to include `created_at` fallback everywhere they're listed
   (Withdraw.tsx uses the same `/api/withdrawals/my` endpoint → same fix covers it).

## Note
No schema change needed — `requested_at` already carries the correct timestamp.
Deployment must be re-run to live site after fix (Cloudflare Pages).
