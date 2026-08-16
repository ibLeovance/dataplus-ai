# Round 25 — Per-plan VIP tasks on Task page, VIP/Free split on dashboard

User (Hausa, paraphrased):
1. Each VIP plan's tasks should show on the Task page with their own plan structure.
2. Task completion must proceed in order: the VIP finishes his own tasks in sequence — when all VIP tasks for the day are done, the queue resets ("jere" = in a row/queue).
3. When the VIP task is done, the money appears on his dashboard.
4. Dashboard must separate: completed VIP approved / VIP (separate) / Free (separate) — everything distinct.
5. VIP task submissions should ALSO go through pending review like free tasks (not instant auto-approve — admin approves).
6. Each VIP task card shows: the plan it belongs to, purchase amount, max daily earn, total tasks for the plan.

## Design decisions (agent)
- /api/tasks/daily-task: add per-task-level data: include `status` per completion and VIP vs free split counts. Keep backward compatible (vip, completedToday, limit, rewardEach) + new fields: completedVipToday, completedFreeToday (from my-completions filtered by funding), pendingVipToday.
- Backend: change /api/tasks/complete so VIP funding submissions still get paid? NO — user now wants VIP tasks pending review like free. Change funding === 'user' path: status = 'pending' (admin approved later via admin panel). BUT previous round said VIP pays directly... Round 25 overrides: VIP tasks go to pending reviews "kamar yadda free yake" (like free does). Admin approves → credits user balance via existing admin approval path (if not, add credit on approve).
- Need to verify admin approval endpoint credits user balance. In worker: admin decision endpoint likely /api/completions/:id/decision or similar with approve status → need to ensure it credits available_balance for the completion's user.
- /api/tasks: add plan info to video tasks if user has VIP: mark tasks with the VIP plan that pays them (task cards on /tasks show plan badge, purchase amount, max daily earn, total tasks).
- Task page (/tasks): separate section "VIP Tasks — [plan]" when active VIP: sequential queue: task list ordered; current task highlighted; next unlocks only after current done (per-day queue resets after all completed).
- Dashboard (/dashboard): stats split → Total Earned (all), Available Balance, Completed Tasks (free) + VIP Approved (separate card), Pending Review (free) + VIP Pending (separate). Recent activity labels VIP vs Free.
- Task card on /tasks shows per-plan info: "VIP Gold • $100 • Max daily earn $22 • Total 10 tasks".

## Key facts from code
- completions table has funding ('user' VIP-paid, 'admin' free) and status (approved/pending/rejected/admin_credited).
- vip_purchases setting JSON; vip plans setting: depositAmount, dailyEarnRate, taskAmount, maxDailyTasks, validityDays.
- /api/tasks/complete: VIP users currently get instant credit; need pending + credit-on-approve.
- /api/tasks/my-completions: returns rows with task_title; funding column returned too (toCamel: funding).
- Admin approvals in AdminPanel.tsx: check endpoint name before editing worker.
- Deploy: export CFTOKEN=CFUT_TOKEN_PLACEHOLDER && python3 deploy_new.py; GitHub sync: python3 github_sync.py
