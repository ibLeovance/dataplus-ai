import { Router } from 'express';
import { db, toCamel } from '../db';

export const router = Router();

// Withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { amount, currency, walletAddress } = req.body;
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const minWithdraw = await db.getSetting('min_withdraw');
    const minAmount = minWithdraw || '1';
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minAmount}` });
    }

    if (parseFloat(user.available_balance || '0') < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const withdrawal = await db.insert('withdrawals', {
      user_id: userId,
      amount,
      currency,
      wallet_address: walletAddress,
    });

    // Deduct from available balance
    await db.updateById('users', userId, {
      available_balance: Number(user.available_balance || 0) - parseFloat(amount),
    });

    res.json({ withdrawal: toCamel(withdrawal) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get user's withdrawals (newest first)
router.get('/my-withdrawals', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const all = await db.select('withdrawals', { key: 'user_id', value: userId });
    const sorted = [...all].sort((a, b) => (b.id || 0) - (a.id || 0));
    res.json({ withdrawals: toCamelList(sorted) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get admin wallet addresses (for QR display)
router.get('/admin-wallets', async (req, res) => {
  try {
    const btc = await db.getSetting('btc_wallet');
    const trx = await db.getSetting('trx_wallet');
    const bsc = await db.getSetting('bsc_wallet');
    const bnb = await db.getSetting('bnb_wallet');

    res.json({
      btc: btc || 'bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct',
      trx: trx || 'TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4',
      usdt: bsc || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
      bnb: bnb || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** camelCase a list of rows */
function toCamelList(rows: Record<string, any>[]) {
  return rows.map(r => {
    const out: Record<string, any> = {};
    for (const key of Object.keys(r)) {
      out[key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())] = r[key];
    }
    return out;
  });
}
