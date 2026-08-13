# Koyeb Deployment Progress

## Status:
- [x] Signed up Koyeb via GitHub OAuth (ibLeovance)
- [x] Created project at /home/ubuntu/dataplus-ai
- [x] Server code: Express + PostgreSQL + JWT auth (server/routers/auth.ts, tasks.ts, referral.ts, admin.ts, settings.ts, share.ts)
- [x] Frontend: Copied from Manus project, partially converted to REST API
- [x] Dashboard.tsx - converted to REST
- [x] Login.tsx - created new
- [x] AppLayout.tsx - converted to use local AuthContext
- [x] App.tsx - routes set up
- [ ] Fix settings.ts (broken balance update, missing sql import)
- [ ] Fix Home.tsx (render-time redirect issue)
- [ ] Convert Tasks.tsx, TaskDetail.tsx, Wallet.tsx, Withdraw.tsx, Referral.tsx, AdminPanel.tsx to REST API
- [ ] Build and test
- [ ] Push to GitHub ibLeovance repo
- [ ] Deploy to Koyeb
- [ ] Configure dataplus-ai.koyeb.app domain

## Key Info:
- Koyeb account: signed up via GitHub ibLeovance
- Target domain: dataplus-ai.koyeb.app
- Admin wallet addresses:
  - BTC: bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct
  - TRX: TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4
  - BSC: 0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8
- WhatsApp Channel: https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i
- Website name: AI COMPUTER PLUS
- echoeffect.top style (light bg, red accent, sidebar nav)

## Remaining Pages to Convert (from tRPC to REST):
1. Tasks.tsx - uses trpc.tasks.list
2. TaskDetail.tsx - uses trpc.tasks.detail, trpc.taskCompletion.submit
3. Wallet.tsx - uses trpc.profile.get, trpc.profile.update
4. Withdraw.tsx - uses trpc.dashboard.overview, trpc.withdrawals.myWithdrawals, trpc.admin.settings.list
5. Referral.tsx - uses trpc.referral.setup, trpc.share.links, trpc.referral.myReferrals
6. AdminPanel.tsx - uses trpc.admin.*

## Server REST Endpoints (defined):
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/overview
- GET /api/tasks
- GET /api/tasks/:id
- POST /api/tasks/complete
- GET /api/tasks/my-completions
- GET /api/referral/my
- POST /api/referral/register-with-code
- GET /api/admin/tasks
- POST /api/admin/tasks
- PUT /api/admin/tasks/:id
- DELETE /api/admin/tasks/:id
- GET /api/admin/completions/pending
- PUT /api/admin/completions/:id/review
- GET /api/admin/withdrawals
- PUT /api/admin/withdrawals/:id
- GET /api/admin/users
- PUT /api/admin/users/:id/role
- POST /api/settings/withdraw
- GET /api/settings/my-withdrawals
- GET /api/settings/admin-wallets
- GET /api/share/links

## Settings keys needed:
- min_withdraw
- btc_wallet
- trx_wallet
- bsc_wallet
- referral_bonus
