# Admin Panel Upgrade TODO

- [x] Review existing /admin-panel page and admin API access control
- [x] Add dedicated admin-login page (email + password, /admin-login) that validates role=admin
- [x] Enforce admin-only access on /admin-panel (redirect non-admins to login)
- [x] Verify admin dashboard shows: stats, tasks CRUD, completions review, withdrawals review, users management, settings (wallets/min withdraw)
- [x] End-to-end test: register normal user (blocked from admin), admin login works, approve completion credits balance
- [x] Push update to GitHub main (commit 16af56da)
