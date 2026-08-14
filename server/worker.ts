import { Hono } from 'hono';
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
  // Bindings (ASSETS, env vars) arrive on c.env at request time in the
  // Cloudflare Pages Functions runtime — keep them reachable globally.
  try {
    const reqEnv = (c as any).env;
    if (reqEnv && typeof reqEnv === 'object') (globalThis as any).__cf_req_env = reqEnv;
  } catch {
    // ignore
  }
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
app.use('/api/_echo-env', exempt);
app.use('/api/share/links', exempt);
app.use('/api/withdrawals/admin-wallets', exempt);
app.use('/api/marketplace-stats', exempt);
const PUBLIC_API_PATHS = ['/api/health', '/api/_echo-env', '/api/share/links', '/api/withdrawals/admin-wallets', '/api/marketplace-stats'];

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

app.get('/api/_echo-env', async (c) => {
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'APP_DOMAIN'];
  const sources = ['reqEnv', 'globalThis.env', 'process.env'];
  const report: Record<string, Record<string, boolean>> = {};
  const reqEnv = (c as any).env;
  const srcs: [string, any][] = [
    ['reqEnv', reqEnv],
    ['globalThis.env', (globalThis as any).env],
    ['process.env', typeof process !== 'undefined' ? process.env : undefined],
  ];
  for (const [name, src] of srcs) {
    report[name] = {};
    for (const k of keys) {
      try {
        report[name][k] = src && typeof src[k] === 'string' && src[k].length > 0;
      } catch {
        report[name][k] = false;
      }
    }
  }
  return c.json({ report });
});

// ---------- Rate limiting (in-memory, per-IP; Cloudflare Pages worker process lives ~minutes, enough to stop mass signup bursts) ----------
const rateBuckets = new Map<string, { count: number; until: number }>();
function getClientIp(c: any): string {
  const cf = c.req?.raw?.cf?.colo ? '' : '';
  const realIp =
    c.req?.header('cf-connecting-ip') ||
    c.req?.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return cf + realIp;
}
function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.until <= now) {
    rateBuckets.set(key, { count: 1, until: now + windowMs });
    return false;
  }
  if (bucket.count >= max) return true;
  bucket.count += 1;
  return false;
}
function isSpamText(s: string): boolean {
  const v = String(s ?? '').trim().toLowerCase();
  // reject disposable-suffix emails and extremely long/empty junk patterns
  if (v.length < 3 || v.length > 80) return true;
  return false;
}
const DISPOSABLE_SUFFIXES = ['tempmail.com', 'throwawaymail.com', 'mailinator.com', 'guerrillamail.com', 'yopmail.com', 'temp-mail.org', 'sharklasers.com', 'example.com', 'example.org'];
function hasDisposableEmail(email: string): boolean {
  const e = String(email ?? '').toLowerCase();
  return DISPOSABLE_SUFFIXES.some((d) => e.endsWith(d));
}

// ---------- Auth ----------
app.post('/api/auth/register', async (c) => {
  try {
    const body = b(c);
    const { username, email, password, referralCode, phoneNumber, country } = body;
    // Bot protection: rate limit per-IP (5 registers / 15 min)
    if (isRateLimited(`reg:${getClientIp(c)}`, 5, 15 * 60 * 1000)) {
      return c.json({ error: 'Too many attempts. Please wait a few minutes before registering again.' }, 429);
    }
    if (!username || !email || !password) {
      return c.json({ error: 'All fields required' }, 400);
    }
    if (isSpamText(username) || isSpamText(email) || String(password).length < 6) {
      return c.json({ error: 'Invalid input. Use a real username, email and a password of at least 6 characters.' }, 400);
    }
    if (hasDisposableEmail(email)) {
      return c.json({ error: 'Disposable email addresses are not allowed.' }, 400);
    }
    // Phone + country validation
    const phoneClean = String(phoneNumber || '').replace(/[\s\-()]/g, '');
    const validPhone = phoneClean.length >= 6 && phoneClean.length <= 20 && /^\+?[0-9]+$/.test(phoneClean);
    const validCountry = country && String(country).length > 1 && String(country).length <= 60;
    if (!validPhone) {
      return c.json({ error: 'Please enter a valid phone number (e.g. +2348012345678).' }, 400);
    }
    if (!validCountry) {
      return c.json({ error: 'Please select your country.' }, 400);
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
      phone_number: phoneClean,
      country: String(country).trim(),
    });
    // Send welcome notification to the new registrant (graceful if table absent)
    try {
      const welcomeTitle = await db.getSetting('welcome_title');
      const welcomeBody = await db.getSetting('welcome_body');
      await db.insertNotification({
        user_id: newUser.id,
        title: welcomeTitle || 'Welcome to AI COMPUTER PLUS!',
        body: welcomeBody || 'You can now complete tasks to earn crypto. Invite friends with your link and earn 10% of what they earn!',
        kind: 'welcome',
      });
    } catch {
      /* no-op: notifications table may not exist yet */
    }
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
    // Bot protection: rate limit per-IP (10 logins / 15 min)
    if (isRateLimited(`login:${getClientIp(c)}`, 10, 15 * 60 * 1000)) {
      return c.json({ error: 'Too many login attempts. Please wait a few minutes.' }, 429);
    }
    const rows = await db.select('users', { key: 'email', value: email });
    const user = rows[0];
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    if (user.is_banned) return c.json({ error: 'This account has been suspended. Contact support.' }, 403);
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
    const { password_hash: _ph, ...safeUser } = user as any;
    return c.json({ user: toCamel(safeUser) });
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
        return { ...comp, task_title: t?.title || null, completed_at: comp.reviewed_at || comp.submitted_at };
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
    const { taskId, proof, durationWatched } = body;
    const taskRows = await db.select('tasks', { key: 'id', value: taskId });
    const task = taskRows[0];
    if (!task) return c.json({ error: 'Task not found' }, 404);
    // 30-second video watch rule: video task requires >= 30s watched before payment
    const watchedSec = parseInt(String(durationWatched || '0'), 10) || 0;
    if ((task.category === 'video' || task.category === 'watch_video') && watchedSec < 30) {
      return c.json({ error: `Video must be watched for at least 30 seconds before payment. You watched ${watchedSec}s.`, secondsWatched: watchedSec }, 400);
    }
    const existing = await db.select('completions', { key: 'task_id', value: taskId });
    const dup = existing.find((comp: any) => comp.user_id === userId);
    if (dup) return c.json({ error: 'Task already completed' }, 409);
    // Payment uses the configured per-task reward amount (editable in Admin Panel)
    const rewardAmount = Number(task.reward) || 0;
    if (rewardAmount <= 0) {
      return c.json({ error: 'This task currently has no reward set. Ask the admin.' }, 400);
    }
    const completion = await db.insert('completions', {
      user_id: userId,
      task_id: taskId,
      proof: proof || '',
      reward: rewardAmount,
      currency: task.currency,
      video_watched_seconds: watchedSec,
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
    const feePct = parseFloat((await db.getSetting('withdrawal_fee_pct')) || '0');
    const fee = parseFloat(amount) * (feePct / 100);
    if (parseFloat(user.available_balance || '0') < parseFloat(amount)) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }
    const withdrawal = await db.insert('withdrawals', {
      user_id: userId,
      amount,
      currency,
      wallet_address: walletAddress,
      fee,
    });
    await db.updateById('users', userId, {
      available_balance: Number(user.available_balance || 0) - parseFloat(amount),
    });
    return c.json({
      withdrawal: toCamel(withdrawal),
      feePct,
      fee,
      netAmount: parseFloat(amount) - fee,
    });
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

// Public marketplace stats — real data only (no fake numbers)
app.get('/api/marketplace-stats', async (c) => {
  try {
    const totalUsers = await db.count('users');
    const completedTasks = await db.count('completions', 'status', 'approved');
    const totalWithdrawals = await db.count('withdrawals', 'status', 'paid');
    const totalPayouts = await db.sum('withdrawals', 'amount', 'status', 'paid');
    const activeTasks = await db.count('tasks', 'status', 'active');
    return c.json({ totalUsers, completedTasks, totalWithdrawals, totalPayouts, activeTasks });
  } catch {
    return c.json({ totalUsers: 0, completedTasks: 0, totalWithdrawals: 0, totalPayouts: 0, activeTasks: 0 });
  }
});

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
    const { status, txHash, walletAddress } = body;
    const patch: any = {
      status,
      tx_hash: txHash || '',
      processed_at: new Date().toISOString(),
    };
    if (walletAddress !== undefined) patch.wallet_address = walletAddress;
    await db.updateById('withdrawals', parseInt(c.req.param('id')), patch);
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
    const feePct = await getSetting('withdrawal_fee_pct');
    return c.json({
      settings: {
        btc_wallet: btcWallet,
        trx_wallet: trxWallet,
        bnb_wallet: bnbWallet,
        min_withdrawal: minWithdraw,
        referral_bonus_pct: bonusPct,
        withdrawal_fee_pct: feePct,
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
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct, withdrawalFeePct } = body;
    if (btcWallet !== undefined) await db.upsertSetting('btc_wallet', btcWallet);
    if (trxWallet !== undefined) await db.upsertSetting('trx_wallet', trxWallet);
    if (bnbWallet !== undefined) await db.upsertSetting('bnb_wallet', bnbWallet);
    if (minWithdrawal !== undefined) await db.upsertSetting('min_withdraw', minWithdrawal);
    if (referralBonusPct !== undefined) await db.upsertSetting('referral_bonus_pct', referralBonusPct);
    if (withdrawalFeePct !== undefined) await db.upsertSetting('withdrawal_fee_pct', withdrawalFeePct);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/users', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const allUsers = await db.select('users');
    return c.json({ users: allUsers.map((u: any) => { const { password_hash: _ph, ...s } = u; return s; }) });
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

// ---------- Full admin edit: edit ANY field of a user ----------
app.put('/api/admin/users/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const id = parseInt(c.req.param('id'));
    const body = b(c);
    const set: Record<string, any> = {};
    const allowed = ['username', 'email', 'role', 'btc_address', 'usdt_address', 'trx_address', 'available_balance', 'total_earned', 'referral_bonus', 'phone_number', 'country', 'is_banned'];
    for (const key of allowed) {
      const camelKey = key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
      const srcKey = body[key] !== undefined ? key : (body[camelKey] !== undefined ? camelKey : undefined);
      if (srcKey !== undefined) set[key] = body[srcKey];
    }
    if (Object.keys(set).length === 0) return c.json({ error: 'No fields to update' }, 400);
    await db.updateById('users', id, set);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.delete('/api/admin/users/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const userId = parseInt(c.req.param('id'));
    await db.deleteById('withdrawals', 0).catch(() => undefined);
    await db.deleteById('completions', 0).catch(() => undefined);
    // Remove user's referrals' links and completions then the user
    await db.update('completions', 'user_id', userId, { status: 'removed' }).catch(() => undefined);
    await db.deleteById('users', userId);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Notifications (admin) ----------
app.get('/api/admin/notifications', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const rows = await db.listAllNotifications();
    return c.json({ notifications: rows });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.post('/api/admin/notifications', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const { title, body: bodyText, kind } = body;
    if (!title) return c.json({ error: 'Title required' }, 400);
    const allUsers = await db.select('users');
    const result = await db.insertNotification({
      user_id: body.user_id != null ? body.user_id : null,
      title,
      body: bodyText || '',
      kind: kind || (body.user_id != null ? 'info' : 'broadcast'),
    });
    if (!result.ok) return c.json({ success: false, note: 'notifications table missing' });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.delete('/api/admin/notifications/:id', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    await db.deleteNotification(parseInt(c.req.param('id')));
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Notifications (user) ----------
app.get('/api/notifications', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.listNotificationsForUser(userId);
    return c.json({ notifications: rows });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/notifications/:id/read', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    await db.markNotificationRead(parseInt(c.req.param('id')));
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Static assets (SPA) ----------
// Static assets in Cloudflare Pages are served by the asset pipeline. In local
// Node dev (wrangler pages dev), static files sit next to the worker and are
// fetched through the asset pipeline via cacheOnly as well (same path).
const isCloudflare = typeof globalThis !== 'undefined' && typeof (globalThis as any).WebSocketPair !== 'undefined';
{
  const STATIC_EXTS = [".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".json", ".txt", ".map"];
  const isStatic = (pathname: string) => STATIC_EXTS.some((ext) => pathname.endsWith(ext));
  const findAssets = (): { fetch?: (req: Request) => Promise<Response> } | undefined => {
    const envs = [
      (globalThis as any).__cf_req_env,
      (globalThis as any).env,
    ];
    for (const e of envs) {
      if (e && e.ASSETS && typeof e.ASSETS.fetch === 'function') return e.ASSETS;
    }
    return undefined;
  };
  app.get("/*", async (c) => {
    const pathname = new URL(c.req.url).pathname;
    // /api routes already handled above; anything else is a static/SPA request
    let targetUrl = c.req.url;
    if (!isStatic(pathname)) {
      // SPA fallback: serve index.html for unknown non-api paths
      targetUrl = new URL("/index.html", c.req.url).toString();
    }
    const assets = findAssets();
    if (assets?.fetch) {
      try {
        const assetReq = new Request(targetUrl, { headers: c.req.headers });
        const assetRes = await assets.fetch(assetReq);
        if (assetRes.status === 404) {
          // SPA fallback even for static paths missing in the pipeline
          const idx = await assets.fetch(new Request(new URL("/index.html", c.req.url).toString(), { headers: c.req.headers }));
          return idx;
        }
        return assetRes;
      } catch (err) {
        console.error("[static] ASSETS fetch failed:", (err as Error)?.message ?? err);
        return new Response("static: " + ((err as Error)?.message ?? String(err)), { status: 500 });
      }
    }
    // Dev/local fallback (wrangler pages dev): asset pipeline reachable via
    // cacheOnly fetch on the same origin.
    const res = await fetch(targetUrl, { cf: { cacheOnly: true } } as RequestInit);
    return new Response(res.body, res);
  });
}


export { app };
export default app;
