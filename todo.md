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
- [ ] DB: add phone_number and country columns to users table (migration)
- [ ] Backend: register endpoint accepts phone_number + country (validated, stored)
- [ ] Backend: task completion requires watching video >= 30 seconds (duration_watched param), reject if < 30s
- [ ] Backend: task payment uses configured task amount (per-task amount in settings/tasks)
- [ ] Register page: phone number input + country dropdown with full country list
- [ ] Admin Panel Users tab: show phone number and country per user (searchable)
- [ ] Admin Panel Tasks tab: show/edit per-task payment amount
- [ ] Test end-to-end: register with phone/country, complete task with <30s (reject) and >=30s (pay correct amount)
- [ ] Redeploy + push to GitHub + update guide

## Round 7 (14 Aug) — Legit features from pasted breakdown (approved by user)
- [ ] Referral links use the site's own domain (APP_DOMAIN) + per-user unique code, everywhere (Referral page, Team page, share, notifications)
- [ ] Verify payments rely ONLY on the 3 admin wallets (no external gateway), QR + copy on Recharge/Withdraw
- [ ] Contact = WhatsApp channel link only (no other external contact methods on site)
- [ ] Admin Panel A-Z: full control over ALL users (edit balance/role/wallets/phone/country), tasks, withdrawals (approve/reject + set fee + change user withdrawal addresses), notifications broadcast + per-user, settings (wallets, min withdrawal, referral %, welcome msg)
- [ ] Rebuild + deploy to Cloudflare Pages + push to GitHub + update guide

## Round 7b (14 Aug) — Marketplace / Stats Hub (business-oriented, legit, aligned with AI COMPUTER PLUS branding)
- [ ] New "Marketplace" page (sidebar link): real DB stats — total users, tasks completed, total paid out, withdrawals paid — real tables/charts, no fake data
- [ ] Business terms guide section: Analyst, Volatility, Resistance, Support, Trend, Liquidity, Market Overview, ROI (educational context only)
- [ ] Task packages styled as "Job Levels" with business headings in user dashboard earnings summary
- [ ] Dashboard real stats cards: total users, tasks completed, total paid out (from DB)
- [ ] Rebuild + deploy + push to GitHub + update guide
