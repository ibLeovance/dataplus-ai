# Round 41 Implementation Notes (16 Aug 2026)

## Project location
- Server/client: /home/ubuntu/dataplus-ai repo (NOT the webdev template). AdminPanel.tsx is at client/src/pages/AdminPanel.tsx (~2350 lines now).
- Deploy: `CFTOKEN=CFUT_TOKEN_PLACEHOLDER python3 deploy_new.py` (in /home/ubuntu/dataplus-ai)
- GitHub sync: `python3 github_sync.py` (contents API; strips secrets from deploy_new.py + JAGORAR guide before push)
- Live: https://ai-computer-xplus-ai-fresh.pages.dev ; admin creds: Bitcoinxml2000@proton.me / Ibrahim@2121
- Verify scripts in repo: verify_live.py, verify_reset.py, cleanup_completion.py, inspect_hub.py

## Requirements (user, Round 41)
1. Self Deduction (Unlimited) per user in Hub — DONE client (Deduct dialog in UserHubBox lines ~29-49, routes via /deduct endpoint when balance decreasing in handleHubEdit lines ~385-414) + server POST /api/admin/users/:id/deduct (worker ~1672)
2. Funding + Bots tabs must show in Admin Panel — tabs already exist in source (tabs list ~600, FundingTab ~2088, BotsTab ~2200). User said he can't see them; verify rendering. NOTE: FundingTab expects /api/admin/funding endpoints — worker has them (funding ledger etc.) from Round 32; BotsTab uses /api/admin/bots endpoints.
3. Withdrawals one-click approve — DONE (button text now "Approve / Mark Paid", lines ~768-774; handlePayWithdrawal already sets status=paid)
4. Hub unlimited edit A-Z — DONE (Edit A-Z button + HubEditForm component at lines ~101-164; fields username/email/balance/totalEarned/wallets/role; save goes to PUT /api/admin/users/:id)
5. Hub read-state: items hide after admin reviews, reappear on new activity — DONE (POST /api/admin/notification-hub/review server at ~1853; client button "Mark All Reviewed" lines ~932-934; also markHubReviewed callback ~421-429)
6. Task review auto for every user — DONE (POST /api/admin/completions/review-all server ~1383; client buttons "Auto-Approve All Pending"/"Reject All Pending" ~661-674)
7. Recharge Approved/Rejected/Invalid — server invalid added ~2050 + notifications per branch + admin hub emit at decision ~2243-2251; client AdminDeposits: handler+badge done ~1451/1475, BUTTON "Invalid" still missing at ~1530-1550 (add it)
8. Withdrawal decisions also emit admin hub notification — DONE ~1508-1514
9. Hausa guide update + final Hausa report

## Remaining TODO
- Tabs verified present (funding/bots at 718-719; all tabs ok)
- Invalid button: AdminDeposits pending actions are around lines 1695-1720 (after the earlier 30-line shift from edits) — find `{(r.status === "pending") && (` block and add Invalid button next to Reject
- [ ] Add "Invalid" button in AdminDeposits pending actions (after Reject button ~line 1547 area)
- [ ] Check tabs list includes funding/bots (grep TabsTrigger funding/bots) — verify rendering with screenshot
- [ ] Typecheck client (pnpm exec tsc --noEmit or check build:client script in package.json)
- [ ] Build worker: pnpm build:worker (or whatever build:worker is in package.json)
- [ ] Deploy via deploy_new.py with fresh token
- [ ] Live verify: notification-hub 200, review-all endpoint, deduct endpoint, invalid decision, funding/bots endpoints
- [ ] GitHub sync + Hausa guide JAGORAR update + RAHOTO_ROUND41_HAUSA.md deliverable

## Key endpoints (worker.ts line approx)
- 1383 POST /api/admin/completions/review-all {mode}
- 1496 PUT /api/admin/withdrawals/:id (now emits hub notification)
- 1672 POST /api/admin/users/:id/deduct {amount, reason}
- 1853 POST /api/admin/notification-hub/review {userId?}
- 2146 PUT /api/admin/recharges/:id/decision {decision: approved|rejected|invalid, note} (+ hub emit after)
- AdminPanel tabs: value="completions|withdrawals|users|notifications|deposits|settings|funding|bots" (verify at ~600)
