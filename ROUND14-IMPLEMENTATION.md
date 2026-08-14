# Round 14 Implementation Plan

Storage decision (per CF-PORT-NOTES line 169): no raw SQL API on managed Supabase, so:
- VIP plans catalog → app_settings row key `vip_plans` (JSON array)
- VIP purchases → app_settings row key `vip_purchases` (JSON array)
- Withdrawal PIN already in `withdraw_pins` (app_settings)

VIP packages:
| Plan | Deposit | Daily earn | Task amount | Max daily | Validity | Status |
|---|---|---|---|---|---|---|
| Bronze | $5 | $0.08 | $0.10 | 5 | 60d | active |
| Silver | $50 | $1.00 | $1.20 | 8 | 60d | active |
| Gold | $100 | $2.20 | $2.60 | 10 | 120d | active |
| Platinum | $300 | $7.50 | $8.00 | 12 | 120d | active |
| Diamond | $500 | $14.00 | $15.00 | 15 | 240d | active |
| Elite | $1000 | $35.00 | $38.00 | 20 | 365d | not_yet_active |

Endpoints:
- GET /api/vip-plans → catalog
- POST /api/vip-plans/purchase {planId} → creates purchase (marks deposit_amount + has_recharged on user), starts VIP tasks
- GET /api/vip-my → user's active VIP plan + days remaining
- Task complete: if VIP active, pay task_amount of plan; else free-task reward goes to ADMIN account (not user wallet). Free-task completions get status 'admin_funded'.
- Withdrawal: require withdraw PIN (body.pin verified against withdraw_pins), fee 5% auto, withdrawals auto-set 'processing' initially, admin review still possible.
- Admin Panel: new per-user detail modal with phone, email, country, register time, tasks done, tasks approved, deposits, withdrawals, VIP plan, PIN-set flag; admin can add money etc.

UI:
- Withdraw.tsx: remove the 3 admin wallet QR/copy blocks; add PIN input before submit
- New VipTask.tsx page + route /vip; nav item "VIP Task" (gold icon)
- AdminPanel: users tab enhanced detail modal
