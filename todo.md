# Admin Panel Upgrade TODO

- [ ] Review existing /admin-panel page and admin API access control
- [ ] Add dedicated admin-login page (email + password, /admin-login) that validates role=admin
- [ ] Enforce admin-only access on /admin-panel (redirect non-admins to login)
- [ ] Verify admin dashboard shows: stats, tasks CRUD, completions review, withdrawals review, users management, settings (wallets/min withdraw)
- [ ] End-to-end test: register normal user (blocked from admin), admin login works, approve completion credits balance
- [ ] Push update to GitHub main
