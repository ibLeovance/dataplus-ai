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
- [ ] Backend: notifications table + endpoints (broadcast to all users, per-user send, mark read, unread count)
- [ ] Backend: on-registration welcome notification (auto send to new user)
- [ ] Backend: full edit APIs in admin panel — edit any user (username, email, role, balances), edit task (all fields incl. payout amount), edit completion/withdrawal records, edit all app_settings
- [ ] Admin UI: inline edit everywhere — edit user modal, edit task modal, edit withdrawal status note, settings full edit
- [ ] Admin UI: Notifications tab — compose broadcast, see sent list, per-user send
- [ ] User side: notification bell with unread badge + notification list page/drawer
- [ ] Luxury modern UI: glassmorphism cards, gradients, smooth animations, refined typography, polished stat cards, modern login/admin pages
- [ ] Mobile check + redeploy to ai-computer-xplus-ai-fresh.pages.dev
- [ ] Push to GitHub, deliver updated guide
