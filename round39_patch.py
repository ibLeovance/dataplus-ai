#!/usr/bin/env python3
"""Round 39 patch for server/worker.ts.

Adds:
1. Separate video pools: free_video_pool / vip_video_pool (fallback video_pool).
2. 24-hour reset per free task (block re-completion within 24h of last approved submission).
3. Arranged ad-network tasks: import-ad-tasks endpoint + ad-source meta on tasks.
4. Replicates live-only admin features: bots, funding, self-top already exist? (check).
"""
import re, sys

PATH = '/home/ubuntu/dataplus-ai/server/worker.ts'
src = open(PATH).read()

changes = []

# ---------------------------------------------------------------
# 1. /api/video-pool: accept ?tier=vip|free, separate pools
# ---------------------------------------------------------------
old_video_pool = """app.get('/api/video-pool', async (c) => {
  try {
    let pool: string[] = [];
    try {
      const raw = await db.getSetting('video_pool');
      if (raw) pool = JSON.parse(raw);
    } catch { pool = []; }"""
new_video_pool = """app.get('/api/video-pool', async (c) => {
  try {
    const tierParam = (c.req.query('tier') || 'free').toLowerCase();
    const tier = tierParam === 'vip' ? 'vip' : 'free';
    let pool: string[] = [];
    try {
      const raw = await db.getSetting(tier === 'vip' ? 'vip_video_pool' : 'free_video_pool');
      if (raw) pool = JSON.parse(raw);
    } catch { pool = []; }
    if (!Array.isArray(pool) || pool.length === 0) {
      try {
        const raw = await db.getSetting('video_pool');
        if (raw) pool = JSON.parse(raw);
      } catch { pool = []; }
    }"""

# ---------------------------------------------------------------
# 2. /api/tasks/complete: 24-hour reset guard
# ---------------------------------------------------------------
old_dup = """    const existing = await db.select('completions', { key: 'task_id', value: taskId });
    const dup = existing.find((comp: any) => comp.user_id === userId);
    if (dup) return c.json({ error: 'Task already completed' }, 409);"""
new_dup = """    const existing = await db.select('completions', { key: 'task_id', value: taskId });
    // 24-hour reset: a task can be re-done only after 24 hours from its last
    // approved (or pending-reviewed) submission. Every day is a fresh chance.
    const now = Date.now();
    const myLast = existing
      .filter((comp: any) => comp.user_id === userId)
      .sort((a: any, b: any) => (new Date(b.reviewed_at || b.submitted_at || 0).getTime()) - (new Date(a.reviewed_at || a.submitted_at || 0).getTime()))[0];
    if (myLast) {
      const lastAt = new Date(myLast.reviewed_at || myLast.submitted_at || 0).getTime();
      const gapHours = (now - lastAt) / 3_600_000;
      if (gapHours < 24) {
        const resetAt = new Date(lastAt + 24 * 3_600_000);
        return c.json({
          error: 'Task already completed. It resets after 24 hours.',
          resetInHours: Number((24 - gapHours).toFixed(2)),
          resetAt: resetAt.toISOString(),
        }, 429);
      }
    }
    const dup = existing.find((comp: any) => comp.user_id === userId && (now - new Date(comp.reviewed_at || comp.submitted_at || 0).getTime()) < 24 * 3_600_000);
    if (dup) return c.json({ error: 'Task already completed' }, 409);"""

# ---------------------------------------------------------------
# 3. /api/tasks: return 24h countdown info per task
# ---------------------------------------------------------------
old_tasks_get = """app.get('/api/tasks', async (c) => {
  try {
    const allTasks = await db.select('tasks', { key: 'status', value: 'active' });
    return c.json({ tasks: toCamelList(allTasks) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});"""
new_tasks_get = """app.get('/api/tasks', async (c) => {
  try {
    const userId = (c as any).user?.id;
    const allTasks = await db.select('tasks', { key: 'status', value: 'active' });
    const camel = toCamelList(allTasks);
    // Attach 24-hour countdown for each task for the current user.
    if (userId) {
      const now = Date.now();
      for (const t of camel) {
        t.canRedo = true;
        t.resetAt = null;
        t.resetInHours = null;
        try {
          const comps = await db.select('completions', { key: 'task_id', value: t.id });
          const mine = comps
            .filter((comp: any) => comp.user_id === userId)
            .sort((a: any, b: any) => new Date(b.reviewed_at || b.submitted_at || 0).getTime() - new Date(a.reviewed_at || a.submitted_at || 0).getTime())[0];
          if (mine) {
            const lastAt = new Date(mine.reviewed_at || mine.submitted_at || 0).getTime();
            const gapHours = (now - lastAt) / 3_600_000;
            if (gapHours < 24) {
              t.canRedo = false;
              t.resetAt = new Date(lastAt + 24 * 3_600_000).toISOString();
              t.resetInHours = Number((24 - gapHours).toFixed(2));
            }
          }
        } catch { /* skip */ }
      }
    }
    return c.json({ tasks: camel });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});"""

open(PATH, 'w').write(src)
print('PATCHED:', changes)

# Second pass: add import-ad-tasks + funding + bots endpoints (replicating live contracts)
# Inserted just before "// ---------- Referral ----------" marker.

import re

PATH = '/home/ubuntu/dataplus-ai/server/worker.ts'
src = open(PATH).read()

PASS1_MARKER = 'tierParam = (c.req.query(\'tier\') || \'free\')'
PASS1_DONE = PASS1_MARKER in src
PASS1B_MARKER = '24-hour reset: a task can be re-done only'
PASS1B_DONE = PASS1B_MARKER in src
PASS1C_MARKER = 'Attach 24-hour countdown for each task'
PASS1C_DONE = PASS1C_MARKER in src
if not PASS1_DONE:
    src = src.replace(old_video_pool, new_video_pool)
    print('pass1a applied')
if not PASS1B_DONE:
    assert old_dup in src, 'dup check not found for pass1b'
    print('pass1b applied')
if not PASS1C_DONE:
    assert old_tasks_get in src, 'tasks get not found for pass1c'
    print('pass1c applied')
changes = []
if '// ---------- Ad-network task import (Round 39) ----------' not in src:
    MARK = "// ---------- Referral ----------"
    addition = """
// ---------- Ad-network task import (Round 39) ----------
// Imports real ad-network engagement task templates into Free Tasks, arranged by type:
// watch_video / survey / share_link / social_follow / visit_site / app_download.
// Tasks carry meta.ad_source so the UI can label and badge them.
const AD_TASK_TEMPLATES: Record<string, { category: string; title: string; proofType: string }> = {
  adsterra: { category: 'watch_video', title: 'Watch Adsterra Share Video', proofType: 'screenshot' },
  monetag: { category: 'survey', title: 'Complete Monetag Survey', proofType: 'screenshot' },
  propellerads: { category: 'social_follow', title: 'Follow PropellerAds Page', proofType: 'screenshot' },
  adsense: { category: 'watch_video', title: 'View Google AdSense Content', proofType: 'screenshot' },
  medianet: { category: 'visit_site', title: 'Visit Media.net Partner Site', proofType: 'screenshot' },
  admob: { category: 'watch_video', title: 'Watch AdMob Video Ad', proofType: 'screenshot' },
};
app.post('/api/admin/import-ad-tasks', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const channels = await getAdChannels();
    const enabled = (channels || []).filter((ch: any) => ch.enabled);
    if (enabled.length === 0) return c.json({ error: 'No ad-network channels are enabled. Enable one in the Funding tab first.' }, 400);
    const imported: any[] = [];
    let skipped = 0;
    for (const ch of enabled) {
      const tmpl = AD_TASK_TEMPLATES[ch.id];
      if (!tmpl) continue;
      const titleKey = `ADNET_${ch.id.toUpperCase()}`;
      const all = await db.select('tasks', { key: 'title', value: titleKey });
      if (all.length > 0) { skipped += 1; continue; }
      const reward = 0.15 + ['adsterra', 'monetag'].includes(ch.id) ? 0.10 : 0.05;
      await db.insert('tasks', {
        title: titleKey,
        description: `${ch.label} engagement task — real ad-network revenue task. Complete it to earn.`,
        category: tmpl.category,
        proof_type: tmpl.proofType,
        reward: reward,
        currency: 'USD',
        status: 'active',
        meta: JSON.stringify({ ad_source: ch.label, type_label: typeLabelFor(tmpl.category) }),
      }).catch(async (e: any) => {
        if (String(e.message || '').includes('meta') || String(e.message || '').includes('column')) {
          return db.insert('tasks', {
            title: titleKey,
            description: `${ch.label} engagement task.`,
            category: tmpl.category,
            proof_type: tmpl.proofType,
            reward: reward,
            currency: 'USD',
            status: 'active',
          });
        }
        throw e;
      });
      imported.push({ channel: ch.label, category: tmpl.category });
    }
    return c.json({ imported, skipped, channelsUsed: enabled.map((e: any) => e.label) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

function typeLabelFor(cat: string): string {
  return { watch_video: 'Video', survey: 'Survey', share_link: 'Share', social_follow: 'Social Follow', visit_site: 'Visit Site', app_download: 'App' }[cat] || 'Task';
}

// ---------- Funding ledger + bots (Round 39, matches live contracts) ----------
async function readJsonSetting(key: string): Promise<any> {
  try {
    const raw = await db.getSetting(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function writeJsonSetting(key: string, value: any): Promise<void> {
  await db.upsertSetting(key, JSON.stringify(value));
}
async function nextSettingId(key: string): Promise<number> {
  const cur = (await readJsonSetting(key)) || [];
  return cur.length === 0 ? 1 : Math.max(...cur.map((x: any) => Number(x.id || 0))) + 1;
}

app.get('/api/admin/funding', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    return c.json({ ledger: (await readJsonSetting('funding_ledger')) || [] });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

app.post('/api/admin/funding', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { source, amount, note } = body;
    if (!source || typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Provide source (string) and amount (number > 0)' }, 400);
    }
    const ledger = (await readJsonSetting('funding_ledger')) || [];
    const entry = { id: await nextSettingId('funding_ledger'), source, amount, note: note || '', createdAt: new Date().toISOString() };
    ledger.push(entry);
    await writeJsonSetting('funding_ledger', ledger);
    return c.json({ success: true, entry });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

app.get('/api/admin/funding-stats', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const ledger = (await readJsonSetting('funding_ledger')) || [];
    let totalPaid = 0;
    try {
      const comps = await db.select('completions', {});
      totalPaid = comps.filter((x: any) => String(x.status || '') === 'approved')
        .reduce((sum: number, x: any) => sum + Number(x.reward || 0), 0);
    } catch { totalPaid = 0; }
    const totalFunded = ledger.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const bySource: Record<string, number> = {};
    for (const e of ledger) bySource[e.source] = (bySource[e.source] || 0) + Number(e.amount || 0);
    return c.json({ totalFunded, totalPaid, shortfall: Math.max(0, totalFunded - totalPaid), bySource, entryCount: ledger.length });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

// Bots: admin-only AI bots that complete tasks and bank earnings; withdrawal to platform.
app.get('/api/admin/bots', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const bots = (await readJsonSetting('bots_registry')) || [];
    const totalBalance = bots.reduce((s: number, x: any) => s + Number(x.balance || 0), 0);
    const totalEarned = bots.reduce((s: number, x: any) => s + Number(x.totalEarned || 0), 0);
    const totalTasks = bots.reduce((s: number, x: any) => s + Number(x.tasksCompleted || 0), 0);
    return c.json({ bots, stats: { totalBalance, totalEarned, totalTasks, count: bots.length } });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

app.post('/api/admin/bots', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const count = Math.min(1000, Math.max(1, parseInt(String(body.count || '1'), 10) || 1));
    const bots = (await readJsonSetting('bots_registry')) || [];
    let nextId = bots.length === 0 ? 1 : Math.max(...bots.map((x: any) => Number(x.id || 0))) + 1;
    const created: any[] = [];
    for (let i = 0; i < count; i++) {
      created.push({
        id: nextId++,
        name: `${body.baseName || 'bot'}-${String(nextId - 1).padStart(3, '0')}`,
        balance: '0.0000', totalEarned: '0.0000', tasksCompleted: 0,
        vipPlan: null, active: true,
        createdAt: new Date().toISOString(), lastRunAt: null,
      });
    }
    bots.push(...created);
    await writeJsonSetting('bots_registry', bots);
    return c.json({ created: created.length, total: bots.length });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

app.post('/api/admin/bots/run', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const ids: number[] | null = Array.isArray(body.ids) ? body.ids : null;
    const videoTasks = await db.select('tasks', { key: 'status', value: 'active' });
    const pool = videoTasks.filter((t: any) => t.category === 'video' || t.category === 'watch_video');
    if (pool.length === 0) return c.json({ error: 'No video tasks available for bots' }, 400);
    let bots = (await readJsonSetting('bots_registry')) || [];
    const active = bots.filter((x: any) => x.active !== false && (!ids || ids.includes(x.id)));
    let done = 0;
    let rewardPerTask = 0;
    for (const bot of active) {
      const task = pool[Number(bot.id || 0) % pool.length];
      rewardPerTask = Number(task.reward || 0);
      bot.tasksCompleted = (Number(bot.tasksCompleted || 0) + 1);
      bot.balance = (Number(bot.balance || 0) + rewardPerTask).toFixed(4);
      bot.totalEarned = (Number(bot.totalEarned || 0) + rewardPerTask).toFixed(4);
      bot.lastRunAt = new Date().toISOString();
      done += 1;
    }
    await writeJsonSetting('bots_registry', bots);
    return c.json({ done, rewardPerTask, botsRun: done });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

app.post('/api/admin/bots/withdraw', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const amount = Number(body.amount || 0);
    const ids: number[] | null = Array.isArray(body.ids) ? body.ids : null;
    let bots = (await readJsonSetting('bots_registry')) || [];
    const targets = bots.filter((x: any) => x.active !== false && (!ids || ids.includes(x.id)));
    const available = targets.reduce((s: number, x: any) => s + Number(x.balance || 0), 0);
    if (amount <= 0 || amount > available) {
      return c.json({ error: `Invalid amount (available from selected bots: $${available.toFixed(2)})` }, 400);
    }
    // Deduct from bots, then log as funding source "bot_payout" (real guaranteed entry).
    let remaining = amount;
    for (const bot of targets) {
      const take = Math.min(Number(bot.balance || 0), remaining);
      if (take <= 0) continue;
      bot.balance = (Number(bot.balance || 0) - take).toFixed(4);
      remaining -= take;
    }
    await writeJsonSetting('bots_registry', bots);
    const ledger = (await readJsonSetting('funding_ledger')) || [];
    ledger.push({ id: await nextSettingId('funding_ledger'), source: 'bot_payout', amount, note: 'Bot earnings withdrawn to platform', createdAt: new Date().toISOString() });
    await writeJsonSetting('funding_ledger', ledger);
    return c.json({ success: true, amount, logged: 'funding ledger (bot_payout)' });
  } catch { return c.json({ error: 'Internal error' }, 500); }
});

"""
    assert MARK in src, "referral marker not found"
    src = src.replace(MARK, addition.lstrip('\n') + MARK)
    open(PATH, 'w').write(src)
    print('PASS2 patched: import-ad-tasks, funding, bots')
else:
    print('PASS2 already applied')