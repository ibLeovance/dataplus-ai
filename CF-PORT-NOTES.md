# CF Port Notes (context-safe)

## Goal
Port Round 11/12 upgrades (luxury redesign + recharge deposit flow) from webdev project /home/ubuntu/task-earn-platform to Cloudflare Pages project /home/ubuntu/dataplus-ai, then deploy.

## Key facts
- CF project: /home/ubuntu/dataplus-ai; build: `npm run build:cf` (vite for server/, vite for client/) → produces `dist/`. Deploy: `npx wrangler pages deploy dist --project-name ai-computer-xplus-ai-fresh` (or python deploy.py; also deploy_fix.py may exist).
- Server: /home/ubuntu/dataplus-ai/server/worker.ts (Hono). db helpers in /home/ubuntu/dataplus-ai/server/db.ts (supabase.createClient w/ SUPABASE_SERVICE_ROLE_KEY, `db.select/insert/updateById/update/deleteById/count/sum/upsertSetting/getSetting`, graceful `insertNotification`, query() raw).
- Admin auth: adminGuard(c) = user.role === 'admin'; admin endpoints live at /api/admin/*. Existing: users, tasks, withdrawals, settings (wallets), notifications, stats.
- Settings keys: admin_wallet_trx, admin_wallet_btc, admin_wallet_usdt (getSetting/upsertSetting).
- recharges table columns (from Supabase migration, snake_case): id, user_id, amount numeric, payment_method, tx_ref nullable, receipt_url, receipt_mime, status ('pending','approved','rejected'), admin_note nullable, created_at.
- users new columns: deposit_amount numeric default 0, has_recharged boolean default false.
- JWT_SECRET env in wrangler.json: "dataplus-ai-secret".
- Receipt storage: NO R2 binding (none in wrangler.json). Store receipts as base64-in-setting? Too big. Better: store base64 in a new setting key (receipts can be ~0.5MB max upload 5MB but that's too big for settings). Alternative: use R2-less approach — store small base64 in setting key 'recharge_receipts:<id>' (Postgres text up to 1GB, fine). Admin panel view: img src="data:image/png;base64,...".
- Admin panel needs Deposits tab: list recharges (join users), approve (adds deposit_amount to user, set has_recharged=true, status=approved), reject.
- Endpoint paths to add: POST /api/recharges (body: amount, paymentMethod, receiptBase64, receiptMime, txRef); GET /api/recharges/my; GET /api/admin/recharges (adminGuard); POST /api/admin/recharges/:id/decision (body: decision 'approved'|'rejected', note).
- Rate limit note: POST /api/recharges should be rate-limited by ip.
- Frontend: client/src/pages/Login.tsx (luxury 3-step), Dashboard.tsx (card-lux), Recharge.tsx, About.tsx, AdminPanel.tsx (Deposits tab). Luxury CSS: index.css has .card-lux, .btn-lux, .shimmer, .luxury-hero, stagger animation classes, fonts Playfair Display + Poppins (client/index.html).
- Deposit presets: $5,$50,$100,$300,$500,$1000. Min $5.
- Wallets from settings: use GET /api/settings (or admin settings list endpoint) for trx/btc/usdt addresses.
- Source webdev pages for porting:
  - /home/ubuntu/task-earn-platform/client/src/pages/Recharge.tsx (logic reference above)
  - /home/ubuntu/task-earn-platform/client/src/pages/Dashboard.tsx
  - /home/ubuntu/task-earn-platform/client/src/pages/Login.tsx
  - /home/ubuntu/task-earn-platform/client/src/index.css (luxury utils)
  - /home/ubuntu/task-earn-platform/client/index.html (fonts)
  - /home/ubuntu/task-earn-platform/client/src/pages/AdminPanel.tsx (Deposits tab)
- CF client API client: check /home/ubuntu/dataplus-ai/client/src/lib/api.ts or similar for how frontend calls /api/*.
- CF client pages location: /home/ubuntu/dataplus-ai/client/src/pages/ (Login.tsx, Register.tsx, Dashboard.tsx, AdminPanel.tsx, About.tsx, Withdraw.tsx, Tasks.tsx, Profile.tsx)
- Deploy output dir: dist/. After build, run deploy.
- Admin guide (Hausa): /home/ubuntu/JAGORAR_ADMIN_AI_COMPUTER_PLUS.md — mention new Deposits tab.
- User: admin email Bitcoinxml2000@proton.me (role admin in users table).

## Progress
- [x] Supabase schema migrated (recharges table + users columns)
- [x] Hausa admin guide updated (earlier Cloudflare log sections)
- [x] Phase 1 DONE (verified bundle build ok): POST /api/recharges, GET /api/recharges/my, GET /api/admin/recharges (enriched w/ userName/userEmail/receiptUrl data URI), PUT /api/admin/recharges/:id/decision. Receipt base64 stored in app_settings 'recharge_receipt:<id>' (db.deleteSetting added), deleted on review. Rate limit on /api/recharges. ALSO: GET /api/video-pool (daily rotating pool via app_settings.video_pool, date+userId seed), admin PUT/GET settings extended with videoPool, build:worker passes (client/dist/_worker.js).
- [x] Phase 2: luxury CSS ported (card-lux, btn-lux, luxury-hero, shimmer-line, stagger-1..6 in @layer utilities; fonts → Poppins + Playfair Display in index.css + index.html; manifest.json link + theme-color added to index.html — manifest.json still needs creating at client/public/manifest.json w/ icons)
- [ ] Phase 3: port client pages (Login, Dashboard, Recharge, About)
- [ ] Phase 4: Deposits tab in AdminPanel

## CF CLIENT FACTS (for porting — verify against source files)
- AuthContext.tsx (contexts/AuthContext.tsx): login(email,password), register(username,email,password,referralCode,phoneNumber,country); token stored in localStorage 'token'; user fields camelCase (id, username, email, role, btcAddress, usdtAddress, trxAddress, referralCode, referralBonus, totalEarned, availableBalance, referralCode, totalEarned string etc.). Auth middleware: c.header('Authorization','Bearer ').
- AuthContext User interface ALSO includes: referralCode, totalEarned, availableBalance, referralBonus strings.
- CF Login.tsx: simple toggle login/register, COUNTRIES array already defined (reusable), uses useAuth() login/register then navigate(/dashboard). Ref ?ref= → localStorage uplineRef.
- CF Dashboard.tsx (276 lines): stats cards (Total Earned $overview.totalEarned, Available Balance, Tasks Done overview.completedTasks, Pending Review overview.pendingTasks), referral card. Uses AppLayout. Overview comes from /api/auth/overview (returns user + overview{totalEarned, availableBalance, referralBonus, completedTasks, pendingTasks, referralCode}).
- CF Tasks.tsx (130 lines): fetch /api/tasks → data.tasks [{id,category,title,reward,currency,timeLimit,description}]. Category icons: watch_video, share_link, survey, social_follow, visit_site, app_download. No deposit gate yet.
- CF Recharge.tsx (187 lines): currently shows only admin wallets + QR + copy. Needs full deposit flow: amount presets 5/50/100/300/500/1000, payment method select (TRX/BTC/USDT), receipt image upload (base64 → POST /api/recharges {amount,paymentMethod,txRef,receiptBase64,receiptMime}), history from GET /api/recharges/my, QR generation (qrcode.react installed in CF? verify package.json; else use qrcode lib).
- CF AdminPanel.tsx (1307 lines): existing tabs; need Deposits tab → GET /api/admin/recharges → rows {userName,userEmail,receiptUrl,receiptMime,amount,paymentMethod,txRef,status,createdAt}, PUT /api/admin/recharges/:id/decision {decision:'approved'|'rejected',note}.
- CF has no /about route — add /about route to App.tsx + About.tsx page.
- Tasks gating: /api/auth/overview user obj includes has_recharged? NO — must add: GET /api/auth/overview returns user rows; update AuthContext to expose hasRecharged from user data, Dashboard shows deposit gate card when !hasRecharged, Tasks.tsx checks hasRecharged → if false redirect/show recharge gate.
- AppLayout nav: sidebar items (Home /dashboard, Discover /tasks, Team /referral, Personal Center /wallet, Marketplace /marketplace, Support /support) + top header. Add Recharge link to sidebar or header.
- Deploy: cd /home/ubuntu/dataplus-ai && npm run build:cf → dist/ ; npx wrangler pages deploy dist --project-name ai-computer-xplus-ai-fresh (token/gh already configured). wrangler.json has vars (SUPABASE keys etc) and externals: hono, jsonwebtoken, bcryptjs, nanoid, @supabase/supabase-js. nodejs_compat flag.
- webdev source pages: /home/ubuntu/task-earn-platform/client/src/pages/{Dashboard,Recharge,About,AccountAuth}.tsx for reference designs.
- webdev Dashboard uses trpc.profile.get for hasRecharged field; CF equivalent = /api/auth/me or /api/auth/overview (user row now has has_recharged + deposit_amount columns).
- qrcode.react check: grep qrcode in /home/ubuntu/dataplus-ai/package.json.
- AdminPanel current tabs unknown — read file sections before edit. Admin user fetch: AdminLogin.tsx exists at /admin-login, AdminPanel at /admin.
- COUNTRIES list in CF Login.tsx is full world list — reuse in About/register country select.
- [ ] Phase 5: build + deploy via wrangler pages deploy dist
- [ ] Verify live at ai-computer-xplus-ai-fresh.pages.dev (login, dashboard, recharge, admin deposits tab)
- [ ] Update Hausa admin guide with Deposits tab section

## Video pool decision (Round 11)
- CF Supabase tasks table has NO video_urls column. Plan: store video pool as JSON in app_settings key 'video_pool' (array of YouTube/TikTok URLs). Server /api/tasks returns tasks; TaskDetail client resolves pool from GET /api/video-pool or admin seed. Simpler: add GET /api/video-pool endpoint in worker (public, picks rotating pool based on date seed so same for all users per day but differs between days; add user_id to seed to vary per user).
- TaskDetail: if task category === 'watch_video' or 'video', render iframe embed of chosen URL + 30s watch rule already enforced server (video_watched_seconds).
- Implement worker endpoint GET /api/video-pool?userId=<id> returning {videoUrl} via day+userId seed.
- Admin admin: seed video pool via AdminPanel Deposits? No — add 'Pool' field in AdminPanel settings tab OR just pre-seed via curl once. We'll seed ~8 YouTube URLs via curl to app_settings.video_pool after deploy.

## CF API shapes confirmed
- POST /api/recharges: body {amount, paymentMethod, txRef, receiptBase64, receiptMime}, returns {recharge: {id,...}, message}. Auth Bearer.
- GET /api/recharges/my: {recharges:[{id,amount,paymentMethod,txRef,status,receiptMime,adminNote,createdAt,...}]} (camel).
- GET /api/admin/recharges: {recharges:[{...,userName,userEmail,receiptUrl,data: uri, receiptMime}]}
- PUT /api/admin/recharges/:id/decision: body {decision:'approved'|'rejected',note}. On approve: credits user deposit_amount+has_recharged=true + notification.
- VALID_PRESETS [5,50,100,300,500,1000]. Max 5MB receipt base64.
- GET /api/auth/overview: {user:{camel all cols incl hasRecharged,depositAmount...}, overview:{totalEarned,availableBalance,referralBonus,completedTasks,pendingTasks,referralCode}}

## Phase 3 status (client pages)
DONE so far:
- Login.tsx rewritten: luxury 3-step flow (login: email→phone→password; register: identity→contact→security+referral), card-lux, stagger, COUNTRIES exported, LogIn as LogInIcon + UserPlus imported from lucide-react. Verified vite build OK (bundle warning only).
- Dashboard.tsx rewritten: luxury-hero banner, deposit gate (!hasRecharged → /recharge card), premium member badge (depositAmount), 4 stat cards (tone emerald/primary/amber/slate via border classes), Quick Actions grid (Tasks /tasks, Recharge /recharge, Withdraw /withdraw, Referral /referral), My Referral card, Recent Activity list from /api/tasks/my-completions. Backup at Dashboard.tsx.bak.
- Recharge.tsx rewritten: DEPOSIT_PRESETS [5,50,100,300,500,1000], method select TRX/BTC/USDT, admin wallet + QRCodeSVG, txRef optional, file upload → base64 (max 5MB, image only), POST /api/recharges, history GET /api/recharges/my, status badges. Backup Recharge.tsx.bak.
- About.tsx created: luxury hero, real stats from /api/marketplace-stats, 4 pillars, story section (founded 2020, launched 2026).
- AuthContext.tsx: added depositAmount+hasRecharged to User type, refreshUser() fn, setUser merge in fetchMe (keeps existing user fields), provider exposes refreshUser.
NEXT:
1. Wire About route in App.tsx (/about + add About link in AppLayout header if exists) — check App.tsx routes.
2. Add /recharge route if not present (AppLayout already has Recharge sidebar item).
3. Tasks.tsx: add deposit gate (if !user.hasRecharged show card redirect /recharge) — fetch hasRecharged via /api/auth/me already merged into AuthContext user; or fetch overview.
4. TaskDetail.tsx: video iframe pool — fetch /api/video-pool → embed YouTube (replace watch?v= → embed/, shorts/ → embed/, youtu.be/ → youtube.com/embed/) + autoplay=1&mute=1; TikTok links: use blockquote embed <blockquote class="tiktok-embed">? Simpler: TikTok urls use iframe src=`https://www.tiktok.com/player/v1/<id>`? Verify; fallback show link button. Also keep 30s rule.
5. AdminPanel.tsx: add Deposits tab (GET /api/admin/recharges, approve/reject PUT :id/decision), + Settings tab videoPool textarea (PUT /api/admin/settings videoPool). Then seed video_pool via curl.
6. manifest.json at client/public/manifest.json + icons (use text icon or generated); index.html already links it.
7. Build: cd /home/ubuntu/dataplus-ai && pnpm build:worker (or npm run build:cf per todo? check scripts: build:worker → client/dist/_worker.js + dist). Deploy: npx wrangler pages deploy client/dist --project-name ai-computer-xplus-ai-fresh (or use deploy_fix.py in dataplus-ai dir).
8. Verify live: login, dashboard gate, recharge submit, admin deposits tab; then Hausa guide update (Sashe 19 Deposits tab, video pool).
CF site URL: https://ai-computer-xplus-ai-fresh.pages.dev

## Phase 4 (Admin Deposits tab) — key facts
AdminPanel.tsx facts:
- TabsList at ~line 367: tabs = tasks, completions (Reviews), withdrawals, users, notifications, settings. Must add "deposits" trigger + TabsContent "deposits".
- useApiFetch(endpoint) hook returns {data, loading, refresh}; useApiMutation(method, endpoint, successMsg) returns {mutate, pending}.
- Settings tab uses PUT /api/admin/settings with body {videoPool, ...} — CHECK exact field names when adding video_pool textarea (grep "videoPool" in AdminPanel).
- Worker admin endpoints: GET /api/admin/recharges (returns {recharges:[...camel] with username, tx_ref, receipt_url, status, amount, payment_method, created_at}); PUT/POST? decision endpoint — CHECK worker lines ~1137+: endpoint is likely `/api/admin/recharges/:id` with decision (approve/reject). Verify exact shape before writing client.
- Stats from /api/admin/stats includes pendingWithdrawals; add pendingRecharges stat to worker? (optional — add `pending_recharges` count to stats endpoint if exists)
- Backup pattern: before overwriting AdminPanel.tsx, mv to .bak first.

Video pool (admin Settings tab): field name in admin settings endpoint = videoPool (snake video_pool in DB). Add textarea for videoPool (one URL per line, JSON array) + save via PUT /api/admin/settings {videoPool: [...]}.

Deploy notes:
- Build: `cd /home/ubuntu/dataplus-ai && pnpm build:worker` (client: `npx vite build`, both done by scripts? scripts: build:worker builds worker into client/dist/_worker.js and copies assets; confirm `pnpm build:worker` alone produces deployable client/dist). Then deploy: `cd /home/ubuntu/dataplus-ai && python3 deploy_fix.py` (or npx wrangler pages deploy client/dist --project-name ai-computer-xplus-ai-fresh — check deploy_fix.py content first!).
- Live URL: https://ai-computer-xplus-ai-fresh.pages.dev

## Phase 5 verification status (Aug 14)
DEPLOYED SUCCESSFULLY: both builds ran (`pnpm build:worker` incl. esbuild → client/dist/_worker.js 50kb) then `python3 deploy_fix.py` → deployment c50ff306 complete.
- /api/health returns {"status":"ok","env":"development"} on root AND fresh URLs ✓ (worker running, JSON not SPA)
- Supabase check: recharges table exists (empty []), users has_recharged + deposit_amount columns exist ✓
- Login page renders luxury 3-step UI (steps 1/2/3, YOUR EMAIL, Sign in securely) ✓ (body text confirmed via console; screenshot showed faint rendering because colors are light bg)
- Home / returns SPA HTML with manifest + umami analytics ✓
REMAINING: verify /dashboard gate (needs login — user may log in via browser or I test via API with a token), verify /recharge presets UI, admin /admin-panel deposits tab, then phase 6 (Hausa guide update + deliver).
Login API: POST /api/auth/login {email,password}; token stored localStorage key "token"? check AuthContext. Admin login: /admin-login with Bitcoinxml2000@proton.me / Ibrahim2121.

## CRITICAL FINDING (deploy verification)
CF Supabase `recharges` table columns: id, user_id, amount (numeric), coin (default TRX), receipt_url (default ''), status (default pending), reviewed_at, created_at.
NO payment_method, tx_ref, admin_note, reviewed_by columns! Worker wrote insert with snake names payment_method/tx_ref → 500.
FIX: map in worker: coin=payment method, receipt_url stores base64? receipt_url is text — can hold base64 receipt (1MB+ OK). OR keep app_settings storage for receipts (works fine). Simpler:
- insert uses: { user_id, amount, coin: method, receipt_url: receiptBase64 } — store base64 in receipt_url directly (no settings trick needed; admin GET can return data: prefix).
- admin decision: updateById { status, reviewed_at }.
- worker toCamel → camel fields; admin view uses receiptUrl: data:image/png;base64,... + adminNote (may not exist — wrap optional).
- users table already has deposit_amount + has_recharged (confirmed earlier).
- video-pool & recharges/my endpoints work live (verified).

## DEPLOY REGRESSION (3ba87b1c)
New deployment 3ba87b1c serves SPA HTML for /api/* and 405 for POST /api/recharges → WORKER NOT RUNNING on this deploy.
Earlier deploy c50ff306 DID work (JSON health, 200 endpoints).
Hypothesis: the second deploy (after my worker edits) uploaded 0 files, "Compiled Worker successfully" appeared once but not on the latest; maybe esbuild output path issue or wrangler warning "external" breaking worker binding on new deploys. First deploy also had 0 files uploaded but worker ran.
FIX ATTEMPT NEXT: verify client/dist/_worker.js exists before deploy (it did), try deleting client/dist/_worker.js + re-run pnpm build:worker + deploy. Also inspect wrangler.json "external" field — wrangler pages deploy may ignore _worker.js if pages config conflicts (pages_build_output_dir set but deploy command passes ./client/dist explicitly).
NOTE: wrangler.json has "external" top-level field which is a Workers-only field — Pages deploy warning only, likely fine.
IMPORTANT check: is _worker.js present in deployed assets? "Uploaded 0 files (6 already uploaded)" — asset fingerprint index-Dw2ABzHB.js changed (new build) so uploads should have been >0. Only 6 files = manifest+index+css+2 assets+gitkeep → _worker.js MISSING from upload! The bundle name index-Dw2ABzHB shows new client build uploaded but _worker.js absent. Maybe esbuild output went elsewhere this time (pnpm build:worker showed "client/dist/_worker.js 48.8kb" though). Investigate.

## VERIFICATION STATUS (live) — mostly PASS
- Deploy 5b88cc63 running on BOTH root and fresh URLs. Root now works.
- End-to-end recharge flow verified via API: register (test user 32) → submit deposit $5 BTC (receipt base64 stored in recharges.receipt_url) → admin list shows receipt data URL + userName → admin approve → deposit_amount=5, has_recharged=true, notification try/catch OK.
- video-pool seeded w/ 3 YouTube URLs via admin settings (videoPool as JSON array; textarea must be JSON array). video-pool returns embed URL for user 32.
- Login 3-step flow VERIFIED visually in browser: Step1 email → Step2 phone → Step3 password → Sign In. Stepper circles render. Register flow also present w/ country select.
- Admin login token at /tmp/admintoken.txt (Bitcoinxml2000@proton.me / Ibrahim2121).
- Worker deploy gotcha: "Uploading Worker bundle" line confirms worker uploaded; previous bad deploy 3ba87b1c had no worker (was serving SPA HTML for /api). Always check dist/_worker.js exists before deploy_fix.py.
- Admin Panel: Deposits tab added, videoPool textarea in Settings.
REMAINING: verify Dashboard deposit gate visually + admin deposits tab visually + update JAGORAR guide + final delivery to user in Hausa.

## ROUND 13 — USER REQUEST (Aug 14)
1. [x] Login single step: email+phone+password (Login.tsx rewritten, referralCode removed from register, no upline field; register passes undefined for referralCode — worker accepts optional). Phone optional in login.
2. [ ] Discover Task label → "Task" (AppLayout.tsx line 27 label "Discover"; Tasks.tsx line 90 h1 "Discover Tasks" → "Tasks")
3. [ ] Video task minimum 30s — ALREADY ENFORCED in TaskDetail.tsx line 114 (timeElapsed < 30 blocked). Keep as is; verify timer works at 30s.
4. [ ] Remove "Savings Jar" from sidebar (AppLayout line 33)
5. [ ] "Marketplace" only visible for admin (AppLayout line 30, Home.tsx line 103-ish, route stays but nav hidden for role!=admin; check Home.tsx quick links too — there's no marketplace quick link though. Admin Panel already admin-only)
6. [ ] Personal Center (Wallet.tsx, h1 "Personal Center", path /wallet): add Change Password section + Withdraw PIN setting section. Requires worker endpoints: POST /api/auth/change-password (old+new password) + user column withdraw_pin (need DB migration) and endpoint to set it (PUT /api/me or /api/profile/pin?). Admin panel can see pin?
7. After changes: pnpm build:worker (esbuild → client/dist/_worker.js MUST exist) then python3 deploy_fix.py in /home/ubuntu/dataplus-ai, wait propagation, verify live. Test with admin creds Bitcoinxml2000@proton.me / Ibrahim2121; test user verify202608@gmail.com / Testpass2026! (password was set via PATCH bcrypt to users id 32).
8. Update JAGORAR_ADMIN_AI_COMPUTER_PLUS.md (add SASHE 20 for Round 13 changes).
9. Deliver in Hausa.
Deploy URL: ai-computer-xplus-ai-fresh.pages.dev ; deploy script: cd /home/ubuntu/dataplus-ai && python3 deploy_fix.py; admin guide at /home/ubuntu/JAGORAR_ADMIN_AI_COMPUTER_PLUS.md (already has SASHE 19).


## Round 13 (user requests, Aug 14) — STATUS
- [x] Login.tsx: rewritten single-step (email + phone + password in one form, no multi-step stepper)
- [x] Register: single step, NO upline/referral input field (no upline anywhere in website)
- [x] AppLayout nav: Discover→"Task", removed Marketplace/Upline/Savings Jar items; Marketplace nav item kept but filtered: only visible when user.role === 'admin'
- [x] Home.tsx landing nav: Discover→Task, Savings Jar removed
- [x] Tasks.tsx heading "Discover Tasks"→"Tasks"
- [ ] Tasks 30s rule: timer min 30s already enforced in TaskDetail (timeLimit/elapsed check). Verify TaskDetail requires min 30 seconds on video tasks.
- [ ] Marketplace: hide from non-admin users. Sidebar nav already filtered. ALSO check: /marketplace route in App.tsx should redirect or block non-admin. Admin Panel already admin-only.
- [ ] Personal Center (/wallet, Wallet.tsx): add "Change Password" section + "Withdraw PIN" section.
  - PIN storage: NO schema change possible on managed Supabase (no raw SQL API). Store in app_settings JSON row key 'withdraw_pins' (like video_pool). Admin can read all pins in Settings tab.
  - Worker endpoints to add: POST /api/auth/change-password (oldPassword + newPassword; verify bcrypt), GET /api/me/pin, PUT /api/me/pin (set pin 4-6 digits).
- [ ] Rebuild worker + client (pnpm build:worker && vite build), redeploy via python3 deploy_fix.py in /home/ubuntu/dataplus-ai
- [ ] Verify live: login single step, register single step, Task nav label, Marketplace hidden (non-admin redirect), Personal Center password+PIN
- [ ] Update JAGORAR guide Round 13 section
- Test user: verify202608@gmail.com / TestPass2026! (live). Admin: Bitcoinxml2000@proton.me / Ibrahim2121
- CF Supabase service key in /home/ubuntu/dataplus-ai/wrangler.json SUPABASE_SERVICE_ROLE_KEY; also sandbox seed key works for REST (seed_supabase.py)
- Deploy note: MUST run pnpm build:worker BEFORE python3 deploy_fix.py or _worker.js missing from dist!
