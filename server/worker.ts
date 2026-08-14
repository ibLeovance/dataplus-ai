import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db, toCamel, toCamelList } from './db';
import { router as authRouter } from './routers/auth';
import { router as taskRouter } from './routers/tasks';
import { router as referralRouter } from './routers/referral';
import { router as adminRouter } from './routers/admin';
import { router as settingsRouter } from './routers/settings';
import { router as shareRouter } from './routers/share';
import { runStartupCheck } from './migrate';

// Environment resolver: works both in Node (process.env) and in Cloudflare
// Pages Functions runtime (bindings arrive on globalThis.env).
export function getEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).env) {
      for (const k of Object.keys((globalThis as any).env)) out[k] = String((globalThis as any).env[k]);
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env) {
    for (const k of Object.keys(process.env)) {
      if (out[k] === undefined) out[k] = process.env[k];
    }
  }
  return out;
}
const JWT_SECRET_DEFAULT = 'dataplus-ai-secret';

interface AuthUser {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'user';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

const app = new Hono();

// ---------- Global middleware ----------
app.use('*', cors());
app.use('*', async (c, next) => {
  // Parse JSON body
  const req = c.req;
  const ct = req.header('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const raw = await req.raw.clone().text();
      (c as any).jsonBody = raw ? JSON.parse(raw) : {};
    } catch {
      (c as any).jsonBody = {};
    }
  }
  await next();
});

// ---------- Auth middleware (JWT from Authorization header) ----------
app.use('/api/auth/*', async (c, next) => {
  // register/login/me/profile/overview: me/profile/overview require token
  const publicPaths = ['/api/auth/register', '/api/auth/login'];
  if (publicPaths.includes(new URL(c.req.url).pathname)) {
    (c as any).user = null;
    await next();
    return;
  }
  const token = tokenFromRequest(c);
  if (!token) {
    (c as any).user = null;
    return c.json({ error: 'Not authenticated' }, 401);
  }
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET || JWT_SECRET_DEFAULT) as AuthUser;
    (c as any).user = decoded;
  } catch {
    (c as any).user = null;
    return c.json({ error: 'Invalid token' }, 401);
  }
  await next();
});

// Authenticated-user middleware for everything else under /api
function exempt(c: any, next: any) { (c as any).user = null; return next(); }
app.use('/api/health', exempt);
app.use('/api/share/links', exempt);
app.use('/api/withdrawals/admin-wallets', exempt);
const PUBLIC_API_PATHS = ['/api/health', '/api/share/links', '/api/withdrawals/admin-wallets'];

app.use('/api/*', async (c, next) => {
  // Public endpoints skip authentication; /api/auth/* paths are handled by the auth middleware above
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/auth/')) {
    await next();
    return;
  }
  if (PUBLIC_API_PATHS.includes(path)) {
    (c as any).user = null;
    await next();
    return;
  }
  const token = tokenFromRequest(c);
  if (!token) {
    (c as any).user = null;
    return c.json({ error: 'Not authenticated' }, 401);
  }
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET || JWT_SECRET_DEFAULT) as AuthUser;
    (c as any).user = decoded;
  } catch {
    (c as any).user = null;
    return c.json({ error: 'Invalid token' }, 401);
  }
  await next();
});

function reqPath(c: any): string {
  return '/' + c.req.routePath.replace(/^\/+/, '');
}

function tokenFromRequest(c: any): string | null {
  const auth = c.req.header('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function adminGuard(c: any): boolean {
  return (c as any).user?.role === 'admin';
}

function b(c: any): Record<string, any> {
  return (c as any).jsonBody ?? {};
}

// ---------- Health ----------
app.get('/api/health', (c) => c.json({ status: 'ok', env: getEnv().NODE_ENV || 'development' }));

// ---------- Auth ----------
app.post('/api/auth/register', async (c) => {
  try {
    const body = b(c);
    const { username, email, password, referralCode } = body;
    if (!username || !email || !password) {
      return c.json({ error: 'All fields required' }, 400);
    }
    const existing = await db.select('users', { key: 'username', value: username });
    const existingEmail = await db.select('users', { key: 'email', value: email });
    if (existing.length > 0 || existingEmail.length > 0) {
      return c.json({ error: 'User already exists' }, 409);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const refCode = nanoid(8).toUpperCase();
    let referredBy: number | null = null;
    if (referralCode) {
      const referrer = await db.select('users', { key: 'referral_code', value: referralCode });
      if (referrer.length > 0) referredBy = referrer[0].id;
    }
    const newUser = await db.insert('users', {
      username,
      email,
      password_hash: passwordHash,
      referral_code: refCode,
      referred_by: referredBy,
    });
    const env = getEnv();
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      env.JWT_SECRET || JWT_SECRET_DEFAULT,
      { expiresIn: '30d' }
    );
    const { password_hash: _, ...safeUser } = newUser as any;
    return c.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error('Register error:', err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = b(c);
    const { email, password } = body;
    const rows = await db.select('users', { key: 'email', value: email });
    const user = rows[0];
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    const env = getEnv();
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.JWT_SECRET || JWT_SECRET_DEFAULT,
      { expiresIn: '30d' }
    );
    const { password_hash: _, ...safeUser } = user as any;
    return c.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/auth/me', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ user: toCamel(user) });
  } catch (err) {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/auth/profile', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const { btcAddress, usdtAddress, trxAddress } = body;
    const updates: Record<string, string> = {};
    if (btcAddress !== undefined) updates.btc_address = btcAddress;
    if (usdtAddress !== undefined) updates.usdt_address = usdtAddress;
    if (trxAddress !== undefined) updates.trx_address = trxAddress;
    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    const updated = await db.updateById('users', userId, updates);
    if (!updated) return c.json({ error: 'User not found' }, 404);
    const { password_hash: _, ...safeUser } = updated as any;
    return c.json({ user: toCamel(safeUser) });
  } catch (err) {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/auth/overview', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const completions = await db.select('completions', { key: 'user_id', value: userId });
    const completedCount = completions.filter((comp: any) => comp.status === 'approved').length;
    const pendingCount = completions.filter((comp: any) => comp.status === 'pending').length;
    const { password_hash: _, ...safeUser } = user as any;
    return c.json({
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
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Tasks ----------
app.get('/api/tasks', async (c) => {
  try {
    const allTasks = await db.select('tasks', { key: 'status', value: 'active' });
    return c.json({ tasks: toCamelList(allTasks) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/tasks/my-completions', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const completions = await db.select('completions', { key: 'user_id', value: userId });
    const withTitles = await Promise.all(
      completions.map(async (comp: any) => {
        const taskRows = await db.select('tasks', { key: 'id', value: comp.task_id });
        const t = taskRows[0];
        return { ...comp, task_title: t?.title || null };
      })
    );
    return c.json({ completions: toCamelList(withTitles) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.post('/api/tasks/complete', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const { taskId, proof } = body;
    const taskRows = await db.select('tasks', { key: 'id', value: taskId });
    const task = taskRows[0];
    if (!task) return c.json({ error: 'Task not found' }, 404);
    const existing = await db.select('completions', { key: 'task_id', value: taskId });
    const dup = existing.find((comp: any) => comp.user_id === userId);
    if (dup) return c.json({ error: 'Task already completed' }, 409);
    const completion = await db.insert('completions', {
      user_id: userId,
      task_id: taskId,
      proof: proof || '',
      reward: task.reward,
      currency: task.currency,
    });
    return c.json({ completion: toCamel(completion) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/tasks/:id', async (c) => {
  try {
    const rows = await db.select('tasks', { key: 'id', value: parseInt(c.req.param('id')) });
    const task = rows[0];
    if (!task) return c.json({ error: 'Task not found' }, 404);
    return c.json({ task: toCamel(task) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Referral ----------
function referralLinkFor(user: any): string {
  const env = getEnv();
  const domain = env.APP_DOMAIN || 'dataplus-ai.pages.dev';
  return `https://${domain}/?ref=${user.referral_code}`;
}

app.get('/api/referral/setup', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const referralLink = referralLinkFor(user);
    return c.json({ referralCode: user.referral_code, referralLink, referralUrl: referralLink });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/referral/my-referrals', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const referrals = await db.select('users', { key: 'referred_by', value: userId });
    return c.json({
      referrals: referrals.map((r: any) => ({
        id: r.id,
        referredUserName: r.username || r.email,
        createdAt: r.created_at,
        status: 'earned',
        bonusEarned: '0.01',
      })),
    });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/referral/my', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const referred = await db.select('users', { key: 'referred_by', value: userId });
    const referralLink = referralLinkFor(user);
    return c.json({
      referralCode: user.referral_code,
      referralLink,
      referralCount: referred.length,
      referralBonus: user.referral_bonus,
    });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.post('/api/referral/register-with-code', async (c) => {
  try {
    const userId = (c as any).user?.id;
    const body = b(c);
    const { referralCode } = body;
    if (!userId || !referralCode) return c.json({ error: 'Missing params' }, 400);
    const myRows = await db.select('users', { key: 'id', value: userId });
    const user = myRows[0];
    if (user?.referred_by) return c.json({ success: false, message: 'Already has referrer' });
    const referrerRows = await db.select('users', { key: 'referral_code', value: referralCode });
    if (referrerRows.length === 0) return c.json({ error: 'Invalid referral code' }, 404);
    const referrer = referrerRows[0];
    if (referrer.id === userId) return c.json({ error: 'Cannot refer yourself' }, 400);
    await db.updateById('users', userId, { referred_by: referrer.id });
    const bonus = 0.01;
    const referrerUpdated = await db.updateById('users', referrer.id, {
      referral_bonus: Number(referrer.referral_bonus || 0) + bonus,
    });
    return c.json({ success: true, referralBonus: referrerUpdated?.referral_bonus });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Settings / Withdrawals ----------
app.post('/api/withdrawals/withdraw', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const { amount, currency, walletAddress } = body;
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const minWithdraw = await db.getSetting('min_withdraw');
    const minAmount = minWithdraw || '1';
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return c.json({ error: `Minimum withdrawal is ${minAmount}` }, 400);
    }
    if (parseFloat(user.available_balance || '0') < parseFloat(amount)) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }
    const withdrawal = await db.insert('withdrawals', {
      user_id: userId,
      amount,
      currency,
      wallet_address: walletAddress,
    });
    await db.updateById('users', userId, {
      available_balance: Number(user.available_balance || 0) - parseFloat(amount),
    });
    return c.json({ withdrawal: toCamel(withdrawal) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/withdrawals/my-withdrawals', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const all = await db.select('withdrawals', { key: 'user_id', value: userId });
    const sorted = [...all].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    return c.json({ withdrawals: toCamelList(sorted) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/withdrawals/admin-wallets', async (c) => {
  try {
    const btc = await db.getSetting('btc_wallet');
    const trx = await db.getSetting('trx_wallet');
    const bsc = await db.getSetting('bsc_wallet');
    const bnb = await db.getSetting('bnb_wallet');
    return c.json({
      btc: btc || 'bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct',
      trx: trx || 'TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4',
      usdt: bsc || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
      bnb: bnb || '0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8',
    });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Share ----------
app.get('/api/share/links', async (c) => {
  try {
    const env = getEnv();
    const domain = env.APP_DOMAIN || 'dataplus-ai.pages.dev';
    const base = `https://${domain}`;
    return c.json({
      whatsapp: 'https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i',
      base,
      platformName: 'AI COMPUTER PLUS',
    });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Admin ----------
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

app.get('/api/admin/stats', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const totalUsers = await db.count('users');
    const completedTasks = await db.count('completions', 'status', 'approved');
    const pendingWithdrawals = await db.count('withdrawals', 'status', 'pending');
    const totalEarned = await db.sum('withdrawals', 'amount', 'status', 'paid');
    return c.json({ totalUsers, completedTasks, pendingWithdrawals, totalEarned });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.post('/api/admin/tasks', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { title, description, category, reward, currency, timeLimit, requiredProof, imageUrl } = body;
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
    return c.json({ task });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/tasks', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const allTasks = await db.select('tasks');
    return c.json({ tasks: allTasks });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/tasks/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const id = parseInt(c.req.param('id'));
    const body = b(c);
    const set: Record<string, any> = { ...body };
    if (set.timeLimit !== undefined) set.time_limit = set.timeLimit;
    delete set.timeLimit;
    await db.updateById('tasks', id, set);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.delete('/api/admin/tasks/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    await db.deleteById('tasks', parseInt(c.req.param('id')));
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/completions/pending', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const pending = await db.select('completions', { key: 'status', value: 'pending' });
    const enriched = await Promise.all(
      pending.map(async (comp: any) => {
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
    return c.json({ completions: enriched });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/completions/:id/review', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { status } = body;
    const rows = await db.select('completions', { key: 'id', value: parseInt(c.req.param('id')) });
    const completion = rows[0];
    if (!completion) return c.json({ error: 'Not found' }, 404);
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
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/withdrawals', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const all = await db.select('withdrawals');
    const enriched = await Promise.all(
      all.map(async (wd: any) => {
        const userRows = await db.select('users', { key: 'id', value: wd.user_id });
        return {
          ...wd,
          user_name: userRows[0]?.username || 'Unknown',
          user_email: userRows[0]?.email || '',
        };
      })
    );
    return c.json({ withdrawals: enriched });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/withdrawals/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { status, txHash } = body;
    await db.updateById('withdrawals', parseInt(c.req.param('id')), {
      status,
      tx_hash: txHash || '',
      processed_at: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/settings', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const btcWallet = await getSetting('btc_wallet');
    const trxWallet = await getSetting('trx_wallet');
    const bnbWallet = await getSetting('bnb_wallet');
    const minWithdraw = await getSetting('min_withdraw');
    const bonusPct = await getSetting('referral_bonus_pct');
    return c.json({
      settings: {
        btc_wallet: btcWallet,
        trx_wallet: trxWallet,
        bnb_wallet: bnbWallet,
        min_withdrawal: minWithdraw,
        referral_bonus_pct: bonusPct,
      },
    });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/settings', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct } = body;
    if (btcWallet !== undefined) await db.upsertSetting('btc_wallet', btcWallet);
    if (trxWallet !== undefined) await db.upsertSetting('trx_wallet', trxWallet);
    if (bnbWallet !== undefined) await db.upsertSetting('bnb_wallet', bnbWallet);
    if (minWithdrawal !== undefined) await db.upsertSetting('min_withdraw', minWithdrawal);
    if (referralBonusPct !== undefined) await db.upsertSetting('referral_bonus_pct', referralBonusPct);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/users', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const allUsers = await db.select('users');
    return c.json({ users: allUsers });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/users/:id/role', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { role } = body;
    await db.updateById('users', parseInt(c.req.param('id')), { role });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Static assets (SPA) ----------
// In the Workers runtime, static assets are served by the Pages asset pipeline.
// For local Node dev (wrangler pages dev / tsx), fall back to @hono/node-server serveStatic.
// Workers runtime sets CF_PAGES (via wrangler/pages) or runs without process.versions.node
const isCloudflare = typeof globalThis !== 'undefined' && typeof (globalThis as any).WebSocketPair !== 'undefined';
const isNodeRuntimeCheck = !isCloudflare && typeof process !== 'undefined' && !!process.env;
if (isNodeRuntimeCheck) {
  app.use('/assets/*', serveStatic({ root: './client/dist' }));
  app.use('/*', serveStatic({ root: './client/dist' }));
} else if (isCloudflare) {
  // Cloudflare Pages: static assets live in the asset pipeline. The asset
  // pipeline serves unmatched requests, but since our worker matches every
  // route, we forward unmatched (and SPA) requests to the asset pipeline
  // instead of answering 404.
  const STATIC_EXTS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.json', '.txt', '.map'];
  const isStatic = (pathname: string) => STATIC_EXTS.some((ext) => pathname.endsWith(ext));
  app.get('/*', async (c) => {
    const pathname = new URL(c.req.url).pathname;
    // /api routes already handled above; anything else is a static/SPA request
    if (isStatic(pathname)) {
      // Cloudflare's documented pattern: fetch with { cf: { cacheOnly: true } }
      // retrieves the asset from the Pages asset pipeline directly, without
      // re-entering the worker (no infinite loop).
      const res = await fetch(c.req.url, { cf: { cacheOnly: true } } as RequestInit);
      return new Response(res.body, res);
    }
    // SPA fallback: serve index.html for unknown non-api paths
    const res = await fetch(c.req.url.replace(/[^/]*$/, 'index.html'), { cf: { cacheOnly: true } } as RequestInit);
    return new Response(res.body, res);
  });
}

// ---------- Node.js dev server (only in real Node, never in Workers runtime) ----------
const isNodeRuntime =
  typeof process !== 'undefined' &&
  !!process.env &&
  process.versions != null &&
  !!process.versions.node;
if (isNodeRuntime && !isCloudflare && process.env.NODE_ENV !== 'production-worker') {
  const { serve } = await import('@hono/node-server');
  const PORT = Number(process.env.PORT || 3000);
  if (typeof process.env.SUPABASE_URL !== 'undefined') {
    try {
      await runStartupCheck();
    } catch (err) {
      console.error('❌ Startup schema check failed:', (err as Error).message);
      process.exit(1);
    }
  }
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`🚀 Server running on http://localhost:${info.port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export { app };
export default app;
