import { Router } from 'express';
import { db } from '../db';
import { settings, users, withdrawals } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export const router = Router();

// Withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { amount, currency, walletAddress } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const minWithdraw = await db.select().from(settings).where(eq(settings.key, 'min_withdraw'));
    const minAmount = minWithdraw[0]?.value || '1';
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minAmount}` });
    }

    if (parseFloat(user.availableBalance || "0") < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const [withdrawal] = await db.insert(withdrawals).values({
      userId,
      amount,
      currency,
      walletAddress,
    }).returning();

    // Deduct from available balance
    await db.update(users)
      .set({ availableBalance: sql`${users.availableBalance} - ${amount}` })
      .where(eq(users.id, userId));

    res.json({ withdrawal });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get user's withdrawals
router.get('/my-withdrawals', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const all = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
    res.json({ withdrawals: all });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get admin wallet addresses (for QR display)
router.get('/admin-wallets', async (req, res) => {
  try {
    const btcSetting = await db.select().from(settings).where(eq(settings.key, 'btc_wallet'));
    const trxSetting = await db.select().from(settings).where(eq(settings.key, 'trx_wallet'));
    const bscSetting = await db.select().from(settings).where(eq(settings.key, 'bsc_wallet'));
    const bnbSetting = await db.select().from(settings).where(eq(settings.key, 'bnb_wallet'));

    res.json({
      btc: btcSetting[0]?.value || 'bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct',
      trx: trxSetting[0]?.value || 'TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4',
      usdt: bscSetting[0]?.value || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
      bnb: bnbSetting[0]?.value || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


