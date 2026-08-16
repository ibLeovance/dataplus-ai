#!/usr/bin/env python3
"""Round 40 server patch:
1. Recharge wording -> 'Deposit Submitted — Processing (auto-verified by AI system)'
2. emitAdminNotification helper + notify on key user actions (register, recharge, withdrawal, vip purchase)
3. New endpoint GET /api/admin/notification-hub (per-user activity feed for Notifications Hub tab)
"""
import re, sys

SRC = "server/worker.ts"
src = open(SRC).read()
orig = src

changes = []

# ---------- 1. notifyAllUserActions helper + usage ----------
helper = """
// Round 40: per-user activity feed for the admin Notifications Hub
async function emitAdminNotification(title: string, userId: number | null, meta?: any) {
  try {
    await db.insertNotification({ user_id: userId, title, body: meta ? JSON.stringify(meta) : undefined, kind: 'activity' });
  } catch { /* no-op */ }
}
// Round 40: record a user activity so the admin hub lists every user with an inbox
async function recordActivity(kind: string, userId: number, detail?: string) {
  try { await emitAdminNotification(`Activity: ${kind} — user #${userId}`, userId, { kind, detail: detail || '' }); } catch { /* no-op */ }
}
"""
if "emitAdminNotification(title" not in src:
    # place before the notifications GET endpoint
    anchor = "app.get('/api/admin/notifications'"
    assert anchor in src, "anchor1 missing"
    src = src.replace(anchor, helper + "\n" + anchor, 1)
    changes.append("helper added")

# ---------- 2. Recharge wording ----------
if 'Deposit submitted — admin will review your receipt' in src:
    src = src.replace('Deposit submitted — admin will review your receipt',
                      'Deposit Submitted — Processing. Our AI verification system is reviewing your receipt automatically.')
    changes.append("recharge server message updated")

# ---------- 3. Notify on recharge submit ----------
if "status: 'pending',\n    });\n    return c.json({ recharge" in src:
    src = src.replace(
        "status: 'pending',\n    });\n    return c.json({ recharge",
        "status: 'pending',\n    });\n    await recordActivity('deposit', userId, `$${amount} via ${method}`).catch(() => {});\n    return c.json({ recharge", 1)
    changes.append("recharge activity recorded")

# ---------- 4. Notify on withdrawal request ----------
if "status: 'processing',\n    });\n    await db.updateById('users', userId, {\n      available_balance" in src:
    src = src.replace(
        "status: 'processing',\n    });\n    await db.updateById('users', userId, {\n      available_balance",
        "status: 'processing',\n    });\n    await recordActivity('withdrawal', userId, `$${amount}`).catch(() => {});\n    await db.updateById('users', userId, {\n      available_balance", 1)
    changes.append("withdrawal activity recorded")

# ---------- 5. Notify on VIP purchase intent ----------
if "VIP purchase intent recorded. Recharge the plan amount" in src:
    src = src.replace(
        "return c.json({ success: true, plan, message: 'VIP purchase intent recorded. Recharge the plan amount and submit your receipt — admin approval activates your VIP tasks.' });",
        "await recordActivity('vip_purchase', userId, plan?.name || '').catch(() => {});\n    return c.json({ success: true, plan, message: 'VIP purchase intent recorded. Recharge the plan amount and submit your receipt — admin approval activates your VIP tasks.' });", 1)
    changes.append("vip purchase activity recorded")

# ---------- 6. Notification hub endpoint ----------
hub = """
// Round 40: Notifications Hub — groups all activities by user so each user gets an inbox box
app.get('/api/admin/notification-hub', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const all = await db.listAllNotifications();
    const users = await db.select('users');
    const byUser: Record<string, any[]> = {};
    const rows = [...(all || [])].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    for (const row of rows) {
      const uid = row.user_id != null ? String(row.user_id) : '__unknown';
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push({
        id: row.id,
        title: row.title || '',
        body: row.message || row.body || '',
        read: !!row.read_status,
        broadcast: row.is_broadcast,
        createdAt: row.created_at,
      });
    }
    const hub = Object.entries(byUser).map(([uid, items]) => {
      const user = users.find((u: any) => String(u.id) === uid) || null;
      return {
        userId: uid === '__unknown' ? null : Number(uid),
        userName: user ? (user.username || user.full_name || user.email || `User #${uid}`) : (uid === '__unknown' ? 'Unknown / Broadcast' : `User #${uid}`),
        userEmail: user?.email || null,
        role: user?.role || null,
        status: user?.status || user?.account_status || null,
        unread: items.filter((i: any) => !i.read).length,
        total: items.length,
        items,
      };
    }).filter((u: any) => u.total > 0)
      .sort((a: any, b: any) => b.unread - a.unread || b.total - a.total);
    const totalUnread = rows.filter((r: any) => !r.read_status).length;
    return c.json({ hub, totalUnread, total: rows.length });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});
"""
if "notification-hub" not in src:
    anchor = "app.get('/api/notifications'"
    assert anchor in src, "anchor2 missing"
    src = src.replace(anchor, hub + "\n" + anchor, 1)
    changes.append("notification-hub endpoint added")

open(SRC, "w").write(src)
print("Round 40 server patch:", changes)
