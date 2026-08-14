import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db, toCamel } from '../db';

export const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists (by username or email)
    const existing = await db.select('users', { key: 'username', value: username });
    const existingEmail = await db.select('users', { key: 'email', value: email });
    if (existing.length > 0 || existingEmail.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const refCode = nanoid(8).toUpperCase();

    // Find referrer
    let referredBy: number | null = null;
    if (referralCode) {
      const referrer = await db.select('users', { key: 'referral_code', value: referralCode });
      if (referrer.length > 0) {
        referredBy = referrer[0].id;
      }
    }

    const newUser = await db.insert('users', {
      username,
      email,
      password_hash: passwordHash,
      referral_code: refCode,
      referred_by: referredBy,
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'dataplus-ai-secret',
      { expiresIn: '30d' }
    );

    const { password_hash: _, ...safeUser } = newUser as any;
    res.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await db.select('users', { key: 'email', value: email });
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'dataplus-ai-secret',
      { expiresIn: '30d' }
    );

    const { password_hash: _, ...safeUser } = user as any;
    res.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: toCamel(user) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update profile wallet addresses
router.put('/profile', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { btcAddress, usdtAddress, trxAddress } = req.body;
    const updates: Record<string, string> = {};
    if (btcAddress !== undefined) updates.btc_address = btcAddress;
    if (usdtAddress !== undefined) updates.usdt_address = usdtAddress;
    if (trxAddress !== undefined) updates.trx_address = trxAddress;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await db.updateById('users', userId, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { password_hash: _, ...safeUser } = updated as any;
    res.json({ user: toCamel(safeUser) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completions = await db.select('completions', { key: 'user_id', value: userId });
    const completedCount = completions.filter(c => c.status === 'approved').length;
    const pendingCount = completions.filter(c => c.status === 'pending').length;

    const { password_hash: _, ...safeUser } = user as any;
    res.json({
      user: toCamel(safeUser),
      overview: {
        totalEarned: user.total_earned,
        availableBalance: user.available_balance,
        referralBonus: user.referral_bonus,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        referralCode: user.referral_code,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
