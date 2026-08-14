import { Router } from 'express';
import { db, toCamel } from '../db';

export const router = Router();

// Get referral setup (code + link)
router.get('/setup', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const domain = process.env.APP_DOMAIN || 'dataplus-ai.koyeb.app';
    const referralLink = `https://${domain}/?ref=${user.referral_code}`;

    res.json({
      referralCode: user.referral_code,
      referralLink,
      referralUrl: referralLink,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get my referrals list
router.get('/my-referrals', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const referrals = await db.select('users', { key: 'referred_by', value: userId });

    res.json({
      referrals: referrals.map(r => ({
        id: r.id,
        referredUserName: r.username || r.email,
        createdAt: r.created_at,
        status: 'earned',
        bonusEarned: '0.01',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get my referral info
router.get('/my', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Count referred users
    const referred = await db.select('users', { key: 'referred_by', value: userId });

    const domain = process.env.APP_DOMAIN || 'dataplus-ai.koyeb.app';
    const referralLink = `https://${domain}/?ref=${user.referral_code}`;

    res.json({
      referralCode: user.referral_code,
      referralLink,
      referralCount: referred.length,
      referralBonus: user.referral_bonus,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Register with referral code (called after login)
router.post('/register-with-code', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { referralCode } = req.body;
    if (!userId || !referralCode) return res.status(400).json({ error: 'Missing params' });

    const myRows = await db.select('users', { key: 'id', value: userId });
    const user = myRows[0];
    if (user?.referred_by) return res.json({ success: false, message: 'Already has referrer' });

    const referrerRows = await db.select('users', { key: 'referral_code', value: referralCode });
    if (referrerRows.length === 0) return res.status(404).json({ error: 'Invalid referral code' });
    const referrer = referrerRows[0];
    if (referrer.id === userId) return res.status(400).json({ error: 'Cannot refer yourself' });

    await db.updateById('users', userId, { referred_by: referrer.id });

    // Give referral bonus to referrer (default bonus amount)
    const bonus = 0.01;
    const referrerUpdated = await db.updateById('users', referrer.id, {
      referral_bonus: Number(referrer.referral_bonus || 0) + bonus,
    });

    res.json({ success: true, referralBonus: referrerUpdated?.referral_bonus });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
