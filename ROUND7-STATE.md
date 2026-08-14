# Round 7 Working State (14 Aug)

## User-approved scope (after "ok")
Legit features only. Refused: fake live feed, fake testimonials, fake charts, guaranteed ROI, withdrawal lock, fake badges (scam/ponzi features).
User asked to rename investment-style features with terms like Analyst/Job1/Resistance/Volatility — REFUSED (would mask fraud). Offered instead: a legit "Learning Center / Stats Hub" with real financial-statistics education (Analyst, Volatility, Resistance, Support, Trend, Market Overview) + real DB stats. User appeared to accept continuation ("tode kayi...").

## Round 7 items (todo.md)
1. Referral links use own domain — ALREADY DONE in code: Referral.tsx uses window.location.origin, Dashboard.tsx too. Nothing to change.
2. Payments use only 3 admin wallets — verified (btc/trx/bsc/bnb settings). Done.
3. Contact = WhatsApp channel only — verified: only Referral.tsx + Support.tsx have the WhatsApp channel link. Done.
4. Admin Panel A-Z:
   - Users tab: edit (balance/role/wallet/phone/country/ban?) — admin update endpoint exists at PUT /api/admin/users/:id. BAN feature NOT yet — optional.
   - Withdrawals: PUT /api/admin/withdrawals/:id accepts status+txHash. FEE support being added.
   - Settings: wallets/min/fee pct — fee pct just added as setting.
5. Round 7b: Learning Center page (sidebar link) + real stats cards on dashboard.

## DB migration DONE (14 Aug, via browser Supabase SQL editor)
ALTER TABLE withdrawals ADD COLUMN fee NUMERIC(20,8) NOT NULL DEFAULT 0;
INSERT INTO app_settings (key, value) VALUES ('withdrawal_fee_pct', '0') ON CONFLICT DO NOTHING;
=> "Success. No rows returned"

## 14 Aug 14:52 — is_banned column DONE via browser SQL editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE; => "Success. No rows returned"

## Round 7 code changes DONE so far (not yet tested/deployed)
- worker.ts: withdraw endpoint stores fee in withdrawals.fee, returns feePct/fee/netAmount
- worker.ts: admin settings get/put now handle withdrawal_fee_pct
- worker.ts: PUT /api/admin/withdrawals/:id accepts walletAddress
- AdminPanel.tsx: withdrawals tab shows fee + Edit wallet link (handleUpdateWithdrawalWallet direct fetch)
- AdminPanel.tsx: Settings tab has Withdrawal Fee (%) field
- worker.ts admin users allowed fields already include phone_number, country, available_balance

## STILL TODO (updated 14:55)
- DONE: ban check in login, is_banned in admin users allowed fields, EditUserDialog ban switch, admin withdrawals fee+wallet edit, settings fee field
- NEXT: Marketplace.tsx page (/marketplace) with real DB stats (fetch /api/stats or admin stats) + business terms guide; add nav link in AppLayout.tsx navItems + route in App.tsx; optionally stats card in Dashboard.tsx
- Then: build (pnpm run build or build:worker + vite build), deploy via CF Pages (find deploy script in /home/ubuntu/dataplus-ai, previously used a deploy_loop.py variant for project ai-computer-xplus-ai-fresh, env in wrangler.toml: check PROGRESS-STATE.md), push GitHub via /home/ubuntu/gh_push_sanitized.py, update JAGORAR guide

## AppLayout/notes
- Sidebar nav in client/src/components/AppLayout.tsx navItems array (line ~24); routes in App.tsx (public + /dashboard etc under auth guard)
- Echoeffect style: light bg, red primary, gold accent, glass cards — match existing pages (ref: Tasks.tsx h1 pattern)

## 14 Aug 15:15 — marketplace-stats deployment diagnosis
- Deployed 2x via /tmp/deploy_only.sh (wrangler pages deploy client/dist → ai-computer-xplus-ai-fresh). Latest deploy URL https://ac128ece.ai-computer-xplus-ai-fresh.pages.dev
- Live: login works, /api/admin/stats returns totalUsers=11, completedTasks=1. Env vars OK (SUPABASE_URL etc true via /api/_echo-env).
- PROBLEM: /api/marketplace-stats returns all zeros — cause: table 'recharges' DOES NOT EXIST in Supabase (PGRST205). worker.ts uses 'recharges' for counts only (new code). Admin stats worked because it doesn't touch 'recharges'.
- FIX: in worker.ts /api/marketplace-stats, remove recharges references (or wrap count/sum in try/catch individually, or just skip recharges). tasks/completions/withdrawals/users tables exist.
- After fix: rebuild:worker + redeploy via /tmp/deploy_only.sh, verify curl returns nonzero users.
- Tasks table has status column ('active' used at line ~382 in allTasks select).
- Then: push GitHub via /home/ubuntu/gh_push_sanitized.py, update guide JAGORAR_ADMIN_AI_COMPUTER_PLUS.md (sections: marketplace page, ban feature, withdrawal fee, admin wallet edit).
- Admin token live test: login endpoint with admin creds works.

## Old TODO list
- Add isBanned support: worker.ts users list/get should include is_banned; PUT admin users/:id allow isBanned; login endpoint must reject banned users; AdminPanel users tab EditUserDialog + ban button
- Round 7b: new Marketplace page (sidebar link in UserLayout) with real DB stats + business terms guide (Analyst, Volatility, Resistance, Support, Trend, Liquidity, Market Overview, ROI educational)
- Dashboard real stats cards (optional — may overlap with Marketplace)
- Build worker + client, deploy (deploy script: see /home/ubuntu/dataplus-ai or gh_push_sanitized.py), push GitHub, update guide /home/ubuntu/JAGORAR_ADMIN_AI_COMPUTER_PLUS.md

## Key facts
- Live site: https://ai-computer-xplus-ai-fresh.pages.dev (project ai-computer-xplus-ai-fresh)
- Supabase project: uqtirisxgqmhxupncink (ai-computer-plus)
- GitHub sync via /home/ubuntu/gh_push_sanitized.py (PAT env GITHUB_PAT)
- Old note (superseded)
SQL (to run in Supabase SQL Editor, project uqtirisxgqmhxupncink):
```sql
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee NUMERIC(20,8) NOT NULL DEFAULT 0;
INSERT INTO app_settings (key, value) VALUES ('withdrawal_fee_pct', '0') ON CONFLICT (key) DO NOTHING;
```
worker.ts line ~552: reads withdrawal_fee_pct, computes fee. Still need: store fee in withdrawal insert, show fee in UI, admin Settings tab to edit fee pct, admin Withdrawals tab to see fee + change user wallet address.

## Supabase browser session
Login: GitHub OAuth via sandbox browser (user: ibLeovance). Session expires quickly — may need re-login before running SQL. SQL Editor URL: https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/sql/new (set via monaco model setValue, then click Run button).

## Deploy
- CF Pages project: ai-computer-xplus-ai-fresh. Deploy: pnpm build:worker then `wrangler pages deploy ./client/dist --project-name=...` or use deploy script pattern in repo (check PROGRESS-STATE.md for CFTOKEN env; env vars at /tmp/r6_envs.sh pattern; source it).
- GitHub push: use /home/ubuntu/gh_push_sanitized.py or gh_push_all.py (env GITHUB_PAT).
- Guide file: /home/ubuntu/JAGORAR_ADMIN_AI_COMPUTER_PLUS.md
- Live site: https://ai-computer-xplus-ai-fresh.pages.dev
- is-a.dev PR #47183 still pending merge.

## Key repo paths
- server/worker.ts (Hono API), client/src/pages/AdminPanel.tsx, Referral.tsx, Support.tsx, Dashboard.tsx, Login.tsx, TaskDetail.tsx, client/src/App.tsx (routes), supabase/migrations/*.sql
- Admin Panel tabs: Tasks, Reviews, Withdrawals, Users, Notifications, Settings.
- WhatsApp channel: https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i

## 14 Aug 15:45 — ROUND 8+9 STATE (user follow-ups)
User asked: (1) harden Performance & Security before teacher review; (2) make this whole process into a reusable skill via skill-creator.

Round 8 hardening plan (todo.md lines 76-82):
- Add security headers to ALL worker responses in worker.ts (X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy)
- Add long-lived Cache-Control for assets + _worker.js via /client/dist/_headers file (Pages supports _headers; note: for direct-upload projects with _worker.js, static asset headers come from _headers file at client/dist root)
- Rate limit financial endpoints: withdrawals create + recharges create
- Bundle audit: check client/dist/assets size; grep built JS for SUPABASE_SERVICE_ROLE_KEY (must NOT be in client)
- Deploy via /tmp/deploy_only.sh (already defined; builds + wrangler pages deploy; CFTOKEN etc hardcoded there)
- Verify live: curl -H "Cache-Control: no-cache" https://ai-computer-xplus-ai-fresh.pages.dev/api/marketplace-stats should show users

Round 9 skill plan (todo.md lines 84-88):
- Run: python /home/ubuntu/skills/skill-creator/scripts/init_skill.py ai-computer-plus-stack
- Skill covers: Hono + Vite React task-earn platform; Supabase service-role backend (workers can't use anon key for admin ops); CF Pages direct upload GOTCHA: vars must be set on the project (wrangler.json vars NOT auto-applied in direct upload — set via Cloudflare dashboard or API before deploy; deploy script /home/ubuntu/dataplus-ai/deploy_new.py exists); is-a.dev DNS PR (github.com/is-a-dev/register → cnames/<name>.json + _config.json, PR ~2-3 days to merge, CNAME target must match deployed domain); admin panel pattern (separate /admin-login with role=admin guard); notifications graceful fallback (catch table absence, SQL at supabase/migrations/); rate limit pattern (Map key=IP+endpoint, windowMs, max)
- references/: deployment.md (CF pages direct upload + vars + deploy script skeleton), is-a-dev.md (DNS PR exact steps incl. CNAME update for project rename), supabase-ddl.md (browser SQL editor method w/ GitHub login)
- Validate: python /home/ubuntu/skills/skill-creator/scripts/quick_validate.py ai-computer-plus-stack
- Deliver: attach /home/ubuntu/skills/ai-computer-plus-stack/SKILL.md

Other facts:
- Admin guide: /home/ubuntu/JAGORAR_ADMIN_AI_COMPUTER_PLUS.md (Hausa)
- GH push: /home/ubuntu/gh_push_sanitized.py (run from anywhere; repo at /home/ubuntu/dataplus-ai has no .git — helper rebuilds and pushes via PAT)
- is-a.dev PR #47183 for ai-computer-xplus.is-a.dev → ai-computer-xplus-ai-fresh.pages.dev still pending merge
