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
import { createClient } from "@supabase/supabase-js";
function envVal(key) {
  try {
    const reqEnv = typeof globalThis !== "undefined" ? globalThis.__cf_req_env : void 0;
    if (reqEnv && typeof reqEnv === "object" && typeof reqEnv[key] === "string" && reqEnv[key].length > 0) {
      return reqEnv[key];
    }
  } catch {
  }
  try {
    if (typeof globalThis !== "undefined" && globalThis.env) {
      const v = globalThis.env[key];
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch {
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) return process.env[key];
  return void 0;
}
var supabase = null;
var cachedKey = "";
var FALLBACK_KEYS = {
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438",
  JWT_SECRET: "dataplus-ai-secret"
};
var isPlaceholder = (v) => !v || v.startsWith("<SET-IN") || v.startsWith("DASH:");
var SUPABASE_URL = "https://uqtirisxgqmhxupncink.supabase.co";
function getSupabase() {
  let key = envVal("SUPABASE_SERVICE_ROLE_KEY") || envVal("SUPABASE_ANON_KEY") || "";
  if (isPlaceholder(key)) key = FALLBACK_KEYS.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabase || key !== cachedKey) {
    if (!key) {
      console.warn("\u26A0\uFE0F  SUPABASE_SERVICE_ROLE_KEY not set \u2014 database operations will fail");
    }
    supabase = createClient(SUPABASE_URL, key);
    cachedKey = key;
  }
  return supabase;
}
var db = {
  /** Generic select wrapper returning rows */
  select: async (table, filter) => {
    const supabase2 = getSupabase();
    let req = supabase2.from(table).select("*");
    if (filter) {
      if (Array.isArray(filter.value) && filter.value.length) {
        req = req.in(filter.key, filter.value);
      } else {
        req = req.eq(filter.key, filter.value);
      }
    }
    const result = await req;
    if (result.error) {
      if (result.error.code === "PGRST116") return [];
      const err = new Error(`select ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
    return result.data ?? [];
  },
  /** Insert one row, returns the inserted row */
  insert: async (table, values) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from(table).insert(values).select().single();
    if (result.error) {
      const err = new Error(`insert ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
    return result.data;
  },
  /** Update a single row by primary key, returns the updated row */
  updateById: async (table, id, set) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from(table).update(set).eq("id", id).select().maybeSingle();
    if (result.error) {
      const err = new Error(`update ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
    return result.data ?? null;
  },
  /** Update rows matching a filter (key/value) */
  update: async (table, filterKey, filterValue, set) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from(table).update(set).eq(filterKey, filterValue);
    if (result.error) {
      const err = new Error(`update ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
  },
  /** Delete a row by primary key */
  deleteById: async (table, id) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from(table).delete().eq("id", id);
    if (result.error) {
      const err = new Error(`delete ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
  },
  /** Count rows, optionally filtered */
  count: async (table, filterKey, filterValue) => {
    const supabase2 = getSupabase();
    let req = supabase2.from(table).select("*", { count: "exact", head: true });
    if (filterKey) req = req.eq(filterKey, filterValue);
    const result = await req;
    if (result.error) {
      if (result.error.code === "PGRST116") return 0;
      const err = new Error(`count ${table}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
    return result.count ?? 0;
  },
  /** Sum a numeric column over filtered rows, returns string */
  sum: async (table, column, filterKey, filterValue) => {
    const supabase2 = getSupabase();
    let req = supabase2.from(table).select(`${column}`);
    if (filterKey) req = req.eq(filterKey, filterValue);
    const result = await req;
    if (result.error) {
      if (result.error.code === "PGRST116") return "0";
      const err = new Error(`sum ${table}.${column}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
    const rows = result.data;
    if (!rows || rows.length === 0) return "0";
    const total = rows.reduce((acc, row) => acc + (parseFloat(String(row[column])) || 0), 0);
    return String(total);
  },
  /** Delete an app_settings row by key (used for receipt cleanup after review) */
  deleteSetting: async (key) => {
    const supabase2 = getSupabase();
    await supabase2.from("app_settings").delete().eq("key", key);
  },
  /** Upsert an app_settings row */
  upsertSetting: async (key, value) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from("app_settings").upsert({ key, value }, { onConflict: "key" }).select().maybeSingle();
    if (result.error) {
      const err = new Error(`upsertSetting ${key}: ${result.error.message}`);
      err.code = result.error.code;
      throw err;
    }
  },
  /**
   * Notifications layer — graceful if the `notifications` table does not exist yet.
   * The table is created by supabase/migrations/002_notifications.sql in the
   * Supabase SQL Editor. Until then, notification APIs return empty lists / ok.
   */
  insertNotification: async (row) => {
    try {
      const supabase2 = getSupabase();
      const result = await supabase2.from("notifications").insert({
        user_id: row.user_id ?? null,
        title: row.title,
        message: row.body ?? "",
        is_broadcast: row.user_id == null,
        read_status: false
      });
      if (result.error && result.error.code === "PGRST200") {
        console.warn("notifications table missing \u2014 notification not stored");
        return { ok: false };
      }
      if (result.error) {
        const err = new Error(`insertNotification: ${result.error.message}`);
        err.code = result.error.code;
        throw err;
      }
      return { ok: true };
    } catch (e) {
      if (e?.code === "PGRST205" || String(e?.message || "").includes("Could not find the table")) {
        return { ok: false };
      }
      throw e;
    }
  },
  listNotificationsForUser: async (userId) => {
    try {
      const rows = await db.select("notifications");
      const mine = (rows || []).filter((r) => r.user_id == null || r.user_id === userId);
      return mine.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  },
  listAllNotifications: async () => {
    try {
      return await db.select("notifications");
    } catch {
      return [];
    }
  },
  markNotificationRead: async (id) => {
    try {
      await db.updateById("notifications", id, { read_status: true });
    } catch {
    }
  },
  deleteNotification: async (id) => {
    try {
      await db.deleteById("notifications", id);
    } catch {
    }
  },
  /** Get a single app_settings value */
  getSetting: async (key) => {
    const supabase2 = getSupabase();
    const result = await supabase2.from("app_settings").select("value").eq("key", key).maybeSingle();
    if (result.error) return "";
    return result.data?.value || "";
  }
};
function toCamel(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    out[key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())] = row[key];
  }
  return out;
}
function toCamelList(rows) {
  return rows.map((r) => toCamel(r));
}

// server/routers/auth.ts
var router = Router();
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }
    const existing = await db.select("users", { key: "username", value: username });
    const existingEmail = await db.select("users", { key: "email", value: email });
    if (existing.length > 0 || existingEmail.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const refCode = nanoid(8).toUpperCase();
    let referredBy = null;
    if (referralCode) {
      const referrer = await db.select("users", { key: "referral_code", value: referralCode });
      if (referrer.length > 0) {
        referredBy = referrer[0].id;
      }
    }
    const newUser = await db.insert("users", {
      username,
      email,
      password_hash: passwordHash,
      referral_code: refCode,
      referred_by: referredBy
    });
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || "dataplus-ai-secret",
      { expiresIn: "30d" }
    );
    const { password_hash: _, ...safeUser } = newUser;
    res.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await db.select("users", { key: "email", value: email });
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "dataplus-ai-secret",
      { expiresIn: "30d" }
    );
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: toCamel(safeUser), token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/me", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select("users", { key: "id", value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: toCamel(user) });
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
    if (btcAddress !== void 0) updates.btc_address = btcAddress;
    if (usdtAddress !== void 0) updates.usdt_address = usdtAddress;
    if (trxAddress !== void 0) updates.trx_address = trxAddress;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    const updated = await db.updateById("users", userId, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password_hash: _, ...safeUser } = updated;
    res.json({ user: toCamel(safeUser) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/overview", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select("users", { key: "id", value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const completions = await db.select("completions", { key: "user_id", value: userId });
    const completedCount = completions.filter((c) => c.status === "approved").length;
    const pendingCount = completions.filter((c) => c.status === "pending").length;
    const { password_hash: _, ...safeUser } = user;
    res.json({
      user: toCamel(safeUser),
      overview: {
        totalEarned: user.total_earned,
        availableBalance: user.available_balance,
        referralBonus: user.referral_bonus,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        referralCode: user.referral_code
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/tasks.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/", async (req, res) => {
  try {
    const allTasks = await db.select("tasks", { key: "status", value: "active" });
    res.json({ tasks: toCamelList(allTasks) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.get("/my-completions", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const completions = await db.select("completions", { key: "user_id", value: userId });
    const withTitles = await Promise.all(
      completions.map(async (c) => {
        const taskRows = await db.select("tasks", { key: "id", value: c.task_id });
        const t = taskRows[0];
        return { ...c, task_title: t?.title || null };
      })
    );
    res.json({ completions: toCamelList(withTitles) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.post("/complete", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { taskId, proof } = req.body;
    const taskRows = await db.select("tasks", { key: "id", value: taskId });
    const task = taskRows[0];
    if (!task) return res.status(404).json({ error: "Task not found" });
    const existing = await db.select("completions", { key: "task_id", value: taskId });
    const dup = existing.find((c) => c.user_id === userId);
    if (dup) {
      return res.status(409).json({ error: "Task already completed" });
    }
    const completion = await db.insert("completions", {
      user_id: userId,
      task_id: taskId,
      proof: proof || "",
      reward: task.reward,
      currency: task.currency
    });
    res.json({ completion: toCamel(completion) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router2.get("/:id", async (req, res) => {
  try {
    const rows = await db.select("tasks", { key: "id", value: parseInt(req.params.id) });
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ task: toCamel(task) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/referral.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/setup", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const rows = await db.select("users", { key: "id", value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const domain = process.env.APP_DOMAIN || "dataplus-ai.koyeb.app";
    const referralLink = `https://${domain}/?ref=${user.referral_code}`;
    res.json({
      referralCode: user.referral_code,
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
    const referrals = await db.select("users", { key: "referred_by", value: userId });
    res.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserName: r.username || r.email,
        createdAt: r.created_at,
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
    const rows = await db.select("users", { key: "id", value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const referred = await db.select("users", { key: "referred_by", value: userId });
    const domain = process.env.APP_DOMAIN || "dataplus-ai.koyeb.app";
    const referralLink = `https://${domain}/?ref=${user.referral_code}`;
    res.json({
      referralCode: user.referral_code,
      referralLink,
      referralCount: referred.length,
      referralBonus: user.referral_bonus
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
    const myRows = await db.select("users", { key: "id", value: userId });
    const user = myRows[0];
    if (user?.referred_by) return res.json({ success: false, message: "Already has referrer" });
    const referrerRows = await db.select("users", { key: "referral_code", value: referralCode });
    if (referrerRows.length === 0) return res.status(404).json({ error: "Invalid referral code" });
    const referrer = referrerRows[0];
    if (referrer.id === userId) return res.status(400).json({ error: "Cannot refer yourself" });
    await db.updateById("users", userId, { referred_by: referrer.id });
    const bonus = 0.01;
    const referrerUpdated = await db.updateById("users", referrer.id, {
      referral_bonus: Number(referrer.referral_bonus || 0) + bonus
    });
    res.json({ success: true, referralBonus: referrerUpdated?.referral_bonus });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/admin.ts
import { Router as Router4 } from "express";
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
    const value = await db.getSetting(key);
    return value || DEFAULT_SETTINGS[key] || "";
  } catch {
    return DEFAULT_SETTINGS[key] || "";
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
    const totalUsers = await db.count("users");
    const completedTasks = await db.count("completions", "status", "approved");
    const pendingWithdrawals = await db.count("withdrawals", "status", "pending");
    const totalEarned = await db.sum("withdrawals", "amount", "status", "paid");
    res.json({
      totalUsers,
      completedTasks,
      pendingWithdrawals,
      totalEarned
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.post("/tasks", adminGuard, async (req, res) => {
  try {
    const { title, description, category, reward, currency, timeLimit, requiredProof, imageUrl } = req.body;
    const task = await db.insert("tasks", {
      title,
      description: description || "",
      category,
      reward,
      currency,
      time_limit: timeLimit,
      required_proof: requiredProof,
      image_url: imageUrl || ""
    });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/tasks", adminGuard, async (req, res) => {
  try {
    const allTasks = await db.select("tasks");
    res.json({ tasks: allTasks });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/tasks/:id", adminGuard, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const set = { ...req.body };
    if (set.timeLimit !== void 0) set.time_limit = set.timeLimit;
    delete set.timeLimit;
    await db.updateById("tasks", id, set);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.delete("/tasks/:id", adminGuard, async (req, res) => {
  try {
    await db.deleteById("tasks", parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/completions/pending", adminGuard, async (req, res) => {
  try {
    const pending = await db.select("completions", { key: "status", value: "pending" });
    const enriched = await Promise.all(
      pending.map(async (comp) => {
        const taskRows = await db.select("tasks", { key: "id", value: comp.task_id });
        const userRows = await db.select("users", { key: "id", value: comp.user_id });
        return {
          ...comp,
          task_title: taskRows[0]?.title || "Unknown Task",
          user_name: userRows[0]?.username || "Unknown",
          user_email: userRows[0]?.email || ""
        };
      })
    );
    res.json({ completions: enriched });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/completions/:id/review", adminGuard, async (req, res) => {
  try {
    const { status } = req.body;
    const rows = await db.select("completions", { key: "id", value: parseInt(req.params.id) });
    const completion = rows[0];
    if (!completion) return res.status(404).json({ error: "Not found" });
    await db.updateById("completions", completion.id, { status, reviewed_at: (/* @__PURE__ */ new Date()).toISOString() });
    if (status === "approved") {
      const userRows = await db.select("users", { key: "id", value: completion.user_id });
      const user = userRows[0];
      if (user) {
        await db.updateById("users", user.id, {
          total_earned: Number(user.total_earned || 0) + Number(completion.reward || 0),
          available_balance: Number(user.available_balance || 0) + Number(completion.reward || 0)
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/withdrawals", adminGuard, async (req, res) => {
  try {
    const all = await db.select("withdrawals");
    const enriched = await Promise.all(
      all.map(async (wd) => {
        const userRows = await db.select("users", { key: "id", value: wd.user_id });
        return {
          ...wd,
          user_name: userRows[0]?.username || "Unknown",
          user_email: userRows[0]?.email || ""
        };
      })
    );
    res.json({ withdrawals: enriched });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/withdrawals/:id", adminGuard, async (req, res) => {
  try {
    const { status, txHash } = req.body;
    await db.updateById("withdrawals", parseInt(req.params.id), {
      status,
      tx_hash: txHash || "",
      processed_at: (/* @__PURE__ */ new Date()).toISOString()
    });
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
    if (btcWallet !== void 0) await db.upsertSetting("btc_wallet", btcWallet);
    if (trxWallet !== void 0) await db.upsertSetting("trx_wallet", trxWallet);
    if (bnbWallet !== void 0) await db.upsertSetting("bnb_wallet", bnbWallet);
    if (minWithdrawal !== void 0) await db.upsertSetting("min_withdraw", minWithdrawal);
    if (referralBonusPct !== void 0) await db.upsertSetting("referral_bonus_pct", referralBonusPct);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.get("/users", adminGuard, async (req, res) => {
  try {
    const allUsers = await db.select("users");
    res.json({ users: allUsers });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router4.put("/users/:id/role", adminGuard, async (req, res) => {
  try {
    const { role } = req.body;
    await db.updateById("users", parseInt(req.params.id), { role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// server/routers/settings.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.post("/withdraw", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { amount, currency, walletAddress } = req.body;
    const rows = await db.select("users", { key: "id", value: userId });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const minWithdraw = await db.getSetting("min_withdraw");
    const minAmount = minWithdraw || "1";
    if (parseFloat(amount) < parseFloat(minAmount)) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minAmount}` });
    }
    if (parseFloat(user.available_balance || "0") < parseFloat(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    const withdrawal = await db.insert("withdrawals", {
      user_id: userId,
      amount,
      currency,
      wallet_address: walletAddress
    });
    await db.updateById("users", userId, {
      available_balance: Number(user.available_balance || 0) - parseFloat(amount)
    });
    res.json({ withdrawal: toCamel(withdrawal) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router5.get("/my-withdrawals", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const all = await db.select("withdrawals", { key: "user_id", value: userId });
    const sorted = [...all].sort((a, b) => (b.id || 0) - (a.id || 0));
    res.json({ withdrawals: toCamelList2(sorted) });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router5.get("/admin-wallets", async (req, res) => {
  try {
    const btc = await db.getSetting("btc_wallet");
    const trx = await db.getSetting("trx_wallet");
    const bsc = await db.getSetting("bsc_wallet");
    const bnb = await db.getSetting("bnb_wallet");
    res.json({
      btc: btc || "bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct",
      trx: trx || "TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4",
      usdt: bsc || "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8",
      bnb: bnb || "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8"
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
function toCamelList2(rows) {
  return rows.map((r) => {
    const out = {};
    for (const key of Object.keys(r)) {
      out[key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())] = r[key];
    }
    return out;
  });
}

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

// server/migrate.ts
var REQUIRED_TABLES = ["users", "tasks", "completions", "withdrawals", "app_settings"];
async function runStartupCheck() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Set it in your hosting provider (e.g. Koyeb) before starting the server."
    );
  }
  const authRes = await getSupabase().auth.getUser("dummy");
  if (authRes.error && authRes.error.message.includes("Invalid JWT")) {
    console.log("\u2705 Supabase connection OK");
  }
  for (const table of REQUIRED_TABLES) {
    const result = await getSupabase().from(table).select("id", { count: "exact", head: true });
    if (result.error) {
      throw new Error(
        `Supabase schema check failed for table "${table}": ${result.error.message}. Please apply supabase/migrations/001_initial.sql in the Supabase SQL editor.`
      );
    }
    console.log(`  table "${table}" exists (${result.count ?? 0} rows)`);
  }
  console.log("\u2705 Supabase tables ready");
  return true;
}

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
async function startServer() {
  try {
    await runStartupCheck();
  } catch (err) {
    console.error("\u274C Startup schema check failed:", err.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`\u{1F680} Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Database: Supabase (${process.env.SUPABASE_URL || "not configured"})`);
  });
}
startServer();
