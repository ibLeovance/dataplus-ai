# Round 14 State (internal notes)

## Key facts
- Project: /home/ubuntu/dataplus-ai (Cloudflare Pages + Hono worker + Supabase uqtirisxgqmhxupncink)
- Supabase has NO raw SQL API endpoint (sql_exec/exec_sql 404). Schema changes must go via app_settings JSON rows or manual SQL editor.
- Service key in wrangler.json: vars.SUPABASE_SERVICE_ROLE_KEY; url vars.SUPABASE_URL
- Deployment: `python3 deploy_fix.py` in /home/ubuntu/dataplus-ai (builds worker + client, pushes via git to GitHub, Cloudflare auto-deploys)
- After deploy wait ~25s then test via curl. Live: https://ai-computer-xplus-ai-fresh.pages.dev
- Test user: verify202608@gmail.com / TestPass2026! ; Admin: Bitcoinxml2000@proton.me / Ibrahim2121
- Probe scripts in sandbox: /home/ubuntu/probe_login2.py (register+login, token), /home/ubuntu/test_round13.py
- Workers: `pnpm build:worker`, client `npx vite build` (or deploy_fix.py does all)
- app_settings JSON pattern used: withdraw_pins, video_pool, admin_wallets (key admin_payout_wallets?)

## DONE in Round 14 so far
- [x] Withdraw.tsx rewritten: removed 3 admin wallet QR blocks, added PIN input required before submit, 5% fee summary (fee/netAmount), status processing added, endpoint /api/withdrawals/withdraw with pin field, endpoint GET /api/withdrawals/my
- [x] VipTask.tsx page created (plans catalog + purchase buttons, Elite = not yet active, active plan banner w/ days left)
- [x] AppLayout.tsx: VIP Task nav item (Crown icon) added after Task
- [x] App.tsx: /vip route added
- [x] supabase/migrations/004_vip_tasks.sql (reference only; not applied via API)

## PROGRESS (updated)
- [x] worker.ts DONE: /api/withdrawals/withdraw now requires pin (4-6 digits, verified vs withdraw_pins app_settings, 403 if wrong), fee defaults 5% (|| 5), status 'processing' on insert; /api/withdrawals/my alias added; VIP endpoints GET /api/vip-plans, GET /api/vip-my, POST /api/vip-plans/:id/purchase (pending purchase); VIP helpers getVipPlans/getVipPurchases/saveVipPurchases/getActiveVip (auto-expire); task /api/tasks/complete: if vip active reward=vip.taskAmount funding='user' paid immediately to user wallet + total_earned; else funding='admin' credits first admin role user; /api/admin/recharges/:id/decision approved → VIP auto-activate if amount matches active plan (activates pending or creates active purchase); /api/admin/users enriched with completedTasksCount/approvedTasksCount/freeTasksCount/completedTasksAmount/withdrawalsCount/withdrawalsAmount/depositsCount/depositsAmount/registerTime/hasPin/vip JSON.
- NOTE: db.sum only supports 1 filter (key,value) — completedTasksAmount now uses reduce. FIXED.
- withdrawals table status column: earlier schema check showed empty → but code references status paid/pending counts and existing code works, assume status col exists (EMPTY result was just no rows with id=1 query? No—the query used select=*&limit=1 which returned [] meaning no rows). Status col likely exists since admin withdrawals tab uses it. If insert fails due to missing col, PostgREST default: check live.
- VipTask.tsx uses GET /api/vip-plans and GET /api/vip-my returning {vip} or null; purchase button calls POST /api/vip-plans/:id/purchase (plan.id used as param; note DEFAULT_VIP_PLANS have no `id` field! FIX: assign ids in DEFAULT_VIP_PLANS and in app_settings seed)

## LIVE VERIFY PROGRESS (Round 14)
Deployed OK (deploy_fix.py). Verified live:
- /api/vip-plans public: 6 plans, Elite not_yet_active ✓
- register single-step ✓, login ✓
- vip purchase id1 → 200 success; elite → 400 'not yet active' ✓
- set pin PUT /api/auth/my-pin → 200 ✓; /api/admin/users enriched (phone, country, registerTime, hasPin, vip) ✓
- recharge submit with paymentMethod TRX + base64 receipt → 200 id=2 ✓
- recharge decision route /api/admin/recharges/:id/decision gives 404! Check the actual worker route name (grep: earlier sed showed /api/admin/recharges/.../decision exists at line ~1445). Possibly deployed old build (deploy uploaded 0 files = code unchanged). NEED: rebuild worker then redeploy, retest.
- /api/tasks GET returns [] (admin hasn't created tasks in this deployment); task-id probe uses fetched ids; skip task tests or create a task via admin endpoint then retest VIP payout.
- withdraw PIN flow: no-pin→400 insufficient balance (balance check first, ok); wrong pin test blocked by balance (needs funded user); will verify wrong-pin via admin user with balance later or accept logic review.
- Admin login tok works, users count 15 ✓

## TODO next
- [ ] worker.ts: GET /api/vip-plans (from app_settings 'vip_plans' JSON, seed if missing); GET /api/vip-my; POST /api/vip-plans/:id/purchase (create purchase, no balance change — deposit via recharge approval triggers VIP activation? Decision: purchase succeeds and sets pending VIP; admin approving matching recharge activates. SIMPLER: purchase creates pending purchase; when admin approves a recharge with the matching amount, activate the VIP plan of that amount. Or user pays via recharge first then 'activate'? User said: "kasa wadannan amount dede da irin amount na deposite... ka da daily task and earn" → plans match deposit presets. Implement: VIP purchase records intent; admin approves recharge → if recharge amount matches a plan amount, auto-activate that VIP plan for user.)
- [ ] Task completion: if VIP active, reward = plan taskAmount paid to USER; else free-task reward credited to ADMIN account (admin user id: find by role='admin'). New completion status 'admin_funded' for free tasks.
- [ ] Withdraw endpoint: verify pin from withdraw_pins (4-6 digits), fee 5% (store fee amount), status processing, auto-approve? User said funds arrive within 10 min → keep admin approval but mark processing; admin tab already has approve/reject. Keep manual approval (safety) with status processing.
- [ ] AdminPanel users tab: expand detail per user — phone, email, country, role, created_at (register time), deposit_amount, has_recharged, totalEarned, availableBalance, tasks completed, completions approved, VIP plan active (days left), withdraw PIN set flag, deposit count, withdrawals count. Add edit modal (existing EditUserDialog) keep.
- [ ] Recharge approval: VIP auto-activation logic when amount matches plan.
- [ ] build + deploy + live verify + update Hausa guide SASHE 21 + deliver in Hausa

## VIP plan seed (app_settings 'vip_plans' JSON array)
Bronze $5 daily $0.08 task $0.10 max5 60d active | Silver $50 $1.00 $1.20 max8 60d | Gold $100 $2.20 $2.60 max10 120d | Platinum $300 $7.50 $8.00 max12 120d | Diamond $500 $14.00 $15.00 max15 240d | Elite $1000 $35.00 $38.00 max20 365d not_yet_active
