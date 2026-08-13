# Task State Reference

## Project: dataplus-ai (standalone Koyeb version)
- Path: /home/ubuntu/dataplus-ai
- Tech: React 19, Tailwind 4, Express 4, PostgreSQL (Drizzle ORM), JWT Auth
- Target domain: dataplus-ai.koyeb.app (alias for ai-computer-xplus.is-a.dev)
- GitHub: ibLeovance/dataplus-ai

## Current State (as of latest session)
- Legacy tRPC files removed: _core/, const.ts, lib/trpc.ts, AIChatBox, DashboardLayout, DashboardLayoutSkeleton, Map, ManusDialog, ErrorBoundary, ComponentShowcase, NotFound
- Admin router (server/routers/admin.ts) now has: stats, tasks CRUD, completions/pending (with joins), withdrawals (with joins), settings (hardcoded), users
- AppLayout.tsx redirect bug fixed (moved navigate to useEffect)
- Settings router (server/routers/settings.ts) has: withdraw, my-withdrawals, admin-wallets
- Withdraw.tsx uses REST API calls with useAuth from contexts/AuthContext
- AppLayout has echoeffect.top style sidebar navigation

## Admin Wallets
- TRX: TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4
- BTC: bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct
- USDT/BSC: 0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8

## WhatsApp Channel
https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i

## Done
- [x] AdminPanel.tsx fully rewritten to use REST API + AuthContext + AppLayout
- [x] AppLayout redirect bug fixed (useEffect)
- [x] Admin settings endpoints use DB persistence (settings table)
- [x] Dashboard OverviewData interface fixed (added availableBalance)
- [x] NotFound and ErrorBoundary components recreated
- [x] Removed unused files (calendar.tsx, old tRPC files)
- [x] Build works: pnpm build (vite) + pnpm build:full (full production)
- [x] Production server tested on port 4001 - HTML and API both work
- [x] Schema.ts self-reference fixed with explicit any type
- [x] Fixed vite build script (--root removed, root is in config)
- [x] Fixed static file path with multi-location fallback

## Remaining Work
3. [ ] Verify final TS compilation (should have 0 errors now)
4. [ ] Push to GitHub ibLeovance/dataplus-ai
5. [ ] Deploy to Koyeb
