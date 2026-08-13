var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt2 from "jsonwebtoken";
import fs from "fs";

// server/routers/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  completionStatusEnum: () => completionStatusEnum,
  currencyEnum: () => currencyEnum,
  settings: () => settings,
  taskCompletions: () => taskCompletions,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  users: () => users,
  withdrawalStatusEnum: () => withdrawalStatusEnum,
  withdrawals: () => withdrawals
});
import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
var currencyEnum = pgEnum("currency", ["BTC", "USDT", "TRX"]);
var taskStatusEnum = pgEnum("task_status", ["active", "paused", "completed"]);
var completionStatusEnum = pgEnum("completion_status", ["pending", "approved", "rejected"]);
var withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected", "paid"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  // 'admin' | 'user'
  btcAddress: text("btc_address").default(""),
  usdtAddress: text("usdt_address").default(""),
  trxAddress: text("trx_address").default(""),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by").references(() => users.id),
  referralBonus: numeric("referral_bonus", { precision: 18, scale: 8 }).default("0"),
  totalEarned: numeric("total_earned", { precision: 18, scale: 8 }).default("0"),
  availableBalance: numeric("available_balance", { precision: 18, scale: 8 }).default("0"),
  createdAt: timestamp("created_at").defaultNow()
});
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  reward: numeric("reward", { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  timeLimit: integer("time_limit").notNull(),
  // in seconds
  imageUrl: text("image_url").default(""),
  status: taskStatusEnum("status").notNull().default("active"),
  requiredProof: text("required_proof").notNull(),
  // 'screenshot', 'link', 'text'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var taskCompletions = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  proof: text("proof").notNull(),
  proofImageUrl: text("proof_image_url").default(""),
  status: completionStatusEnum("status").notNull().default("pending"),
  reward: numeric("reward", { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at")
});
var withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  walletAddress: text("wallet_address").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  txHash: text("tx_hash").default(""),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at")
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull()
});

// server/db.ts
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dataplus_ai",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : void 0
});
var db = drizzle(pool, { schema: schema_exports });

// server/routers/auth.ts
import { eq, sql } from "drizzle-orm";
var router = Router();
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }
    const existing = await db.select().from(users).where(
      sql`${users.username} = ${username} OR ${users.email} = ${email}`
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const refCode = nanoid(8).toUpperCase();
    let referredBy = null;
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
      referredBy
    }).returning();
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || "dataplus-ai-secret",
      { expiresIn: "30d" }
    );
    const { passwordHash: _, ...safeUser } = newUser;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "dataplus-ai-secret",
      { expiresIn: "30d" }
    );
    const { passwordHash: _, ...safeUser2 } = user;
    res.json({ user: safeUser2, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/me", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router.put("/profile", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { btcAddress, usdtAddress, trxAddress } = req.body;
    const updates = {};
    if (btcAddress !== void 0) updates.btcAddress = btcAddress;
    if (usdtAddress !== void 0) updates.usdtAddress = usdtAddress;
    if (trxAddress !== void 0) updates.trxAddress = trxAddress;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/overview", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const completions = await db.select().from(taskCompletions).where(eq(taskCompletions.userId, userId));
    const completedCount = completions.filter((c) => c.status === "approved").length;
    const pendingCount = completions.filter((c) => c.status === "pending").length;
    const { passwordHash: _, ...safeUser } = user;
    res.json({
      user: safeUser,
      overview: {
        totalEarned: user.totalEarned,
        availableBalance: user.availableBalance,
        referralBonus: user.referralBonus,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/tasks.ts
import { Router as Router2 } from "express";
import { eq as eq2, sql as sql2 } from "drizzle-orm";
var router2 = Router2();
router2.get("/", async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks).where(eq2(tasks.status, "active"));
    res.json({ tasks: allTasks });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.get("/:id", async (req, res) => {
  try {
    const [task] = await db.select().from(tasks).where(eq2(tasks.id, parseInt(req.params.id)));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.post("/complete", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { taskId, proof } = req.body;
    const [task] = await db.select().from(tasks).where(eq2(tasks.id, taskId));
    if (!task) return res.status(404).json({ error: "Task not found" });
    const existing = await db.select().from(taskCompletions).where(
      sql2`${taskCompletions.userId} = ${userId} AND ${taskCompletions.taskId} = ${taskId}`
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Task already completed" });
    }
    const [completion] = await db.insert(taskCompletions).values({
      userId,
      taskId,
      proof,
      reward: task.reward,
      currency: task.currency
    }).returning();
    res.json({ completion });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.get("/my-completions", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const completions = await db.select().from(taskCompletions).where(eq2(taskCompletions.userId, userId));
    res.json({ completions });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/referral.ts
import { Router as Router3 } from "express";
import { eq as eq3, sql as sql3, count } from "drizzle-orm";
var router3 = Router3();
router3.get("/setup", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(users).where(eq3(users.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const domain = process.env.APP_DOMAIN || "dataplus-ai.koyeb.app";
    const referralLink = `https://${domain}/?ref=${user.referralCode}`;
    res.json({
      referralCode: user.referralCode,
      referralLink,
      referralUrl: referralLink
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router3.get("/my-referrals", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const referrals = await db.select().from(users).where(eq3(users.referredBy, userId));
    res.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserName: r.username || r.email,
        createdAt: r.createdAt,
        status: "earned",
        bonusEarned: "0.01"
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router3.get("/my", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(users).where(eq3(users.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const referrals = await db.select({ count: count() }).from(users).where(eq3(users.referredBy, userId));
    const domain = process.env.APP_DOMAIN || "dataplus-ai.koyeb.app";
    const referralLink = `https://${domain}/?ref=${user.referralCode}`;
    res.json({
      referralCode: user.referralCode,
      referralLink,
      referralCount: referrals[0]?.count || 0,
      referralBonus: user.referralBonus
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router3.post("/register-with-code", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { referralCode } = req.body;
    if (!userId || !referralCode) return res.status(400).json({ error: "Missing params" });
    const [user] = await db.select().from(users).where(eq3(users.id, userId));
    if (user?.referredBy) return res.json({ success: false, message: "Already has referrer" });
    const referrer = await db.select().from(users).where(eq3(users.referralCode, referralCode));
    if (referrer.length === 0) return res.status(404).json({ error: "Invalid referral code" });
    if (referrer[0].id === userId) return res.status(400).json({ error: "Cannot refer yourself" });
    await db.update(users).set({ referredBy: referrer[0].id }).where(eq3(users.id, userId));
    const bonus = "0.01";
    await db.update(users).set({ referralBonus: sql3`${users.referralBonus} + ${bonus}` }).where(eq3(users.id, referrer[0].id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/admin.ts
import { Router as Router4 } from "express";
import { eq as eq4, sql as sql4 } from "drizzle-orm";
var DEFAULT_SETTINGS = {
  btc_wallet: "bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct",
  trx_wallet: "TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4",
  bsc_wallet: "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8",
  bnb_wallet: "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8",
  min_withdraw: "5.00",
  referral_bonus_pct: "10"
};
async function getSetting(key) {
  try {
    const rows = await db.select().from(settings).where(eq4(settings.key, key));
    return rows[0]?.value || DEFAULT_SETTINGS[key] || "";
  } catch {
    return DEFAULT_SETTINGS[key] || "";
  }
}
async function setSetting(key, value) {
  try {
    const existing = await db.select().from(settings).where(eq4(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq4(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  } catch (err) {
    console.error(`Failed to set setting ${key}:`, err);
  }
}
function adminGuard(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}
var router4 = Router4();
router4.get("/stats", adminGuard, async (req, res) => {
  try {
    const [userCount] = await db.select({ count: sql4`count(*)` }).from(users);
    const [completedCount] = await db.select({ count: sql4`count(*)` }).from(taskCompletions).where(eq4(taskCompletions.status, "approved"));
    const [pendingWd] = await db.select({ count: sql4`count(*)` }).from(withdrawals).where(eq4(withdrawals.status, "pending"));
    const [totalEarned] = await db.select({ total: sql4`COALESCE(SUM(amount), '0')` }).from(withdrawals).where(eq4(withdrawals.status, "paid"));
    res.json({
      totalUsers: userCount.count || 0,
      completedTasks: completedCount.count || 0,
      pendingWithdrawals: pendingWd.count || 0,
      totalEarned: totalEarned.total || "0"
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.post("/tasks", adminGuard, async (req, res) => {
  try {
    const { title, description, category, reward, currency, timeLimit, requiredProof, imageUrl } = req.body;
    const [task] = await db.insert(tasks).values({
      title,
      description,
      category,
      reward,
      currency,
      timeLimit,
      requiredProof,
      imageUrl: imageUrl || ""
    }).returning();
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/tasks", adminGuard, async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks);
    res.json({ tasks: allTasks });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/tasks/:id", adminGuard, async (req, res) => {
  try {
    await db.update(tasks).set(req.body).where(eq4(tasks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.delete("/tasks/:id", adminGuard, async (req, res) => {
  try {
    await db.delete(tasks).where(eq4(tasks.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/completions/pending", adminGuard, async (req, res) => {
  try {
    const pending = await db.select().from(taskCompletions).where(eq4(taskCompletions.status, "pending"));
    const enriched = [];
    for (const comp of pending) {
      const [task] = await db.select().from(tasks).where(eq4(tasks.id, comp.taskId));
      const [user] = await db.select().from(users).where(eq4(users.id, comp.userId));
      enriched.push({
        ...comp,
        taskTitle: task?.title || "Unknown Task",
        userName: user?.username || "Unknown",
        userEmail: user?.email || ""
      });
    }
    res.json({ completions: enriched });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/completions/:id/review", adminGuard, async (req, res) => {
  try {
    const { status } = req.body;
    const [completion] = await db.select().from(taskCompletions).where(eq4(taskCompletions.id, parseInt(req.params.id)));
    if (!completion) return res.status(404).json({ error: "Not found" });
    await db.update(taskCompletions).set({ status, reviewedAt: /* @__PURE__ */ new Date() }).where(eq4(taskCompletions.id, completion.id));
    if (status === "approved") {
      await db.update(users).set({ totalEarned: sql4`${users.totalEarned} + ${completion.reward}`, availableBalance: sql4`${users.availableBalance} + ${completion.reward}` }).where(eq4(users.id, completion.userId));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/withdrawals", adminGuard, async (req, res) => {
  try {
    const all = await db.select().from(withdrawals);
    const enriched = [];
    for (const wd of all) {
      const [user] = await db.select().from(users).where(eq4(users.id, wd.userId));
      enriched.push({ ...wd, userName: user?.username || "Unknown", userEmail: user?.email || "" });
    }
    res.json({ withdrawals: enriched });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/withdrawals/:id", adminGuard, async (req, res) => {
  try {
    const { status, txHash } = req.body;
    await db.update(withdrawals).set({ status, txHash: txHash || "", processedAt: /* @__PURE__ */ new Date() }).where(eq4(withdrawals.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/settings", adminGuard, async (req, res) => {
  try {
    const btcWallet = await getSetting("btc_wallet");
    const trxWallet = await getSetting("trx_wallet");
    const bnbWallet = await getSetting("bnb_wallet");
    const minWithdraw = await getSetting("min_withdraw");
    const bonusPct = await getSetting("referral_bonus_pct");
    res.json({
      settings: {
        btc_wallet: btcWallet,
        trx_wallet: trxWallet,
        bnb_wallet: bnbWallet,
        min_withdrawal: minWithdraw,
        referral_bonus_pct: bonusPct
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/settings", adminGuard, async (req, res) => {
  try {
    const { btcWallet, trxWallet, bnbWallet, minWithdrawal, referralBonusPct } = req.body;
    if (btcWallet !== void 0) await setSetting("btc_wallet", btcWallet);
    if (trxWallet !== void 0) await setSetting("trx_wallet", trxWallet);
    if (bnbWallet !== void 0) await setSetting("bnb_wallet", bnbWallet);
    if (minWithdrawal !== void 0) await setSetting("min_withdraw", minWithdrawal);
    if (referralBonusPct !== void 0) await setSetting("referral_bonus_pct", referralBonusPct);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/users", adminGuard, async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json({ users: allUsers });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/users/:id/role", adminGuard, async (req, res) => {
  try {
    const { role } = req.body;
    await db.update(users).set({ role }).where(eq4(users.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/settings.ts
import { Router as Router5 } from "express";
import { eq as eq5, sql as sql5 } from "drizzle-orm";
var router5 = Router5();
router5.post("/withdraw", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { amount, currency, walletAddress } = req.body;
    const [user] = await db.select().from(users).where(eq5(users.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const minWithdraw = await db.select().from(settings).where(eq5(settings.key, "min_withdraw"));
    const minAmount = minWithdraw[0]?.value || "1";
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minAmount}` });
    }
    if (parseFloat(user.availableBalance || "0") < parseFloat(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    const [withdrawal] = await db.insert(withdrawals).values({
      userId,
      amount,
      currency,
      walletAddress
    }).returning();
    await db.update(users).set({ availableBalance: sql5`${users.availableBalance} - ${amount}` }).where(eq5(users.id, userId));
    res.json({ withdrawal });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router5.get("/my-withdrawals", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const all = await db.select().from(withdrawals).where(eq5(withdrawals.userId, userId));
    res.json({ withdrawals: all });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router5.get("/admin-wallets", async (req, res) => {
  try {
    const btcSetting = await db.select().from(settings).where(eq5(settings.key, "btc_wallet"));
    const trxSetting = await db.select().from(settings).where(eq5(settings.key, "trx_wallet"));
    const bscSetting = await db.select().from(settings).where(eq5(settings.key, "bsc_wallet"));
    const bnbSetting = await db.select().from(settings).where(eq5(settings.key, "bnb_wallet"));
    res.json({
      btc: btcSetting[0]?.value || "bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct",
      trx: trxSetting[0]?.value || "TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4",
      usdt: bscSetting[0]?.value || "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8",
      bnb: bnbSetting[0]?.value || "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8"
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/share.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/links", (req, res) => {
  const domain = process.env.APP_DOMAIN || "dataplus-ai.koyeb.app";
  const base = `https://${domain}`;
  res.json({
    links: {
      whatsapp: "https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i",
      platform: base,
      name: "AI COMPUTER PLUS"
    }
  });
});

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "production") {
  const possiblePaths = [
    path.join(__dirname, "..", "client", "dist"),
    // dev mode: server/index.ts -> project root -> client/dist
    path.join(__dirname, "..", "dist", "client"),
    // Koyeb: dist/server/index.js -> dist -> client (via build:full)
    path.join(process.cwd(), "client", "dist")
    // fallback: cwd/client/dist
  ];
  const clientDist = possiblePaths.find((p) => {
    try {
      return fs.existsSync(path.join(p, "index.html"));
    } catch {
      return false;
    }
  }) || possiblePaths[0];
  app.use(express.static(clientDist));
}
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt2.verify(token, process.env.JWT_SECRET || "dataplus-ai-secret");
      req.user = decoded;
    } catch {
    }
  }
  next();
});
app.use("/api/auth", router);
app.use("/api/tasks", router2);
app.use("/api/referral", router3);
app.use("/api/admin", router4);
app.use("/api/settings", router5);
app.use("/api/withdrawals", router5);
app.use("/api/share", router6);
if (process.env.NODE_ENV === "production") {
  const possiblePaths = [
    path.join(__dirname, "..", "client", "dist"),
    path.join(__dirname, "..", "dist", "client"),
    path.join(process.cwd(), "client", "dist")
  ];
  const clientDist = possiblePaths.find((p) => {
    try {
      return fs.existsSync(path.join(p, "index.html"));
    } catch {
      return false;
    }
  }) || possiblePaths[0];
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
app.listen(PORT, () => {
  console.log(`\u{1F680} Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`);
});
