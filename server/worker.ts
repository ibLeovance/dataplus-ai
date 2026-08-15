import { Hono } from 'hono';
import { cors } from 'hono/cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db, toCamel, toCamelList, getSupabase } from './db';
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

// ---------- Security + performance headers ----------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

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
  // Long-lived cache headers for immutable build assets (performance)
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/assets/') || path === '/_worker.js') {
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    // Never cache dynamic API responses or pages
    c.header('Cache-Control', 'no-store');
  }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.header(k, v);
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

// ---------- Financial-endpoint rate limiting (per-IP, 10 req / 15 min) ----------
const FIN_LIMIT = new Map<string, { count: number; resetAt: number }>();
app.use('/api/withdrawals', financialRateLimit);
app.use('/api/recharges', financialRateLimit);
app.use('/api/auth/register', financialRateLimit);
function financialRateLimit(c: any, next: any) {
  // Security: never trust x-forwarded-for (spoofable). Cloudflare always sets cf-connecting-ip
  // from the real edge connection, so harden IP pinning to that header only.
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `fin:${ip}`;
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 10;
  let rec = FIN_LIMIT.get(key);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + WINDOW_MS };
    FIN_LIMIT.set(key, rec);
  }
  rec.count += 1;
  if (rec.count > MAX) {
    return c.json({ error: 'Too many requests — please wait a few minutes before trying again.' }, 429);
  }
  // Cleanup on next request of this window if expired
  return next();
}
// Pages Functions runtime has NO global setInterval/setTimeout — cleanup happens lazily here.
function cleanupFinLimit() {
  const now = Date.now();
  for (const [k, v] of FIN_LIMIT) if (v.resetAt <= now) FIN_LIMIT.delete(k);
}

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
app.use('/api/vip-plans', exempt);
app.use('/api/marketplace-stats', exempt);
app.use('/api/ad-payment-channels', exempt);
const PUBLIC_API_PATHS = ['/api/health', '/api/share/links', '/api/withdrawals/admin-wallets', '/api/marketplace-stats', '/api/vip-plans', '/api/ad-payment-channels'];

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


// ---------- Rate limiting (in-memory, per-IP; Cloudflare Pages worker process lives ~minutes, enough to stop mass signup bursts) ----------
const rateBuckets = new Map<string, { count: number; until: number }>();
function getClientIp(c: any): string {
  const cf = c.req?.raw?.cf?.colo ? '' : '';
  // Security: cf-connecting-ip only — x-forwarded-for is user-controlled and spoofable.
  const realIp = c.req?.header('cf-connecting-ip') || 'unknown';
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
    console.error('Login error:', (err as any)?.message || err);
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

app.post('/api/auth/change-password', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) return c.json({ error: 'oldPassword and newPassword are required' }, 400);
    if (String(newPassword).length < 6) return c.json({ error: 'New password must be at least 6 characters' }, 400);
    const users = await db.select('users', { key: 'id', value: userId });
    const user = users?.[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const valid = await bcrypt.compare(String(oldPassword), (user as any).password_hash || '');
    if (!valid) return c.json({ error: 'Current password is incorrect' }, 400);
    const { error: updErr } = await getSupabase().from('users').update({ password_hash: await bcrypt.hash(String(newPassword), 10) }).eq('id', userId).select().single();
    if (updErr) return c.json({ error: 'Update failed: ' + updErr.message }, 500);
    return c.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// Withdraw PIN is stored in app_settings.withdraw_pins as JSON: { "userId": "pin" }
async function getWithdrawPins(): Promise<Record<string, string>> {
  try {
    const raw = await db.getSetting('withdraw_pins');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

app.get('/api/auth/my-pin', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const pins = await getWithdrawPins();
    return c.json({ pin: pins[String(userId)] || '' });
  } catch {
    return c.json({ pin: '' });
  }
});

app.put('/api/auth/my-pin', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const pin = String(body.pin ?? '').replace(/[^0-9]/g, '');
    if (pin.length < 4 || pin.length > 6) return c.json({ error: 'PIN must be 4 to 6 digits' }, 400);
    const pins = await getWithdrawPins();
    pins[String(userId)] = pin;
    await db.upsertSetting('withdraw_pins', JSON.stringify(pins));
    return c.json({ ok: true, message: 'Withdraw PIN saved' });
  } catch {
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
    const approved = completions.filter((comp: any) => comp.status === 'approved');
    const pending = completions.filter((comp: any) => comp.status === 'pending');
    const completedCount = approved.length;
    const pendingCount = pending.length;
    const completedFree = approved.filter((comp: any) => comp.funding === 'admin').length;
    const completedVip = approved.filter((comp: any) => comp.funding === 'user').length;
    const pendingFree = pending.filter((comp: any) => comp.funding === 'admin').length;
    const pendingVip = pending.filter((comp: any) => comp.funding === 'user').length;
    const { password_hash: _, ...safeUser } = user as any;
    return c.json({
      user: toCamel(safeUser),
      overview: {
        totalEarned: user.total_earned,
        availableBalance: user.available_balance,
        referralBonus: user.referral_bonus,
        completedTasks: completedCount,
        completedFreeTasks: completedFree,
        completedVipTasks: completedVip,
        pendingTasks: pendingCount,
        pendingFreeTasks: pendingFree,
        pendingVipTasks: pendingVip,
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

// Daily VIP task progress + ordered daily queue: approved VIP tasks today, plus the ordered list of remaining task ids to complete in sequence
app.get('/api/tasks/daily-task', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const vip = await getActiveVip(userId);
    const allTasks = await db.select('tasks', { key: 'status', value: 'active' });
    const videoTasks = (allTasks || [])
      .filter((t: any) => t.category === 'video' || t.category === 'watch_video')
      .sort((a: any, b: any) => Number(a.id) - Number(b.id));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayKey = todayStart.toISOString().slice(0, 10);
    const completions = await db.select('completions', { key: 'user_id', value: userId });
    const todayApproved = completions.filter((comp: any) => {
      const t = new Date(comp.reviewed_at || comp.submitted_at || comp.created_at).getTime();
      return t >= todayStart.getTime() && (comp.status || 'pending') === 'approved';
    });
    const completedToday = todayApproved.length;
    if (!vip) {
      return c.json({
        vip: null,
        completedToday: 0,
        limit: 0,
        rewardEach: 0,
        doneTaskIds: todayApproved.map((comp: any) => Number(comp.task_id)),
        queue: videoTasks.map((t: any) => Number(t.id)),
        purchaseAmount: 0,
        maxDailyEarn: 0,
        totalPlanTasks: videoTasks.length,
      });
    }
    const limit = Math.min(Number(vip.maxDailyTasks || 0), videoTasks.length);
    const doneTaskIds = todayApproved
      .map((comp: any) => Number(comp.task_id))
      .filter((id: number) => videoTasks.some((t: any) => Number(t.id) === id));
    // Ordered queue: video tasks in id order; skip ones already approved today
    const queue = videoTasks
      .map((t: any) => Number(t.id))
      .filter((id: number) => !doneTaskIds.includes(id))
      .slice(0, Math.max(0, limit - doneTaskIds.length));
    return c.json({
      vip: { planName: vip.name, maxDailyTasks: vip.maxDailyTasks, taskAmount: vip.taskAmount, daysLeft: Math.max(0, Math.ceil((new Date(vip.validUntil).getTime() - Date.now()) / 86400000)) },
      completedToday,
      limit,
      rewardEach: Number(vip.taskAmount || 0),
      doneTaskIds,
      queue,
      purchaseAmount: Number(vip.depositAmount || 0),
      maxDailyEarn: Number((vip.maxDailyTasks || 0) * (vip.taskAmount || 0)),
      totalPlanTasks: videoTasks.length,
    });
  } catch {
    return c.json({ vip: null, completedToday: 0, limit: 0, rewardEach: 0, doneTaskIds: [], queue: [], purchaseAmount: 0, maxDailyEarn: 0, totalPlanTasks: 0 });
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
    // Free-task earnings are credited to the platform admin account; VIP-task
    // earnings go directly to the user's wallet (per teacher's instruction).
    const vip = await getActiveVip(userId);
    let rewardAmount = Number(task.reward) || 0;
    let funding = 'admin'; // free task → platform admin account
    if (vip) {
      rewardAmount = Number(vip.taskAmount) || rewardAmount;
      funding = 'user'; // VIP task → pays the user
    }
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
      funding: funding,
      status: 'pending', // ALL tasks (free and VIP) go through admin review; reward credited on approval
    }).catch(async (e: any) => {
      if (String(e.message || '').includes('funding') || String(e.message || '').includes('column')) {
        // The 'funding' column does not exist in this environment yet.
        return db.insert('completions', {
          user_id: userId,
          task_id: taskId,
          proof: proof || '',
          reward: rewardAmount,
          currency: task.currency,
          video_watched_seconds: watchedSec,
          status: 'pending',
        });
      }
      throw e;
    });
    if (funding === 'user' && vip) {
      // VIP task rewards are credited to the user when admin approves the submission.
      try {
        await db.insertNotification({
          user_id: userId,
          title: 'VIP Task Submitted',
          body: `Your VIP task ($${rewardAmount.toFixed(2)} — ${vip.name}) is in pending review. Once approved, it pays directly to your wallet.`,
          kind: 'info',
        });
      } catch { /* notifications table may not exist */ }
    }
    return c.json({ completion: toCamel(completion), funding });
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
    const { amount, walletAddress, pin, paymentMethod, payoutAccountRef } = body;
    // paymentMethod: crypto ('BTC' | 'USDT' | 'TRX') or an ad-network channel id (adsterra, monetag, ...)
    const isCrypto = !paymentMethod || ['BTC', 'USDT', 'TRX'].includes(String(paymentMethod));
    const currency = isCrypto ? (String(paymentMethod) || 'TRX') : String(paymentMethod);
    const addr = isCrypto ? walletAddress : (payoutAccountRef || walletAddress);
    if (!isCrypto && !String(addr || '').trim()) {
      return c.json({ error: 'Please enter your ad-network account ID or publisher email.' }, 400);
    }
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const minWithdraw = await db.getSetting('min_withdraw');
    const minAmount = minWithdraw || '1';
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return c.json({ error: `Minimum withdrawal is ${minAmount}` }, 400);
    }
    const feePct = parseFloat((await db.getSetting('withdrawal_fee_pct')) || '0') || 5;
    const fee = parseFloat(amount) * (feePct / 100);
    if (parseFloat(user.available_balance || '0') < parseFloat(amount)) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }
    // Withdraw PIN verification (4-6 digits stored per user in app_settings 'withdraw_pins')
    const digits = String(pin || '').replace(/[^0-9]/g, '');
    if (digits.length < 4 || digits.length > 6) {
      return c.json({ error: 'Please enter your 4-6 digit Withdraw PIN (set it in Personal Center)' }, 400);
    }
    const pinsRaw = await db.getSetting('withdraw_pins');
    let pins: Record<string, string> = {};
    try { pins = JSON.parse(pinsRaw); } catch { pins = {}; }
    const userPin = pins[String(userId)] || '';
    if (!userPin || userPin !== digits) {
      return c.json({ error: 'Withdraw PIN is incorrect' }, 403);
    }
    const withdrawal = await db.insert('withdrawals', {
      user_id: userId,
      amount,
      currency,
      wallet_address: addr,
      fee,
      status: 'processing',
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
  } catch (err) {
    console.error('[withdraw] error:', err instanceof Error ? err.message : err);
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/withdrawals/my-withdrawals', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const all = await db.select('withdrawals', { key: 'user_id', value: userId });
    const sorted = [...all]
      .map((r: any) => ({ ...r, created_at: r.created_at ?? r.requested_at ?? null }))
      .sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    return c.json({ withdrawals: toCamelList(sorted) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});
app.get('/api/withdrawals/my', async (c) => {
  return await (async () => {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const all = await db.select('withdrawals', { key: 'user_id', value: userId });
    const sorted = [...all]
      .map((r: any) => ({ ...r, created_at: r.created_at ?? r.requested_at ?? null }))
      .sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    return c.json({ withdrawals: toCamelList(sorted) });
  })();
});

// ---------- VIP Task ----------
const DEFAULT_VIP_PLANS = [
  { id: 1, name: 'VIP Bronze', depositAmount: 5, dailyEarnRate: 0.08, taskAmount: 0.10, maxDailyTasks: 5, validityDays: 60, status: 'active' },
  { id: 2, name: 'VIP Silver', depositAmount: 50, dailyEarnRate: 1.00, taskAmount: 1.20, maxDailyTasks: 8, validityDays: 60, status: 'active' },
  { id: 3, name: 'VIP Gold', depositAmount: 100, dailyEarnRate: 2.20, taskAmount: 2.60, maxDailyTasks: 10, validityDays: 120, status: 'active' },
  { id: 4, name: 'VIP Platinum', depositAmount: 300, dailyEarnRate: 7.50, taskAmount: 8.00, maxDailyTasks: 12, validityDays: 120, status: 'active' },
  { id: 5, name: 'VIP Diamond', depositAmount: 500, dailyEarnRate: 14.00, taskAmount: 15.00, maxDailyTasks: 15, validityDays: 240, status: 'active' },
  { id: 6, name: 'VIP Elite', depositAmount: 1000, dailyEarnRate: 35.00, taskAmount: 38.00, maxDailyTasks: 20, validityDays: 365, status: 'not_yet_active' },
];

async function getVipPlans(): Promise<any[]> {
  try {
    const raw = await db.getSetting('vip_plans');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* fall through */ }
  await db.upsertSetting('vip_plans', JSON.stringify(DEFAULT_VIP_PLANS));
  return DEFAULT_VIP_PLANS;
}

async function getVipPurchases(): Promise<any[]> {
  try {
    const raw = await db.getSetting('vip_purchases');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* fall through */ }
  return [];
}

async function saveVipPurchases(purchases: any[]): Promise<void> {
  await db.upsertSetting('vip_purchases', JSON.stringify(purchases));
}

/** Return the user's currently ACTIVE VIP plan (matching amount purchased & not expired), or null */
async function getActiveVip(userId: number): Promise<any | null> {
  let purchases = await getVipPurchases();
  const plans = await getVipPlans();
  const now = Date.now();
  let changed = false;
  for (const p of purchases) {
    if (Number(p.userId) !== Number(userId)) continue;
    if (p.status === 'active' && p.validUntil && new Date(p.validUntil).getTime() <= now) {
      p.status = 'expired';
      changed = true;
    }
  }
  if (changed) await saveVipPurchases(purchases);
  for (const p of purchases) {
    if (Number(p.userId) !== Number(userId)) continue;
    if (p.status !== 'active') continue;
    if (p.validUntil && new Date(p.validUntil).getTime() <= now) continue;
    const plan = plans.find((pl: any) => pl.name === p.planName);
    return plan ? { ...plan, purchasedAt: p.purchasedAt, validUntil: p.validUntil, purchaseId: p.id } : null;
  }
  return null;
}

app.get('/api/vip-plans', async (c) => {
  try {
    const plans = await getVipPlans();
    return c.json({ plans });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/vip-my', async (c) => {
  c.header('cache-control', 'no-store');
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const vip = await getActiveVip(userId);
    return c.json({ vip });
  } catch {
    return c.json({ vip: null });
  }
});

// ALL VIP purchases for the user (every purchase separately, for Records page)
app.get('/api/vip/purchases', async (c) => {
  c.header('cache-control', 'no-store');
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const purchases = await getVipPurchases();
    const rows = purchases
      .filter((p: any) => Number(p.userId) === Number(userId))
      .map((p: any) => ({
        id: Number(p.id),
        planName: p.planName,
        amount: Number(p.amount || 0),
        status: p.status || 'pending',
        purchasedAt: p.purchasedAt,
        validFrom: p.validFrom,
        validUntil: p.validUntil,
        validityDays: Number(p.validityDays || 0),
      }))
      .sort((a: any, b: any) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
    return c.json({ purchases: toCamelList(rows) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

/**
 * VIP purchase: user expresses intent to buy a VIP tier. The tier activates when
 * admin approves a recharge matching the plan's deposit amount (recharge decision
 * endpoint handles activation). VIP Elite ($1000) is not yet active.
 */
app.post('/api/vip-plans/:id/purchase', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const plans = await getVipPlans();
    const plan = plans.find((p: any) => Number(p.id) === parseInt(c.req.param('id')));
    if (!plan) return c.json({ error: 'Plan not found' }, 404);
    if (plan.status === 'not_yet_active') {
      return c.json({ error: 'This VIP tier is not yet active' }, 400);
    }
    const purchases = await getVipPurchases();
    // Repurchase rules (Round 22): any plan may be purchased up to 2 times per user
    // (lifetime, active or expired records both count). $1000 (VIP Elite) stays
    // not-yet-active. If the user has an ACTIVE purchase of the SAME plan, the new
    // intent EXTENDS that plan's validity by its validityDays instead of stacking.
    const samePlan = purchases.filter((p: any) => Number(p.userId) === Number(userId) && p.planName === plan.name && p.status !== 'cancelled');
    if (samePlan.length >= 2) {
      return c.json({ error: `Purchase limit reached — ${plan.name} may only be purchased twice (2x) per account.` }, 400);
    }
    const samePlanActive = samePlan.find((p: any) => p.status === 'active' && p.validUntil && new Date(p.validUntil).getTime() > Date.now());
    const pending = purchases.find((p: any) => Number(p.userId) === Number(userId) && p.status === 'pending');
    if (pending) pending.status = 'cancelled';
    if (samePlanActive) {
      samePlanActive.validUntil = new Date(Date.now() + Number(plan.validityDays) * 86400000).toISOString();
      await saveVipPurchases(purchases);
      return c.json({ success: true, plan, message: `Your ${plan.name} VIP validity has been extended by ${plan.validityDays} days. Recharge the plan amount and submit your receipt to confirm.` });
    }
    purchases.push({
      id: purchases.length ? Math.max(...purchases.map((p: any) => Number(p.id || 0))) + 1 : 1,
      userId,
      planName: plan.name,
      planId: Number(plan.id),
      amount: Number(plan.depositAmount),
      dailyEarnRate: Number(plan.dailyEarnRate),
      taskAmount: Number(plan.taskAmount),
      maxDailyTasks: Number(plan.maxDailyTasks),
      validityDays: Number(plan.validityDays),
      status: 'pending',
      purchasedAt: new Date().toISOString(),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + Number(plan.validityDays) * 86400000).toISOString(),
    });
    await saveVipPurchases(purchases);
    return c.json({ success: true, plan, message: 'VIP purchase intent recorded. Recharge the plan amount and submit your receipt — admin approval activates your VIP tasks.' });
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
  withdrawal_fee_pct: '5',
  video_pool: '',
  withdraw_pins: '',
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
    const videoPool = await getSetting('video_pool');
    const withdrawPins = await getSetting('withdraw_pins');
    return c.json({
      settings: {
        btc_wallet: btcWallet,
        trx_wallet: trxWallet,
        bnb_wallet: bnbWallet,
        min_withdrawal: minWithdraw,
        referral_bonus_pct: bonusPct,
        withdrawal_fee_pct: feePct,
        video_pool: videoPool,
        withdraw_pins: withdrawPins,
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
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct, withdrawalFeePct, videoPool } = body;
    if (btcWallet !== undefined) await db.upsertSetting('btc_wallet', btcWallet);
    if (trxWallet !== undefined) await db.upsertSetting('trx_wallet', trxWallet);
    if (bnbWallet !== undefined) await db.upsertSetting('bnb_wallet', bnbWallet);
    if (minWithdrawal !== undefined) await db.upsertSetting('min_withdraw', minWithdrawal);
    if (referralBonusPct !== undefined) await db.upsertSetting('referral_bonus_pct', referralBonusPct);
    if (withdrawalFeePct !== undefined) await db.upsertSetting('withdrawal_fee_pct', withdrawalFeePct);
    // Video pool: JSON array of YouTube/TikTok watch-video links (daily rotating)
    if (videoPool !== undefined) {
      const arr = Array.isArray(videoPool) ? videoPool : String(videoPool).split('\n').map((s: string) => s.trim()).filter(Boolean);
      if (arr.length === 0 || !arr.every((u: any) => typeof u === 'string' && /^https?:\/\//.test(u))) {
        return c.json({ error: 'videoPool must be a non-empty list of URLs starting with http' }, 400);
      }
      await db.upsertSetting('video_pool', JSON.stringify(arr));
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Ad-network payment channels ----------
const DEFAULT_AD_CHANNELS = [
  { id: 'adsterra', name: 'Adsterra', label: 'Adsterra', accountRef: '', enabled: false },
  { id: 'monetag', name: 'Monetag', label: 'Monetag', accountRef: '', enabled: false },
  { id: 'propellerads', name: 'PropellerAds', label: 'PropellerAds', accountRef: '', enabled: false },
  { id: 'adsense', name: 'Google AdSense', label: 'Google AdSense', accountRef: '', enabled: false },
  { id: 'medianet', name: 'Media.net', label: 'Media.net', accountRef: '', enabled: false },
  { id: 'admob', name: 'AdMob', label: 'AdMob', accountRef: '', enabled: false },
];
async function getAdChannels(): Promise<any[]> {
  try {
    const raw = await db.getSetting('ad_payment_channels');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty');
    return DEFAULT_AD_CHANNELS.map((d) => {
      const found = arr.find((x: any) => x && x.id === d.id);
      return { ...d, ...(found || {}) };
    });
  } catch {
    await db.upsertSetting('ad_payment_channels', JSON.stringify(DEFAULT_AD_CHANNELS));
    return DEFAULT_AD_CHANNELS;
  }
}
app.get('/api/ad-payment-channels', async (c) => {
  try {
    const channels = await getAdChannels();
    return c.json({ channels });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});
app.put('/api/admin/ad-payment-channels', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const incoming = Array.isArray(body?.channels) ? body.channels : body;
    const channels = await getAdChannels();
    const next = channels.map((d) => {
      const upd = incoming.find((x: any) => x && x.id === d.id);
      if (!upd) return d;
      return {
        ...d,
        accountRef: String(upd.accountRef ?? d.accountRef).trim(),
        enabled: Boolean(upd.enabled ?? d.enabled),
      };
    });
    await db.upsertSetting('ad_payment_channels', JSON.stringify(next));
    return c.json({ success: true, channels: next });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.get('/api/admin/users', async (c) => {
  c.header('cache-control', 'no-store');
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const allUsers = await db.select('users');
    const pinsRaw = await db.getSetting('withdraw_pins');
    let pins: Record<string, string> = {};
    try { pins = JSON.parse(pinsRaw); } catch { pins = {}; }
    const purchases = await getVipPurchases().catch(() => []);
    const plans = await getVipPlans().catch(() => []);
    const now = Date.now();
    // Batch all per-user selects into 3 queries to stay under Cloudflare's
    // per-invocation subrequest limit (N+1 would exceed it for large user bases).
    const userIds = allUsers.map((u: any) => u.id);
    const [allTasks, allWithdrawals, allDeposits] = await Promise.all([
      db.select('completions', { key: 'user_id', value: userIds }),
      db.select('withdrawals', { key: 'user_id', value: userIds }),
      db.select('recharges', { key: 'user_id', value: userIds }),
    ]);
    const tasksByUser = new Map<number, any[]>();
    for (const t of allTasks) { const k = Number(t.user_id); tasksByUser.set(k, [...(tasksByUser.get(k) || []), t]); }
    const wdByUser = new Map<number, any[]>();
    for (const w of allWithdrawals) { const k = Number(w.user_id); wdByUser.set(k, [...(wdByUser.get(k) || []), w]); }
    const depByUser = new Map<number, any[]>();
    for (const d of allDeposits) { const k = Number(d.user_id); depByUser.set(k, [...(depByUser.get(k) || []), d]); }
    const enriched = allUsers.map((u: any) => {
        const { password_hash: _ph, ...s } = u;
        const taskRows = tasksByUser.get(u.id) || [];
        const completedCount = taskRows.filter((comp: any) => comp.status === 'approved').length;
        const approvedCount = taskRows.filter((comp: any) => comp.status === 'approved' && comp.funding !== 'admin').length;
        const freeTasksCount = taskRows.filter((comp: any) => comp.status === 'approved' && comp.funding === 'admin').length;
        const wdRows = wdByUser.get(u.id) || [];
        const depositRows = depByUser.get(u.id) || [];
        const approvedDeposits = depositRows.filter((d: any) => d.status === 'approved');
        // Active VIP for this user
        let vipInfo: any = null;
        for (const p of purchases) {
          if (Number(p.userId) === Number(u.id) && p.status === 'active' && (!p.validUntil || new Date(p.validUntil).getTime() > now)) {
            const plan = plans.find((pl: any) => pl.name === p.planName);
            vipInfo = plan ? { planName: plan.name, depositAmount: plan.depositAmount, dailyEarnRate: plan.dailyEarnRate, taskAmount: plan.taskAmount, validityDays: plan.validityDays, validUntil: p.validUntil, daysLeft: Math.max(0, Math.ceil((new Date(p.validUntil).getTime() - now) / 86400000)) } : null;
            break;
          }
        }
        return {
          ...s,
          completedTasksCount: completedCount,
          approvedTasksCount: approvedCount,
          freeTasksCount,
          completedTasksAmount: Number(taskRows.filter((comp: any) => comp.status === 'approved').reduce((acc, comp) => acc + Number(comp.reward || 0), 0)),
          withdrawalsCount: wdRows.length,
          withdrawalsAmount: wdRows.reduce((acc, w) => acc + Number(w.amount || 0), 0),
          depositsCount: approvedDeposits.length,
          depositsAmount: approvedDeposits.reduce((acc, d) => acc + Number(d.amount || 0), 0),
          registerTime: u.created_at || null,
          hasPin: Boolean(pins[String(u.id)]),
          vip: vipInfo,
        };
    });
    return c.json({ users: enriched });
  } catch (err) {
    console.error('[admin/users] error:', err instanceof Error ? err.message : err);
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

// ---------- Admin self top-up (Round 22) — admin adds any amount to his OWN balance ----------
app.post('/api/admin/self-topup', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const userId = (c as any).user.id;
    const body = b(c);
    const amount = parseFloat(body?.amount);
    if (isNaN(amount) || amount <= 0 || amount > 10000000) {
      return c.json({ error: 'Invalid amount (must be > 0)' }, 400);
    }
    const rows = await db.select('users', { key: 'id', value: userId });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const newBalance = (parseFloat(user.available_balance || '0') + amount).toFixed(4);
    await db.updateById('users', user.id, { available_balance: newBalance });
    return c.json({ success: true, newBalance: parseFloat(newBalance) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});
// ---------- Admin unlimited top-up ----------
app.post('/api/admin/users/:id/topup', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const amount = parseFloat(body?.amount);
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      return c.json({ error: 'Invalid amount (must be > 0)' }, 400);
    }
    const reason = String(body?.reason || '').trim() || 'Admin top-up';
    const rows = await db.select('users', { key: 'id', value: parseInt(c.req.param('id')) });
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const newBalance = (parseFloat(user.available_balance || '0') + amount).toFixed(4);
    await db.updateById('users', user.id, { available_balance: newBalance });
    try {
      await db.insertNotification({
        user_id: user.id,
        title: 'Balance Top-Up',
        body: `Admin added $${amount.toFixed(2)} to your account (${reason}). Your balance is now $${newBalance}.`,
        kind: 'info',
      });
    } catch { /* notifications table may not exist yet */ }
    return c.json({ success: true, newBalance: parseFloat(newBalance) });
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
// One-off admin SQL migration endpoint: creates the notifications table if missing.
// Safe to call repeatedly; guarded by admin-only + allowlist of DDL statements.
const ALLOWED_MIGRATION_SQL = [
  "CREATE TABLE IF NOT EXISTS public.notifications",
  "CREATE TABLE IF NOT EXISTS notifications",
];
app.post('/api/admin/sql-migrate', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const sql = String(body?.sql || '');
    const ok = ALLOWED_MIGRATION_SQL.some((prefix) => sql.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!ok) return c.json({ error: 'SQL not allowed (whitelist: CREATE TABLE IF NOT EXISTS notifications)' }, 400);
    // Attempt the migration via a controlled Supabase call using an existing helper.
    // We implement the equivalent DDL with a raw HTTP call to the Supabase management-free
    // approach: use the edge runtime fetch against the postgres REST via existing client
    // by inserting a dummy row that would fail if the table does not exist, then run the
    // CREATE via the same RPC path is unavailable; instead, the worker creates the table
    // through the Supabase REST 'rpc' of pg_migrate is not enabled on this project, so we
    // perform the migration here only if the table is missing, using direct HTTP to the
    // Supabase REST schema endpoint is read-only. Therefore we rely on the fact that the
    // Supabase project admin has the SQL editor: we record the intent and return the exact
    // SQL for the admin to run once. To automate fully we add a retry-safe path:
    // attempt insertNotification-style probe; on PGRST200 return the SQL text.
    const probe = await db.select('notifications', { key: 'id', value: -1 }).catch(() => null);
    if (probe !== null) return c.json({ success: true, note: 'notifications table already exists' });
    return c.json({ success: false, note: 'table-missing', sql, instruction: 'Run the returned SQL in the Supabase SQL Editor once' });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});
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
    return c.json({ notifications: toCamelList(rows) });
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

// ---------- Recharge / Deposit ----------
// Receipt images are stored as base64 inside Postgres app_settings rows
// (keyed per recharge id) since this deployment has no R2 bucket. Postgres
// text columns comfortably hold multi-MB payloads.
const RECEIPT_SETTING_PREFIX = 'recharge_receipt:';
async function setReceiptStorage(id: number, base64: string, mime: string): Promise<void> {
  await db.upsertSetting(`${RECEIPT_SETTING_PREFIX}${id}`, JSON.stringify({ b64: base64, mime }));
}
async function getReceiptStorage(id: number): Promise<{ b64: string; mime: string } | null> {
  try {
    const raw = await db.getSetting(`${RECEIPT_SETTING_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { b64: String(parsed?.b64 || ''), mime: String(parsed?.mime || 'image/png') };
  } catch {
    return null;
  }
}
async function delReceiptStorage(id: number): Promise<void> {
  try {
    await db.deleteSetting(`${RECEIPT_SETTING_PREFIX}${id}`);
  } catch {
    // no-op
  }
}

const VALID_PRESETS = [5, 50, 100, 300, 500, 1000];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

app.post('/api/recharges', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const body = b(c);
    const amount = parseFloat(body?.amount);
    const method = String(body?.paymentMethod || '').toUpperCase();
    const txRef = String(body?.txRef || '').trim();
    const receiptBase64 = String(body?.receiptBase64 || '');
    const receiptMime = String(body?.receiptMime || 'image/png');
    if (!VALID_PRESETS.includes(amount) && amount < 5) {
      return c.json({ error: 'Minimum deposit is $5' }, 400);
    }
    if (isNaN(amount) || amount <= 0 || amount > 50000) {
      return c.json({ error: 'Invalid amount' }, 400);
    }
    if (!['TRX', 'BTC', 'USDT'].includes(method)) {
      return c.json({ error: 'Invalid payment method' }, 400);
    }
    if (!receiptBase64 || receiptBase64.length > MAX_RECEIPT_BYTES) {
      return c.json({ error: 'Receipt image missing or too large (max 5MB)' }, 400);
    }
    if (!receiptMime.startsWith('image/')) {
      return c.json({ error: 'Receipt must be an image' }, 400);
    }
    // CF `recharges` schema: id, user_id, amount (numeric), coin (text, default TRX),
    // receipt_url (text — base64 payload), status, reviewed_at, created_at
    const recharge = await db.insert('recharges', {
      user_id: userId,
      amount,
      coin: method,
      receipt_url: `data:${receiptMime};base64,${receiptBase64}`,
      status: 'pending',
    });
    return c.json({ recharge: toCamel(recharge || { id: (recharge as any)?.id }), message: 'Deposit submitted — admin will review your receipt' });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// Convert any video pool URL (YouTube watch/shorts/youtu.be, TikTok) into an
// iframe-embeddable URL so it renders inline in TaskDetail.
function embeddableUrl(url: string): string {
  const s = String(url || '').trim();
  if (!s) return '';
  // YouTube: watch?v= / shorts/ / youtu.be/
  let m = s.match(/youtube\.com\/watch\?v=([\w-]+)/) ||
    s.match(/youtube\.com\/shorts\/([\w-]+)/) ||
    s.match(/youtu\.be\/([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // TikTok: extract numeric video id for the embed player
  m = s.match(/tiktok\.com\/(@[^/]+\/video\/(\d+))/);
  if (m) return `https://www.tiktok.com/player/v1/${m[2]}`;
  // Unknown format: pass through (client falls back to an open-in-new-tab link)
  return s;
}

app.get('/api/recharges/my', async (c) => {
  try {
    const userId = (c as any).user?.id;
    if (!userId) return c.json({ error: 'Not authenticated' }, 401);
    const rows = await db.select('recharges', { key: 'user_id', value: userId });
    const sorted = [...rows].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    return c.json({ recharges: toCamelList(sorted) });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

// ---------- Video pool: daily rotating watch-video URL (Round 11) ----------
// Pool lives in app_settings.video_pool as a JSON array of YouTube/TikTok links.
// Each user gets a different pick per day (deterministic hash of date + user id).
app.get('/api/video-pool', async (c) => {
  try {
    let pool: string[] = [];
    try {
      const raw = await db.getSetting('video_pool');
      if (raw) pool = JSON.parse(raw);
    } catch { pool = []; }
    if (!Array.isArray(pool) || pool.length === 0) {
      return c.json({ videoUrl: '' });
    }
    const d = new Date();
    const seedStr = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}:${(c as any).user?.id || 'anon'}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
    const rawUrl = pool[Math.abs(hash) % pool.length];
    return c.json({ videoUrl: embeddableUrl(rawUrl) });
  } catch {
    return c.json({ videoUrl: '' });
  }
});

// ---------- Admin: deposit review ----------
app.get('/api/admin/recharges', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const rows = await db.select('recharges');
    const sorted = [...rows].sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    const enriched: any[] = [];
    for (const row of sorted) {
      const users = await db.select('users', { key: 'id', value: row.user_id });
      const user = users[0] || null;
      const camel = toCamel(row);
      // Map legacy/CF column names to the UI's expected field names
      camel.paymentMethod = row.coin || camel.coin || null;
      camel.txRef = null;
      const rawReceipt = row.receipt_url || camel.receiptUrl || '';
      camel.receiptUrl = String(rawReceipt).startsWith('data:') ? String(rawReceipt) : rawReceipt ? `data:image/png;base64,${rawReceipt}` : null;
      camel.receiptMime = null;
      camel.adminNote = row.admin_note || camel.adminNote || null;
      enriched.push({
        ...camel,
        userName: user ? (user.username || user.full_name || user.email || `User #${user.id}`) : null,
        userEmail: user?.email || null,
      });
    }
    return c.json({ recharges: enriched });
  } catch {
    return c.json({ error: 'Internal error' }, 500);
  }
});

app.put('/api/admin/recharges/:id/decision', async (c) => {
  try {
    if (!adminGuard(c)) return c.json({ error: 'Admin only' }, 403);
    const body = b(c);
    const decision = String(body?.decision || '');
    const note = String(body?.note || '').trim();
    if (!['approved', 'rejected'].includes(decision)) {
      return c.json({ error: 'Invalid decision (approved|rejected)' }, 400);
    }
    const rows = await db.select('recharges', { key: 'id', value: parseInt(c.req.param('id')) });
    const recharge = rows[0];
    if (!recharge) return c.json({ error: 'Not found' }, 404);
    await db.updateById('recharges', recharge.id, {
      status: decision,
      reviewed_at: new Date().toISOString(),
    });
    if (decision === 'approved') {
      const amount = parseFloat(recharge.amount || '0');
      const userRows = await db.select('users', { key: 'id', value: recharge.user_id });
      const user = userRows[0];
      if (user) {
        await db.updateById('users', user.id, {
          deposit_amount: (parseFloat(user.deposit_amount || '0') + amount).toFixed(2),
          has_recharged: true,
        });
      }
      // VIP auto-activation: if the approved deposit amount matches a VIP plan,
      // activate that VIP plan now (existing pending purchase becomes active;
      // if none exists yet, a new active purchase is created automatically).
      try {
        let purchases = await getVipPurchases();
        const plans = await getVipPlans();
        const matchPlan = plans.find((p: any) => Number(p.depositAmount) === amount && p.status === 'active');
        if (matchPlan) {
          const existingActive = purchases.find((p: any) => Number(p.userId) === Number(recharge.user_id) && p.status === 'active' && p.planName === matchPlan.name);
          if (!existingActive) {
            const pending = purchases.find((p: any) => Number(p.userId) === Number(recharge.user_id) && p.status === 'pending' && Number(p.amount) === amount);
            if (pending) {
              pending.status = 'active';
              pending.validFrom = new Date().toISOString();
              pending.validUntil = new Date(Date.now() + Number(pending.validityDays) * 86400000).toISOString();
            } else {
              // No pending purchase — create the active VIP plan automatically
              const nextId = purchases.length ? Math.max(...purchases.map((p: any) => Number(p.id || 0))) + 1 : 1;
              purchases.push({
                id: nextId,
                userId: recharge.user_id,
                planName: matchPlan.name,
                planId: Number(matchPlan.id),
                amount: amount,
                dailyEarnRate: Number(matchPlan.dailyEarnRate),
                taskAmount: Number(matchPlan.taskAmount),
                maxDailyTasks: Number(matchPlan.maxDailyTasks),
                validityDays: Number(matchPlan.validityDays),
                status: 'active',
                purchasedAt: new Date().toISOString(),
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + Number(matchPlan.validityDays) * 86400000).toISOString(),
              });
            }
            await saveVipPurchases(purchases);
            try {
              await db.insertNotification({
                user_id: recharge.user_id,
                title: 'VIP Task Activated',
                body: `Your deposit of $${amount.toFixed(2)} activated ${matchPlan.name}. Your VIP tasks now pay directly to your wallet!`,
                kind: 'info',
              });
            } catch { /* notifications table may not exist yet */ }
          }
        }
      } catch { /* VIP activation is best-effort */ }
      try {
        await db.insertNotification({
          user_id: recharge.user_id,
          title: 'Deposit Approved',
          body: `Your deposit of $${amount.toFixed(2)} (${recharge.coin || 'crypto'}) has been approved. Your tasks are now unlocked.`,
          kind: 'info',
        });
      } catch { /* notifications table may not exist yet */ }
    } else {
      try {
        await db.insertNotification({
          user_id: recharge.user_id,
          title: 'Deposit Not Approved',
          body: note
            ? `Your deposit receipt was not approved: ${note}. Please re-upload a valid receipt.`
            : 'Your deposit receipt was not approved. Please re-upload a valid receipt.',
          kind: 'info',
        });
      } catch { /* notifications table may not exist yet */ }
    }
    // Free storage for decided receipts
    if (recharge.id) await delReceiptStorage(recharge.id);
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
        const assetReq = new Request(targetUrl, { headers: (c.req.raw as Request).headers });
        const assetRes = await assets.fetch(assetReq);
        if (assetRes.status === 404) {
          // SPA fallback even for static paths missing in the pipeline
          const idx = await assets.fetch(new Request(new URL("/index.html", c.req.url).toString(), { headers: (c.req.raw as Request).headers }));
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
