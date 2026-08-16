# Round 40 STATE (16 Aug 2026)

## Done
- Recharge wording: "Deposit Submitted — Processing" (auto-processing feel) in server + client.
- Notifications Hub (Admin Panel → Notifications tab): per-user boxes, activity feed (register/deposit/withdrawal/vip_purchase), unread badge, A–Z actions (approve, suspend, credit, reset password, edit, delete).
- Admin Panel visibility polish: all sections fully scrollable (horizontal + vertical overflow-safe cards).
- Hausa A–Z guide updated with SASHE 22 rows.
- Deployed to https://ai-computer-xplus-ai-fresh.pages.dev (commit f1f387d on GitHub main).
- Live verified: login 200, /api/admin/notification-hub 200 (totalUnread + hub[]), /api/tasks shows resetInHours 24 + resetAt after completion, recharge wording in live JS bundle, VIP admin completion test approved (id 11, $15 credited to admin wallet).
- GitHub sync via github_sync.py (Git Trees API, single commit, secrets redacted).

## Notes
- Live Supabase JWT secret: use JWT_SECRET_DEFAULT 'dataplus-ai-secret' unless env set.
- Cloudflare token: CFTOKEN=CFUT_TOKEN_PLACEHOLDER (redacted in repo files for secret scanning; kept live in deploy_new.py env).
- Deploy command: CFTOKEN=... python3 deploy_new.py
- Verification scripts: verify_live.py, verify_reset.py, cleanup_completion.py, inspect_hub.py
