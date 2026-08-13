import { Router } from 'express';
import { db } from '../db';
import { users } from '../../drizzle/schema';
import { eq, sql, count } from 'drizzle-orm';

export const router = Router();

// Get referral setup (code + link)
router.get('/setup', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const domain = process.env.APP_DOMAIN || 'dataplus-ai.koyeb.app';
    const referralLink = `https://${domain}/?ref=${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
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

    const referrals = await db.select()
      .from(users)
      .where(eq(users.referredBy, userId));

    res.json({
      referrals: referrals.map(r => ({
        id: r.id,
        referredUserName: r.username || r.email,
        createdAt: r.createdAt,
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

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Count referred users
    const referrals = await db.select({ count: count() }).from(users).where(eq(users.referredBy, userId));
    
    const domain = process.env.APP_DOMAIN || 'dataplus-ai.koyeb.app';
    const referralLink = `https://${domain}/?ref=${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
      referralLink,
      referralCount: referrals[0]?.count || 0,
      referralBonus: user.referralBonus,
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

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.referredBy) return res.json({ success: false, message: 'Already has referrer' });

    const referrer = await db.select().from(users).where(eq(users.referralCode, referralCode));
    if (referrer.length === 0) return res.status(404).json({ error: 'Invalid referral code' });
    if (referrer[0].id === userId) return res.status(400).json({ error: 'Cannot refer yourself' });

    await db.update(users)
      .set({ referredBy: referrer[0].id })
      .where(eq(users.id, userId));

    // Give referral bonus to referrer (10% of minimum reward)
    const bonus = '0.01'; // Default bonus amount
    await db.update(users)
      .set({ referralBonus: sql`${users.referralBonus} + ${bonus}` })
      .where(eq(users.id, referrer[0].id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
