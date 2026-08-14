# Admin Panel Upgrade TODO

- [x] Review existing /admin-panel page and admin API access control
- [x] Add dedicated admin-login page (email + password, /admin-login) that validates role=admin
- [x] Enforce admin-only access on /admin-panel (redirect non-admins to login)
- [x] Verify admin dashboard shows: stats, tasks CRUD, completions review, withdrawals review, users management, settings (wallets/min withdraw)
- [x] End-to-end test: register normal user (blocked from admin), admin login works, approve completion credits balance
- [x] Push update to GitHub main (commit 16af56da)

## New user requests (14 Aug)
- [ ] Add RECHARGE page showing admin payment wallets (TRX, BTC, USDT) with Copy + QR scan buttons
- [ ] Add Recharge link to the sidebar navigation (visible when logged in)
- [ ] Deploy updated site to Cloudflare Pages
- [ ] Set up ai-computer-xplus.is-a.dev custom domain on the Cloudflare Pages project
- [ ] Verify live site on new domain; deliver admin instructions (login, add tasks, review withdrawals)
