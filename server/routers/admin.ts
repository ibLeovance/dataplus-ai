import { Router } from 'express';
import { db } from '../db';

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
    const value = await db.getSetting(key);
    return value || DEFAULT_SETTINGS[key] || '';
  } catch {
    return DEFAULT_SETTINGS[key] || '';
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
    const totalUsers = await db.count('users');
    const completedTasks = await db.count('completions', 'status', 'approved');
    const pendingWithdrawals = await db.count('withdrawals', 'status', 'pending');
    const totalEarned = await db.sum('withdrawals', 'amount', 'status', 'paid');

    res.json({
      totalUsers,
      completedTasks,
      pendingWithdrawals,
      totalEarned,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Task management
router.post('/tasks', adminGuard, async (req, res) => {
  try {
    const { title, description, category, reward, currency, timeLimit, requiredProof, imageUrl } = req.body;
    const task = await db.insert('tasks', {
      title,
      description: description || '',
      category,
      reward,
      currency,
      time_limit: timeLimit,
      required_proof: requiredProof,
      image_url: imageUrl || '',
    });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/tasks', adminGuard, async (req, res) => {
  try {
    const allTasks = await db.select('tasks');
    res.json({ tasks: allTasks });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/tasks/:id', adminGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const set: Record<string, any> = { ...req.body };
    if (set.timeLimit !== undefined) set.time_limit = set.timeLimit;
    delete set.timeLimit;
    await db.updateById('tasks', id, set);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/tasks/:id', adminGuard, async (req, res) => {
  try {
    await db.deleteById('tasks', parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Completion review
router.get('/completions/pending', adminGuard, async (req, res) => {
  try {
    const pending = await db.select('completions', { key: 'status', value: 'pending' });
    const enriched = await Promise.all(
      pending.map(async comp => {
        const taskRows = await db.select('tasks', { key: 'id', value: comp.task_id });
        const userRows = await db.select('users', { key: 'id', value: comp.user_id });
        return {
          ...comp,
          task_title: taskRows[0]?.title || 'Unknown Task',
          user_name: userRows[0]?.username || 'Unknown',
          user_email: userRows[0]?.email || '',
        };
      })
    );
    res.json({ completions: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/completions/:id/review', adminGuard, async (req, res) => {
  try {
    const { status } = req.body;
    const rows = await db.select('completions', { key: 'id', value: parseInt(req.params.id) });
    const completion = rows[0];
    if (!completion) return res.status(404).json({ error: 'Not found' });

    await db.updateById('completions', completion.id, { status, reviewed_at: new Date().toISOString() });

    if (status === 'approved') {
      const userRows = await db.select('users', { key: 'id', value: completion.user_id });
      const user = userRows[0];
      if (user) {
        await db.updateById('users', user.id, {
          total_earned: Number(user.total_earned || 0) + Number(completion.reward || 0),
          available_balance: Number(user.available_balance || 0) + Number(completion.reward || 0),
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Withdrawal management
router.get('/withdrawals', adminGuard, async (req, res) => {
  try {
    const all = await db.select('withdrawals');
    const enriched = await Promise.all(
      all.map(async wd => {
        const userRows = await db.select('users', { key: 'id', value: wd.user_id });
        return {
          ...wd,
          user_name: userRows[0]?.username || 'Unknown',
          user_email: userRows[0]?.email || '',
        };
      })
    );
    res.json({ withdrawals: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/withdrawals/:id', adminGuard, async (req, res) => {
  try {
    const { status, txHash } = req.body;
    await db.updateById('withdrawals', parseInt(req.params.id), {
      status,
      tx_hash: txHash || '',
      processed_at: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
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
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/settings', adminGuard, async (req, res) => {
  try {
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct } = req.body;
    if (btcWallet !== undefined) await db.upsertSetting('btc_wallet', btcWallet);
    if (trxWallet !== undefined) await db.upsertSetting('trx_wallet', trxWallet);
    if (bnbWallet !== undefined) await db.upsertSetting('bnb_wallet', bnbWallet);
    if (minWithdrawal !== undefined) await db.upsertSetting('min_withdraw', minWithdrawal);
    if (referralBonusPct !== undefined) await db.upsertSetting('referral_bonus_pct', referralBonusPct);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// User management
router.get('/users', adminGuard, async (req, res) => {
  try {
    const allUsers = await db.select('users');
    res.json({ users: allUsers });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/users/:id/role', adminGuard, async (req, res) => {
  try {
    const { role } = req.body;
    await db.updateById('users', parseInt(req.params.id), { role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
