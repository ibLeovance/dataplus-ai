# Admin Panel Upgrade TODO

- [x] Review existing /admin-panel page and admin API access control
- [x] Add dedicated admin-login page (email + password, /admin-login) that validates role=admin
- [x] Enforce admin-only access on /admin-panel (redirect non-admins to login)
- [x] Verify admin dashboard shows: stats, tasks CRUD, completions review, withdrawals review, users management, settings (wallets/min withdraw)
- [x] End-to-end test: register normal user (blocked from admin), admin login works, approve completion credits balance
- [x] Push update to GitHub main (commit 16af56da)

## New user requests (14 Aug)
- [x] Add RECHARGE page showing admin payment wallets (TRX, BTC, USDT) with Copy + QR scan buttons
- [x] Add Recharge link to the sidebar navigation (visible when logged in)
- [x] Restore vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, APP_DOMAIN) in wrangler.json after sandbox reset, redeploy to Cloudflare Pages, verify /api/withdrawals/admin-wallets + /recharge live
- [ ] Set up ai-computer-xplus.is-a.dev custom domain on the Cloudflare Pages project
- [ ] Verify live site on new domain; deliver admin instructions (login, add tasks, review withdrawals)

## New user requests (14 Aug, round 2)
- [x] Create new CF Pages project "ai-computer-xplus-ai-fresh"
- [x] Update wrangler.json (name, APP_DOMAIN, worker define URL) to ai-computer-xplus-ai-fresh.pages.dev, drop dataplus-ai references
- [x] Improve UI to 100% match echoeffect.top structure (columns/rows, banner, search, stat cards)
- [x] Ensure Recharge page has all 3 wallets (TRX, BTC, USDT) with QR scan + Copy buttons
- [x] Deploy to ai-computer-xplus-ai-fresh.pages.dev and verify live
- [x] Update is-a.dev PR #47183 CNAME to ai-computer-xplus-ai-fresh.pages.dev

## Round 3 (14 Aug)
- [x] Register user Bitcoinxml2000@proton.me with password Ibrahim2121 and promote role to admin in Supabase (id 14)
- [x] Verify admin login works with the new account on live site (/admin-login -> /admin, all tabs visible)
- [x] Verify Recharge page + all 3 wallets (QR + copy) responsive on mobile (flex-col sm:flex-row layout, full-width copy buttons, QR renders via SVG)
- [x] Referral links per user verified earlier (verifyuser1 -> -LIFNDIG; admin -> -J6G0CER)
- [x] No redeploy needed — mobile responsiveness confirmed in code (responsive CSS classes) and live pages rendered OK in browser

## Round 4 (14 Aug) — Full admin edit + notifications + luxury UI
- [x] Backend: notifications layer + endpoints (broadcast, per-user send, mark read, unread count) — graceful when notifications table absent; table SQL ready at supabase/migrations/002_notifications.sql
- [x] Backend: on-registration welcome notification (auto send to new user)
- [x] Backend: full edit APIs in admin panel — edit any user (username, email, role, balances), edit task (all fields incl. payout amount), edit withdrawal status note, edit all app_settings
- [x] Admin UI: inline edit everywhere — edit user modal, edit task modal, edit withdrawal status note, settings full edit
- [x] Admin UI: Notifications tab — compose broadcast, see sent list, per-user send
- [x] User side: notification bell with unread badge + notification list popover
- [x] Luxury modern UI: glassmorphism cards, gradients, smooth animations, refined typography, polished stat cards, modern login/admin pages
- [x] Redeploy to ai-computer-xplus-ai-fresh.pages.dev — all routes 200 (correct build: build:worker then deploy ./client/dist)
- [x] Push to GitHub (commit 5f04a06), deliver updated guide

## Round 5 (14 Aug) — Register/Login security + upline referral field
- [x] Register page: visible "Referral Code (Upline)" input field populated from ?ref= URL and editable
- [x] Backend: register rate limiting (per-IP, 5/15 min) + validation (empty/duplicate/spam patterns, disposable email block)
- [x] Backend: login rate limiting (per-IP, 10/15 min)
- [x] Backend: ?ref= query referral still stored on registration
- [x] Redeploy and verify register flow with referral code live (refltest99 -> referred_by 14 = admin -J6G0CER)
- [x] Push to GitHub (commit ffe89ad), deliver updated guide note

## Round 6 (14 Aug) — Phone/country register fields + 30s video watch + task amount payment
- [x] DB: add phone_number and country columns to users table (migration)
- [x] Backend: register endpoint accepts phone_number + country (validated, stored)
- [x] Backend: task completion requires watching video >= 30 seconds (duration_watched param), reject if < 30s
- [x] Backend: task payment uses configured task amount (per-task amount in settings/tasks)
- [x] Register page: phone number input + country dropdown with full country list
- [x] Admin Panel Users tab: show phone number and country per user (searchable)
- [x] Admin Panel Tasks tab: show/edit per-task payment amount
- [x] Test end-to-end: register with phone/country, complete task with <30s (reject) and >=30s (pay correct amount)
- [x] Redeploy + push to GitHub + update guide

## Round 7 (14 Aug) — Legit features from pasted breakdown (approved by user)
- [x] Referral links use the site's own domain (APP_DOMAIN) + per-user unique code, everywhere (Referral page, Team page, share, notifications)
- [x] Verify payments rely ONLY on the 3 admin wallets (no external gateway), QR + copy on Recharge/Withdraw
- [x] Contact = WhatsApp channel link only (no other external contact methods on site)
- [x] Admin Panel A-Z: full control over ALL users (edit balance/role/wallets/phone/country), tasks, withdrawals (approve/reject + set fee + change user withdrawal addresses), notifications broadcast + per-user, settings (wallets, min withdrawal, referral %, welcome msg)
- [x] Rebuild + deploy to Cloudflare Pages + push to GitHub + update guide

## Round 7b (14 Aug) — Marketplace / Stats Hub (business-oriented, legit, aligned with AI COMPUTER PLUS branding)
- [x] New "Marketplace" page (sidebar link): real DB stats — total users, tasks completed, total paid out, withdrawals paid — real tables/charts, no fake data
- [x] Business terms guide section: Analyst, Volatility, Resistance, Support, Trend, Liquidity, Market Overview, ROI (educational context only)
- [ ] Task packages styled as "Job Levels" with business headings in user dashboard earnings summary
- [ ] Dashboard real stats cards: total users, tasks completed, total paid out (from DB)
- [x] Rebuild + deploy + push to GitHub + update guide (marketplace-stats deploy bug: 'recharges' table missing in DB — removed; live verified totalUsers=11)

## Round 8 (14 Aug) — Performance & Security hardening
- [x] Security headers on worker responses (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [x] Long-lived Cache-Control headers for immutable assets (/_worker.js, /assets/*) via _headers file or middleware
- [x] Rate limit on financial endpoints (withdraw/recharge requests)
- [x] Bundle audit: JS size check + no secret leakage in client bundle
- [x] Rebuild + redeploy + verify live + mobile check
- [x] Push to GitHub

## Round 9 (14 Aug) — Reusable skill (ai-computer-plus-stack)
- [x] python init_skill.py ai-computer-plus-stack
- [x] Write SKILL.md: full workflow — Hono worker + Vite React, Supabase service-role backend, CF Pages direct upload WITH vars set on project, is-a.dev DNS PR, admin panel pattern, graceful notifications fallback, rate limiting patterns, Supabase dashboard browser DDL method
- [x] references: deployment.md (wrangler vars gotcha, deploy script), is-a-dev.md (DNS PR steps), supabase-ddl.md (browser SQL editor method)
- [x] quick_validate.py pass, deliver skill card to user

## Round 14 (14 Aug) — VIP Task system + withdrawal PIN + free-task admin earnings + full user admin panel
- [x] Withdrawal page: remove the 3 admin wallet display blocks (QR/copy)
- [x] DB: vip_plans table (name, deposit amount, daily earn rate, task amount, max daily tasks, validity days, status active/not-yet) with $1000 package marked not-yet-active
- [x] DB: vip_purchases table (user, plan, amount, valid_from, valid_until, days_remaining)
- [x] Backend: GET/POST /api/vip-plans (purchase with valid deposit_amount), GET /api/vip-my (user's active plan + days remaining)
- [x] Backend: VIP task completion pays based on active plan's rate; free task (30s video) earnings routed to admin account (not user wallet)
- [x] DB: add admin_earnings tracking — free task earnings credited to admin's available_balance; VIP task earnings credited to user
- [x] Withdrawal page: require withdraw PIN before submitting (PIN input in withdrawal flow, validated server-side); keep Change Password + Withdraw PIN in Personal Center
- [x] Withdrawal: apply 5% fee automatically; payout processed within 10 minutes (auto-approve pending withdrawals with status note, admin can still review)
- [x] Admin Panel: complete user profile view — number, email, country, register time, phone, tasks done, tasks approved, deposits, withdrawals, VIP plan, PIN set flag, full action set (add money, change role, view all)
- [x] UI: VIP Task page in navigation (user) showing packages with Product Amount, Daily Earn, Validity; disabled/badge for $1000
- [x] Rebuild + deploy (verified live: VIP activate + payout 1.20, free-task admin credit, PIN gate 403 wrong PIN, 5% fee, admin users enriched) to ai-computer-xplus-ai-fresh.pages.dev + verify live (register, VIP purchase, VIP task pay, free task -> admin earnings, withdrawal PIN, admin user detail)
- [x] Push to GitHub + update JAGORAR guide (SASHE 21) guide (SASHE 21)

## Round 15 (14 Aug) — Logo, Banner, Story da WhatsApp Channel Description
- [ ] Ƙirƙiri logo na AI COMPUTER PLUS (hoton AI-generated)
- [ ] Ƙirƙiri hero banner image na website (luxury modern)
- [ ] Rubuta About Us story (investment + free tasks + VIP plan funding + online job task)
- [ ] Rubuta WhatsApp channel description (short bio + cikakken description)
- [ ] Hada logo/banner a live Cloudflare site (login page + About)
- [ ] Deploy da gwada live
