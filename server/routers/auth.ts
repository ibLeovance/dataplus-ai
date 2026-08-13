import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { users, taskCompletions } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    const existing = await db.select().from(users).where(
      sql`${users.username} = ${username} OR ${users.email} = ${email}`
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const refCode = nanoid(8).toUpperCase();

    // Find referrer
    let referredBy: number | null = null;
    if (referralCode) {
      const referrer = await db.select().from(users).where(eq(users.referralCode, referralCode));
      if (referrer.length > 0) {
        referredBy = referrer[0].id;
      }
    }

    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      referralCode: refCode,
      referredBy,
    }).returning();

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'dataplus-ai-secret',
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser } = newUser as any;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'dataplus-ai-secret',
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser2 } = user as any;
    res.json({ user: safeUser2, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Dashboard overview
router.put('/profile', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { btcAddress, usdtAddress, trxAddress } = req.body;
    const updates: Record<string, string> = {};
    if (btcAddress !== undefined) updates.btcAddress = btcAddress;
    if (usdtAddress !== undefined) updates.usdtAddress = usdtAddress;
    if (trxAddress !== undefined) updates.trxAddress = trxAddress;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    const { passwordHash: _, ...safeUser } = updated as any;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completions = await db.select().from(taskCompletions).where(eq(taskCompletions.userId, userId));
    const completedCount = completions.filter(c => c.status === 'approved').length;
    const pendingCount = completions.filter(c => c.status === 'pending').length;

    const { passwordHash: _, ...safeUser } = user as any;
    res.json({
      user: safeUser,
      overview: {
        totalEarned: user.totalEarned,
        availableBalance: user.availableBalance,
        referralBonus: user.referralBonus,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        referralCode: user.referralCode,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
