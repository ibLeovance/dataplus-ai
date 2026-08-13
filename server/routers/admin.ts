import { Router } from 'express';
import { db } from '../db';
import { tasks, taskCompletions, withdrawals, users, settings } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_SETTINGS: Record<string, string> = {
  btc_wallet: 'bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct',
  trx_wallet: 'TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4',
  bsc_wallet: '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
  bnb_wallet: '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
  min_withdraw: '5.00',
  referral_bonus_pct: '10',
};

async function getSetting(key: string): Promise<string> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    return rows[0]?.value || DEFAULT_SETTINGS[key] || '';
  } catch {
    return DEFAULT_SETTINGS[key] || '';
  }
}

async function setSetting(key: string, value: string): Promise<void> {
  try {
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  } catch (err) {
    console.error(`Failed to set setting ${key}:`, err);
  }
}

function adminGuard(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

export const router = Router();

// Stats
router.get('/stats', adminGuard, async (req, res) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(taskCompletions).where(eq(taskCompletions.status, 'approved'));
    const [pendingWd] = await db.select({ count: sql<number>`count(*)` }).from(withdrawals).where(eq(withdrawals.status, 'pending'));
    const [totalEarned] = await db.select({ total: sql<string>`COALESCE(SUM(amount), '0')` }).from(withdrawals).where(eq(withdrawals.status, 'paid'));

    res.json({
      totalUsers: userCount.count || 0,
      completedTasks: completedCount.count || 0,
      pendingWithdrawals: pendingWd.count || 0,
      totalEarned: totalEarned.total || '0',
    });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

// Task management
router.post('/tasks', adminGuard, async (req, res) => {
  try {
    const { title, description, category, reward, currency, timeLimit, requiredProof, imageUrl } = req.body;
    const [task] = await db.insert(tasks).values({
      title, description, category, reward, currency, timeLimit, requiredProof, imageUrl: imageUrl || '',
    }).returning();
    res.json({ task });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/tasks', adminGuard, async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks);
    res.json({ tasks: allTasks });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.put('/tasks/:id', adminGuard, async (req, res) => {
  try {
    await db.update(tasks).set(req.body).where(eq(tasks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.delete('/tasks/:id', adminGuard, async (req, res) => {
  try {
    await db.delete(tasks).where(eq(tasks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

// Completion review
router.get('/completions/pending', adminGuard, async (req, res) => {
  try {
    const pending = await db.select().from(taskCompletions).where(eq(taskCompletions.status, 'pending'));
    // Enrich with task and user info
    const enriched = [];
    for (const comp of pending) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, comp.taskId));
      const [user] = await db.select().from(users).where(eq(users.id, comp.userId));
      enriched.push({
        ...comp,
        taskTitle: task?.title || 'Unknown Task',
        userName: user?.username || 'Unknown',
        userEmail: user?.email || '',
      });
    }
    res.json({ completions: enriched });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.put('/completions/:id/review', adminGuard, async (req, res) => {
  try {
    const { status } = req.body;
    const [completion] = await db.select().from(taskCompletions).where(eq(taskCompletions.id, parseInt(req.params.id)));
    if (!completion) return res.status(404).json({ error: 'Not found' });

    await db.update(taskCompletions)
      .set({ status, reviewedAt: new Date() })
      .where(eq(taskCompletions.id, completion.id));

    if (status === 'approved') {
      await db.update(users)
        .set({ totalEarned: sql`${users.totalEarned} + ${completion.reward}`, availableBalance: sql`${users.availableBalance} + ${completion.reward}` })
        .where(eq(users.id, completion.userId));
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

// Withdrawal management
router.get('/withdrawals', adminGuard, async (req, res) => {
  try {
    const all = await db.select().from(withdrawals);
    // Enrich with user info
    const enriched = [];
    for (const wd of all) {
      const [user] = await db.select().from(users).where(eq(users.id, wd.userId));
      enriched.push({ ...wd, userName: user?.username || 'Unknown', userEmail: user?.email || '' });
    }
    res.json({ withdrawals: enriched });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.put('/withdrawals/:id', adminGuard, async (req, res) => {
  try {
    const { status, txHash } = req.body;
    await db.update(withdrawals)
      .set({ status, txHash: txHash || '', processedAt: new Date() })
      .where(eq(withdrawals.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

// Settings management
router.get('/settings', adminGuard, async (req, res) => {
  try {
    const btcWallet = await getSetting('btc_wallet');
    const trxWallet = await getSetting('trx_wallet');
    const bnbWallet = await getSetting('bnb_wallet');
    const minWithdraw = await getSetting('min_withdraw');
    const bonusPct = await getSetting('referral_bonus_pct');

    res.json({
      settings: {
        btc_wallet: btcWallet,
        trx_wallet: trxWallet,
        bnb_wallet: bnbWallet,
        min_withdrawal: minWithdraw,
        referral_bonus_pct: bonusPct,
      },
    });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.put('/settings', adminGuard, async (req, res) => {
  try {
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct } = req.body;
    if (btcWallet !== undefined) await setSetting('btc_wallet', btcWallet);
    if (trxWallet !== undefined) await setSetting('trx_wallet', trxWallet);
    if (bnbWallet !== undefined) await setSetting('bnb_wallet', bnbWallet);
    if (minWithdrawal !== undefined) await setSetting('min_withdraw', minWithdrawal);
    if (referralBonusPct !== undefined) await setSetting('referral_bonus_pct', referralBonusPct);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

// User management
router.get('/users', adminGuard, async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json({ users: allUsers });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.put('/users/:id/role', adminGuard, async (req, res) => {
  try {
    const { role } = req.body;
    await db.update(users).set({ role }).where(eq(users.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});
