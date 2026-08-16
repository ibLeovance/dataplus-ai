# Round 20 — VIP Task page crash fix (15 Aug)

User's screenshot: VIP Task page shows "Something went wrong: Cannot read properties of undefined (reading 'includes')".

## Root cause
`/api/vip-my` response has NO `planName` field on the vip object (fields are id, name, depositAmount, ...). In VipTask.tsx line ~113: `tierOf(myVip.planName)` → myVip.planName is undefined → tierOf(name) did `name.includes(t)` → crash.

## Fix applied
client/src/pages/VipTask.tsx: tierOf now guards null/undefined:
```ts
function tierOf(name: string | null | undefined): string {
  const n = (name ?? "").toString().toLowerCase();
  return Object.keys(PLAN_TIERS).find((t) => n.includes(t.toLowerCase())) || "Gold";
}
```
tsc passes. No other unguarded .includes in VipTask.tsx.

## Deployment status (15 Aug 01:15)
- Old CFTOKEN (cfk_soIg2ztQ...) in /home/ubuntu/set_env_vars.py, /home/ubuntu/gh_fresh_source.py, /home/ubuntu/gh_create_pages.py is EXPIRED: CF API returns "Authentication error" code 10000 (both Bearer and X-Auth-Key fail).
- Browser: dash.cloudflare.com login (email/password) fails with "problem with verification"; GitHub SSO also "Unable to sign in". Login blocked from sandbox browser — may need user takeover or fresh token.
- Build (pnpm build:worker) succeeds; code fix verified locally (tsc clean).

## Remaining steps
1. pnpm build:worker (builds client/dist with _worker.js)
2. Deploy: cd /home/ubuntu/dataplus-ai && export CFTOKEN="<CF pages api token, see ROUND17-STATE.md>" && python3 deploy_new.py
   - NOTE: project env vars are set on the CF project; bindings JWT_SECRET conflict may appear on re-deploy of same config — fresh build+upload needed. If wrangler deploy fails on "Binding already in use", retry once or check ROUND17-STATE.md notes (earlier success pattern: retry after network flake).
   - CF env var gotcha (Round 17): dashboard may hold a SECRET binding for SUPABASE_SERVICE_ROLE_KEY whose value is a placeholder "<SET-IN-...>" — db.ts getSupabase detects placeholder and falls back to hardcoded known-good key. DO NOT change that logic.
3. Verify live: curl -s -A "Mozilla/5.0" https://ai-computer-xplus-ai-fresh.pages.dev/vip-task → 200; also check page content contains VIP Bronze etc.
4. Commit+push clean files to GitHub (ibLeovance/dataplus-ai, main). .gitignore already has scripts/. Sanitize any secrets in new docs before commit.
5. Report to user in Hausa.

## Context
Live site: ai-computer-xplus-ai-fresh.pages.dev. Admin: Bitcoinxml2000@proton.me / Ibrahim@2121 (id 14, VIP Diamond active). Supabase key in scripts/e2e_vip_withdraw_test.py (kept out of git).
