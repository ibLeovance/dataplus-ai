# Round 17 State Notes (15 Aug)

## User request (Hausa, 3 parts + screenshots)
1. Sidebar "Refer & Earn" card must have small Cancel/X so user can hide it; stays hidden until manually re-enabled (logout does NOT reset).
2. Wallet labels: the wallet the user pointed at (BSC/BEP-20 one) is **BNB** not USDT. TRX wallet = USDT on **TRC-20** (they are "the same wallet"). BTC unchanged.
3. Admin Panel: unlimited ability to add money to users (free task = $10, VIP task = $50 presets + custom unlimited), approve payments/deposits, full edit 100%, unlimited privileges.

## Live site: https://ai-computer-xplus-ai-fresh.pages.dev
- Deploy method: `pnpm build:worker` then deploy `client/dist` (contains _worker.js). Use deploy_new.py (patched: skips create if project exists).
- Login flow is Username -> Phone -> Password, email-based token: POST /api/auth/login with {email, password}.
- Admin: email=Bitcoinxml2000@proton.me, phone=+2348066359851, username=IbrahimAdmin, password=Ibrahim@2121, role=admin.
- GitHub: ibLeovance/dataplus-ai, main branch. Push blocked by secret scanning — do NOT commit files containing GITHUB_PAT_REDACTED/eyJ/CF_TOKEN_REDACTED/CF_TOKEN_REDACTED/SUPABASE_SERVICE keys. .gitignore has scripts/. Use git -c user.name="AI Computer Plus" -c user.email="Bitcoinxml2000@proton.me".
- GitHub PAT (do not commit): GITHUB_PAT_REDACTED
- Supabase: project uqtirisxgqmhxupncink, REST base https://uqtirisxgqmhxupncink.supabase.co/rest/v1/

## Done in Round 17
- [x] AppLayout.tsx: Refer & Earn card has X button (lucide X imported), state showReferCard persisted in localStorage key "referCardDismissed".
- [x] Recharge.tsx: coinMeta updated — TRX row now label "USDT / Tron Network (TRC-20)"; USDT row label "BNB / BSC Network (BEP-20)"; uses data.bnb || data.usdt from /api/withdrawals/admin-wallets.
- [x] Withdraw.tsx: currency select labels "Tether (USDT — TRC-20)", "TRON (TRX — TRC-20)".
- [x] worker.ts: new POST /api/admin/users/:id/topup (amount 0.01-1,000,000, reason, credits available_balance, sends notification).
- [x] AdminPanel.tsx: TopUpPanel component wired into UserDetailDialog with +$10 Free Task / +$50 VIP Task quick buttons + custom amount + reason. TypeScript clean.
- [x] Admin recharge approval already exists: PUT /api/admin/recharges/:id/decision (approved/rejected) — VIP auto-activation + user notification on approve. Admin UI Recharges tab exists (receipt view).

## Remaining
- [ ] Verify top-up works live (login as admin, pick a user, topup $10).
- [ ] Rebuild worker + static, deploy to CF Pages (deploy_new.py), verify /api/health JSON, login live, topup endpoint live.
- [ ] Push docs/migration to GitHub (clean — no secrets).
- [ ] Deliver result in Hausa.

## Wallet settings key names (admin Settings tab labels)
- Label "TRX (Tron) Wallet" -> bsc_wallet? No: trx_wallet, btc_wallet, bnb_wallet (label shown as "USDT/BNB (BSC) Wallet").
- Endpoint /api/withdrawals/admin-wallets returns btc, trx, usdt (=bsc), bnb.

## Key file locations
- worker.ts lines ~1280-1307: topup endpoint
- AdminPanel.tsx: TopUpPanel ~1305+, UserDetailDialog ~1261+, wallet label Settings ~1068 ("USDT/BNB (BSC) Wallet")
- Recharge.tsx coinMeta at top of file.

## 14 Aug 23:59 — Login 500 diagnosis
- Login 500 on live AFTER Round17 redeploy. admin-wallets (db.select works), vip-plans OK, health OK, _echo-env shows SUPABASE keys present.
- db.select uses .select('*') — returns all columns incl password_hash; PostgREST service role bypasses RLS.
- Python bcrypt confirmed password_hash valid for Ibrahim@2121 (user id 14, IbrahimAdmin, admin).
- Debug agent: most likely bcrypt.compare throws (user.password_hash undefined) or db.select throws. 
- NEXT: add temporary error detail to login catch (c.json {error, detail}), redeploy, retest to pinpoint. Then remove detail before final delivery.
- deploy cmd: cd /home/ubuntu/dataplus-ai && export CFTOKEN="CF_TOKEN_REDACTED" && python3 deploy_new.py
- CFTOKEN is NOT in shell env by default (lost after compaction) — must export each session.
- Remaining Round17 verify: topup test script at scripts/test_login_topup.py

## 15 Aug 00:15 — CRITICAL FINDING (login 500 root cause)
Deep env diagnostic (/api/_echo-env-deep, temp endpoint in worker.ts) revealed:
- c.env in CF Pages runtime contains SUPABASE_SERVICE_ROLE_KEY = "<SET-IN-" prefix (masked by CF since it's a secret), SUPABASE_URL=https://..., JWT_SECRET=dataplus, APP_DOMAIN=ai-compu...
- My PATCH via cf_set_env_vars.py set SUPABASE_SERVICE_ROLE_KEY as secret_text — runtime sees it as <SET-IN-DASH... which means the VALUE stored may actually be the literal string I sent or the display mask. BUT earlier rounds used "type": "plain_text" and it worked.
- KEY INSIGHT: the key IS present and presumably correct at runtime — yet login select throws "Invalid API key".
- WAIT: envVal() prefixes all returned ERR because envVal throws externally?? No — diagnostic showed processKeys includes the right keys, c.env has the right keys.
- RE-EVALUATION: envVal works; the earlier "ERR" was from my outer try. So envVal DOES return the secret (masked display). Login still fails with Invalid API key?? Then maybe the KEY ITSELF is wrong — Supabase project rotated the service role key since the project was created (iat=1786656243 = ~Aug 13; now Aug 15 — key valid 2 months, so not expired).
- BUT scripts/verify_key.py using the SAME key worked DIRECTLY (SELECT users succeeded). So key is valid.
- Remaining hypothesis: runtime provides a DIFFERENT value than my known key — e.g., user set env vars in CF Dashboard with a WRONG old/stale key, overriding my PATCH. The API listing shows value_present=True but masked; the actual stored value could be a stale key the user typed in Dashboard.

NEXT STEPS:
1. The CF Dashboard env vars: user may have set them manually (JWT_SECRET etc seen with my values though... the PATCH set plain_text earlier; values shown match my values).
2. Add a temporary login bypass: in db.ts getSupabase, try the KNOWN-GOOD hardcoded key as fallback ONLY IF select fails? Cleaner: add endpoint /api/_test-key that does db.select('users',{key:'id',value:14}) with the direct key and reports.
3. Simpler robust fix: in db.ts, if getSupabase client fails with 'Invalid API key', re-create client with a fallback key constant? NO — don't hardcode secrets.
4. Best: verify whether process.env values at runtime equal the known-good key by adding /api/_echo-env-deep prefix output (already did: SUPABASE_SERVICE_ROLE_KEY prefix "<SET-IN-" = CF secret mask, meaning it IS stored as secret — value likely correct).
5. Then why Invalid API key on select during login but not in admin-wallets? admin-wallets getSetting swallows errors! marketplace-stats db.select... returned zeros (error swallowed?). vip-plans 500 too. So select on 'users' table fails; select on 'app_settings' in getSetting swallows. Maybe the 'users' table select hits an RLS/policy issue with the anon key... If runtime resolves ANON key (unset) → empty string → Invalid API key. envVal order: reqEnv → globalThis.env → process.env. All have the key. Hmm.
6. TEST: add temp endpoint GET /api/_probe-users that does db.select('users',{id:14}) and returns result or error. Deploy and check.

## Round 17 remaining items (todo.md appended earlier):
- [ ] Refer & Earn cancel (dismiss) button — DONE (AppLayout, localStorage persist)
- [ ] Wallet labels: BNB (BSC BEP-20) not USDT; TRX = USDT on TRC-20 — DONE (Recharge.tsx, Withdraw.tsx labels, AdminPanel settings label)
- [ ] Admin topup endpoint POST /api/admin/users/:id/topup — DONE in worker.ts
- [ ] TopUpDialog in AdminPanel UserDetailDialog ($10 free / $50 VIP / custom) — DONE
- [ ] Remove debug detail from login error before delivery; remove _echo-env-deep endpoint
- [ ] Run test suite (pnpm test) before checkpoint
- [ ] Push to GitHub (sanitize secrets!), redeploy, deliver

## Deploy notes
- cd /home/ubuntu/dataplus-ai; export CFTOKEN="CF_TOKEN_REDACTED"; python3 deploy_new.py
- wrangler deploy sometimes fails with transient "fetch failed" — retry.
- After PATCH env vars, MUST redeploy (vars apply to next deployment).
- GitHub PATs: GITHUB_PAT_REDACTED (dataplus.ai repo). Secret scanning blocks commits with GITHUB_PAT_REDACTED/eyJ/CF_TOKEN_REDACTED tokens — keep scripts/ gitignored.
- Admin login: Bitcoinxml2000@proton.me / +2348066359851 / Ibrahim@2121 (username IbrahimAdmin, admin role, id 14).
