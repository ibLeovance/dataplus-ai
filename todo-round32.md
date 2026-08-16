
# Round 37 TODO — Wire Real Ad-Network Accounts

- [x] Adsterra: login publishers.adsterra.com (BitcoinXML2000@proton.me / Ibrahim2020), capture Account ID, status, site, payout info
- [x] Monetag: login publishers.monetag.com (same creds), capture Account ID, status, payout info
- [x] PropellerAds: login propellerads.com (same creds), capture Account ID, status
- [x] AdSense: verify pl716290@gmail.com pub-7795946429116992 / customer ID 1710644269
- [x] AdMob: verify pub-2898818886549735 / AdSense customer 630-436-9336
- [x] Update Admin Panel Funding tab (Ad-Network Channels) with verified account IDs/settings
- [x] Build + deploy + live verify + report in Hausa

# Round 38 TODO — Finish remaining ad-network setup (user authorized)
- [x] Adsterra: user added website ai-computer-xplus-ai-fresh.pages.dev (confirmed by user Aug 15)
- [x] PropellerAds: user logged in on phone; Account ref set (bitcoinxml2000@proton.me) pending numeric ID
- [x] AdSense: pub-7795946429116992 wired + enabled (user login on phone)
- [x] AdMob: pub-2898818886549735 wired + enabled (user login on phone)
- [x] Update live site records with extracted IDs (PUT /api/admin/ad-payment-channels — verified via read-back)
- [x] Live verify (homepage 200, manifest 200, funding ledger 200) + report in Hausa

# Round 39 TODO — 24h Reset + Tiered Video Pools + Arranged Ad-Network Tasks — COMPLETE
- [x] Server: tasks GET returns resetIn (24h countdown), task tier + category type badges
- [x] Server: vipVideoPool + freeVideoPool settings served via daily-task and tasks endpoints
- [x] Server: import-ad-tasks admin endpoint (templates per enabled ad-network channel, dedup by title, dryRun support)
- [x] Server: funding + funding-channels + bots + bots/run + bots/config admin endpoints
- [x] Client: Tasks.tsx shows Video/Survey/Share/App Install badges, countdown chip, ad-source chips
- [x] Client: AdminPanel Funding + Bots tabs + Import Ad-Network Tasks button (tsc clean)
- [x] Deployed to Cloudflare Pages (commit Round39, deployment 66e79fdb, SPA index-B60s3XLv.js)
- [x] Live verified: admin endpoints respond with auth gate, type badges present in deployed bundle
- [x] Deliver Hausa report

# Round 40 TODO — Recharge Wording + Admin Notifications Hub
- [x] Recharge wording: after submit show "Deposit Submitted — Processing" style (auto feel), remove "wait for admin to approve" wording
- [x] Server: notify endpoint for all user actions (register, recharge, withdrawal, task, vip purchase) → admin notification feed
- [x] Admin Panel: Notifications Hub tab — per-user boxes, auto-added for new users, total badge, actions per user (edit, approve, reject, suspend, credit, etc.) A–Z
- [x] Admin Panel visibility polish: ensure all sections fully scrollable/visible (swipe down/up/both)
- [x] Update Hausa A-Z guide in Admin Panel with new rows (recharge wording, Notifications Hub)
- [x] Build + deploy (Round 40 commit f1f387d) + live verify (notification-hub 200, 24h resetInHours confirmed, recharge wording in bundle) + Hausa report

# Round 41 TODO — Admin Panel: Self Deduction, Funding/Bots Restore, Withdrawal Approve, Hub Unlimited Edit, Task Review Automation
- [x] Admin → Self Deduction (Unlimited) per user: deduct any amount from any user's balance (like Self Top Up unlimited but reverse)
- [x] Restore Funding tab + Bots tab + Import Ad-Network Tasks button in Admin Panel (was in Round 39, may be hidden by tab restructure)
- [x] Withdrawals tab: one-click Approve button per row (approve directly without dialog where possible)
- [x] Notifications Hub: unlimited edit of every user field (A–Z) that reflects in their account
- [x] Notifications Hub: notifications auto-mark read / hide after admin views; unread badge updates; reappear when new activity arrives
- [x] Task review: fully automatic for every user (approved flow verified working)
- [x] Recharge decisions: Approved / Rejected / Invalid statuses; admin gets notification when recharge decision is made
- [x] Update Hausa A–Z guide with Round 41 rows
- [x] Build + deploy + live verify + Hausa report

# Round 42 TODO — Register & Login Upgrade (ƘARI KAWAI, ba rage komai ba)
- [x] Audit current Register page: country dropdown default, phone prefix, referral auto-fill, password view
- [x] Audit current Login page: email/phone/username, country select, password view
- [x] Enhance Register: validation hints, strength meter, inline errors in Hausa+English
- [x] Enhance Login: remember-me, inline errors, security badge
- [x] Preserve ALL existing features untouched (24h reset, tiered pools, admin hub, funding, bots)
- [x] Build + deploy + live verify + Hausa report
