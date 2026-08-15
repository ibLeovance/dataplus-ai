# Round 19 — Withdrawal $15 auto-approve (15 Aug)

## User request
User (admin, IbrahimAdmin id=14) withdrew $15 (withdrawal id=12, also id=13 = another $15, plus older ids 10,11 $5 each). All status="processing". Asked: "na cire 15$ yana pending ni zanyi approved ko kaine" — wants withdrawal approved.

## Key facts
- Live site: https://ai-computer-xplus-ai-fresh.pages.dev
- Project is the OLD Cloudflare Pages Hono+Supabase setup at /home/ubuntu/dataplus-ai (NOT the manus webdev project at /home/ubuntu/task-earn-platform — different infra, do not confuse)
- This project has NO scheduled-cron/heartbeat in worker; no auto-approve timer exists. Withdrawals stay "processing" until admin approves them via Admin Panel Withdrawals tab (UI: change status to paid + tx hash) OR direct DB edit.
- Round 14 design: auto-approve within 10 minutes was implemented... but current code shows NO auto-approve (verify: grep autoApprove in worker.ts returned nothing). User's withdrawals pending = expected; admin must approve via UI or we update DB.
- Supabase: url https://uqtirisxgqmhxupncink.supabase.co, service role key in scripts/ (see ROUND17-STATE.md for redacted note). Users table withdrawals rows: columns id,user_id,amount,currency,wallet_address,fee,status,tx_hash,requested_at,processed_at.
- To approve: update withdrawals set status='paid', tx_hash='<TRX tx hash>', processed_at=now where id in (12).
- After approving, balance already deducted at withdraw time (correct).
- Also note: there are now TWO $15 withdrawals (id 12, id 13) both processing. id 13 came from user's own UI attempt (he said "na cire 15$").

## Todo status (todo.md at repo root)
- Round 18 all done [x]
- Round 19 items: approve withdrawal id 12/13, verify status, report. (mark [x] after)

## Workflow after fixing
- Deploy if code changes: cd /home/ubuntu/dataplus-ai && export CFTOKEN="..." (token in ROUND17-STATE.md, redacted in git; live env has it?) then python3 deploy_new.py; then commit + push (keep secrets out of git).
- Report to user in Hausa.
