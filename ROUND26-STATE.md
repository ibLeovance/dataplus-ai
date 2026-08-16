# Round 26 — Notifications table in Supabase (admin messaging to users)

User screenshot showed: Admin Panel → Send Notification dialog → "Notifications are not enabled yet — run the SQL from the admin guide in Supabase first." User wants messages from admin to reach users.

## Plan
1. Create table `notifications` in Supabase project uqtirisxgqmhxupncink (Table Editor, already opened at https://supabase.com/dashboard/project/uqtirisxgqmhxupncink/editor, table name input = "notifications").
2. Columns needed by worker (server/db.ts insertNotification): id (int8, PK, default 1 autoincrement handled by UI), user_id (int8, NULL), is_broadcast (bool default false), title (text not null), body (text default ''), kind (text default 'broadcast'), is_read (bool default false), created_at (timestamptz default now()).
3. IMPORTANT: keep RLS ENABLED but add policies (else queries return empty). Other tables are "Unrestricted". After Save, add policies via SQL Editor or UI: allow service_role everything; allow authenticated users select own rows (is_read updates). Simplest: create policy for select/insert/update/delete for authenticated + service_role.
4. Worker endpoints already exist: POST /api/admin/notifications {userId?, title, body, kind} (broadcast if no userId); GET /api/admin/notifications; DELETE /api/admin/notifications/:id; GET /api/notifications; PUT /api/notifications/:id/read.
5. UI already exists: AdminPanel notifications tab "Send Notification" (All Users / One User), user sidebar bell/inbox view.
6. After table creation: test POST /api/admin/notifications live (admin JWT, user id 30 "refltest99"), then GET /api/notifications with user JWT, verify unread count shows.
7. Deploy: cd /home/ubuntu/dataplus-ai && export CFTOKEN=CFUT_TOKEN_PLACEHOLDER && python3 deploy_new.py; GitHub sync: python3 github_sync.py
8. JWT test secret: 'dataplus-ai-secret' (HS256), claims {id, role:'admin'|'user'}. Live base: https://ai-computer-xplus-ai-fresh.pages.dev
9. Test user id 30, admin id unknown (IbrahimAdmin) — can query /api/admin/users.

## Progress
- [x] Opened Supabase Table Editor, started "Create table", name = notifications typed
- [ ] Add columns: user_id int8; is_broadcast bool; title text; body text; kind text; is_read bool (id + created_at already default)
- [ ] Uncheck RLS or add policies after save
- [ ] Save table
- [ ] Verify worker POST /api/admin/notifications live; user GET /api/notifications
- [ ] Deploy + GitHub sync
- [ ] Hausa report
