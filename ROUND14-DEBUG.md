# Round 14 debug notes (14 Aug 2026)

## Site
- Live: https://ai-computer-xplus-ai-fresh.pages.dev (CF Pages, deploy via /home/ubuntu/dataplus-ai/deploy_fix.py → `python3 deploy_fix.py`; build: `pnpm build:worker`)
- Admin: Bitcoinxml2000@proton.me / Ibrahim2121 (user id 14, role admin). Login response: `{user, token}` — token is TOP LEVEL: `j.token` (NOT j.user.token!)
- curl/urllib without User-Agent → CF 401. Always send UA "Mozilla/5.0 Chrome/126".
- Test probes: /home/ubuntu/probe_round14.py (python, urlopen + UA), scripts/probe14*.mjs (supabase-js from project dir)

## Schema facts (Supabase project uqtirisxgqmhxupncink)
- users cols: id,username,email,password_hash,referral_code,referred_by,role,btc_address,usdt_address,trx_address,referral_bonus,total_earned,available_balance,created_at,phone_number,country,is_banned,deposit_amount,has_recharged
- completions cols: id,user_id,task_id,proof,proof_image_url,status,reward,currency,submitted_at,reviewed_at,video_watched_seconds (NO funding column yet!)
- recharges cols: id,user_id,amount,coin,receipt_url,status,reviewed_at,created_at
- withdrawals: EMPTY table (cols unknown; worker writes status/amount/currency/wallet_address/user_id/fee/tx_hash/requested_at presumably)
- app_settings: 17 rows, key column name is NOT setting_key (ilike setting_key → "column does not exist") — actual column names differ (probably `key`/`value`). Rows: trx_wallet, btc_wallet, bsc_wallet, bnb_wallet, referral_bonus_pct, min_withdraw, payout_wallet_trx/btc/usdt/bnb, whatsapp_channel, withdrawal_fee_pct=0, recharge_receipt:999, video_pool, withdraw_pins={"35":"5678","37":"1234","38":"1234","39":"1234","40":"1234"}, vip_plans (JSON, 6 plans id1-6, Elite not_yet_active), vip_purchases (JSON; may be NULL/deleted — probe with .single() returned null!)

## Verified working live
- GET /api/vip-plans public → 6 plans
- POST /api/vip-plans/:id/purchase → 200 {success} for active plans; id6 → 400 "This VIP tier is not yet active"
- PUT /api/auth/my-pin {pin} → 200
- POST /api/recharges {amount, paymentMethod(TRX|BTC|USDT), receiptBase64} → 200; admin PUT /api/admin/recharges/:id/decision {decision:"approved"}
- VIP activation: recharge approval with amount matching plan → creates active purchase (validUntil ~2026-10-13 seen for user 39!)
- AdminPanel UI Users tab: enriched rows + detail dialog (built, not yet deployed/verified)

## CURRENT BUG: GET /api/admin/users → 500 Internal error (even with valid admin JWT)
- Local replication of enrichment logic via supabase-js (probe14c.mjs) WORKS for users 32/34/5/6 → problem is worker-specific OR data changed.
- Hypothesis: `getVipPurchases()` in worker reads `app_settings` with key name mismatch → returns []? No, getVipPlans works (vip-plans public works).
- Hypothesis 2: db.select('withdrawals', {key:'user_id',...}) on EMPTY table → maybe returns error or null → withdrawalsAmount reduce throws? db.select probably returns [].
- Hypothesis 3: completions rows exist for user 10+ (comps count>0) and comp.funding undefined ok.
- Hypothesis 4: `u.created_at` → registerTime fine. `hasPin: Boolean(pins[String(u.id)])` pins parsed from withdraw_pins setting — setting read via db.getSetting('withdraw_pins') works on worker (verified: PUT my-pin worked, getSetting('withdraw_pins') read in worker line 1120 area).
- Note: vip_purchases row may now be NULL/missing (probe14d .single() → null). getVipPurchases() has .catch→[] fine.
- Next: hit live with ? or add temporary detailed error endpoint to worker to surface exact exception, deploy, test.

## Progress update (14 Aug evening)
- ROOT CAUSE of admin/users 500: Cloudflare per-invocation subrequest limit (100) exceeded by N+1 per-user selects for 17+ users. FIXED by: db.select now supports batch in() filter; admin/users does 3 batched queries. Verified 200 with full enrichment (17 users, registerTime, hasPin, deposits, vip).
- withdrawal_fee_pct default set to '5' in DEFAULT_SETTINGS (was 0 stored; worker fallback also 5).
- Verified live: withdraw WRONG PIN → 403 'Withdraw PIN is incorrect' ✓
- ISSUE: withdraw with CORRECT PIN → 500. Likely db.insert('withdrawals') fails: withdrawals table schema columns unknown (table EMPTY, we don't know column names — worker writes user_id/amount/currency/wallet_address/fee/status; missing tx_ref or column mismatch). Next: probe14b style SELECT on withdrawals returned EMPTY — check actual withdrawals cols (add col probe) or inspect withdrawal row insert error. Maybe withdrawals table has NOT-NULL columns (currency default, tx_hash?).
- VIP $50 recharge approved → vip-my returned NONE for user r14final{code} — getActiveVip() match logic may require plan.taskAmount match or purchase.status pending→active on approve; purchases row check pending.

## Progress update 2 (latest)
- Withdrawal insert/update tested DIRECTLY with supabase-js: OK (user_id 40, amount string '10', fee '0.5', status 'processing' all valid; withdrawals table has user_id FK to users — only rejects nonexistent users).
- So worker withdraw 500 is from toCamel? or db.getSetting('withdrawal_fee_pct')? Added detail field to withdraw 500 response — next: build/deploy/rerun correct-pin withdrawal to see exact error message.
- vip_purchases row KEY IS 'key' (not 'setting_key') — verified via sb.from('app_settings').select('*').eq('key','vip_purchases'). Purchases ids 1-5: users 36-39 pending ($5 Bronze), user 39 active (approved recharge). User 40 (r14final) registered, got $50 recharge approved but vip-my=none?? The approval code matches plan by depositAmount — $50 matches 'VIP Silver'. Need to check purchases row for user 40 (was it created as active?).
- Test script: /home/ubuntu/dataplus-ai/scripts/r14-final.mjs (register new user each run with random code, admin approves $50 recharge, sets balance 25 via PUT /api/admin/users/:id {available_balance}, sets PIN 5678, withdraw wrong PIN expect 403, withdraw correct expect fee 5%).
- Admin login: POST /api/auth/login {email,password} → j.token. Admin PUT /api/admin/users/:id supports full edit.
- Admin users endpoint now batched, 200 OK, 17 users enriched.
- withdrawal_fee_pct in DB stored as '0' → worker fallback '|| 5' kicks in so fee=5% regardless. DEFAULT_SETTINGS also has '5'.

## Progress update 3 (latest)
- WITHDRAWAL FIXED: currency was null (NOT NULL col). Worker now defaults currency='TRX' (single-currency after removing wallets from UI). Verified live: correct PIN → 200, withdrawal row id 8, fee 0.5 (5%), net 9.5. Wrong PIN → 403.
- VIP activation: purchases DB shows user 45 (r14final) VIP Silver ACTIVE with validUntil Oct 2026. vip-my 'none' right after approval was likely CF edge-cache staleness of app_settings row OR race (approval happened, saveVipPurchases wrote, but vip-my read stale). vip-my later returned none still? — the test shows vip-my called ~100ms after approve 200. Possible edge cache. FIX: add cache-control no-store to /api/vip-my (and /api/admin/users).
- Remaining: free-task admin credit (need task endpoint; free-task funding admin), VIP task payout verify via task complete endpoint (tasks table: free tasks exist?), then update todo, guides, deliver.

## Progress update 4 (latest)
- VIP fully verified live (probe14j): register user 47 → vip-my null; $50 recharge approved → vip-my returns VIP Silver active, taskAmount 1.2, daily 1.0, valid 60d to Oct 2026. (Earlier r14-final 'none' was just a token/user mismatch in my own script, not a bug.)
- Completion endpoint logic confirmed: video tasks need >=30s watch; funding='admin' for free tasks (credits admin's available_balance+total_earned), funding='user' when VIP active (pays user directly with taskAmount). 30s rule verified Round 13.
- Withdrawals verified: wrong PIN 403, correct PIN 200, fee 0.5 (5%) on $10, currency defaults TRX.
- Admin users endpoint verified 200 with 17 users enriched (registerTime, hasPin, deposits, vip, tasks).
- Remaining: verify free-task admin credit + VIP payout via task complete (need a task id — query tasks list, complete one with VIP user and one with non-VIP user), then update todo.md, update Hausa guide SASHE 21, final delivery.

## Progress update 5 (latest)
- Task completion VERIFIED: VIP user (50) completed task 3 → funding 'user', reward 1.20 (taskAmount) credited to user balance. Free user (51/52) → funding 'admin', status 'admin_credited', reward 0.05. Resilient fallback added for missing 'funding' column (retry without it).
- completions table: no 'funding' column in Supabase (probe14l: 'Could not find funding column'); my retry insert uses status='admin_credited'/'approved' only.
- BUG REMAINING: admin balance NOT credited on free-task completion (probe14o: admin id 14 total_earned/available_balance still 0 after two free completions). Completion itself succeeds. The admin-credit try/catch in worker swallowed error. Suspect: db.select('users', {key:'role', value:'admin'}) — NOW my new db.select with in()... string 'admin' → .eq OK. Hmm. OR Number() math with total_earned null? admin row total_earned=0 (not null). Maybe users table lacks column total_earned?! raw users select earlier showed total_earned: 0 exists. Then updateById should work — withdrawal updateById worked on users! Maybe admins select returns [] because db.select users eq role... wait earlier admin users endpoint works fine with allUsers. So select works. Next: maybe updateById throws because 'total_earned' col? test direct supabase update users SET total_earned=0.05 for id 14 — if works, problem is in workers select/credit path. Actually simplest: add temporary error detail to completion endpoint admin credit failure (throw error with message via console? can't view). Add small debug: make admin credit re-throw into response when error contains X? Cleaner: temporarily include failure info in completion response (dev only, remove later).
- Supabase service key: [SUPABASE_SERVICE_ROLE_KEY]
- API URL: https://uqtirisxgqmhxupncink.supabase.co
- Admin email: Bitcoinxml2000@proton.me / Ibrahim2121 (id 14, role admin)
- Site: https://ai-computer-xplus-ai-fresh.pages.dev ; deploy: cd /home/ubuntu/dataplus-ai && pnpm build:worker && python3 deploy_fix.py

## Remaining Round 14 todo
- [ ] FIX admin/users 500 (deploy fix + verify)
- [ ] Verify withdrawal PIN enforcement with funded user (wrong pin → 403; correct pin → accepted, fee 5%, net = amount - fee)
- [ ] Verify free-task → admin account credit (need a task; admin creates via panel or check endpoint)
- [ ] Verify VIP task payout (taskAmount to user) when VIP active
- [ ] Withdrawal charges: withdrawal_fee_pct default 0 in settings — Round 14 requires 5%! Set default 5 in DEFAULT_SETTINGS and ensure withdrawal fee = 5% of amount
- [ ] Update JAGORAR_ADMIN_AI_COMPUTER_PLUS.md with SASHE 21 (Round 14)
- [ ] Deliver in Hausa

## Key worker line refs (Round 14 additions)
- DEFAULT_VIP_PLANS ~line 763 (ids 1-6, Elite not_yet_active)
- VIP endpoints: /api/vip-plans (GET, exempt), /api/vip-my, /api/vip-plans/:id/purchase, recharge approval VIP activation ~line 1478-1545, completion funding logic, withdrawal PIN check in /api/withdrawals/withdraw (funding=5% fee)
- AdminPanel.tsx: Users tab enriched + UserDetailDialog added ~line 1261
