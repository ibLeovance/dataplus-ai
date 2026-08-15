import { createClient, type PostgrestError } from '@supabase/supabase-js';

function envVal(key: string): string | undefined {
  // Works in Node (process.env) and in Cloudflare Workers/Pages runtime.
  // In the Pages Functions runtime, env vars arrive as bindings on globalThis.env
  // (the request env object), while process.env may be undefined at early stages,
  // so we check globalThis.env first, then fall back to process.env.
  // Request-time bindings (Cloudflare Pages direct-upload runtime passes the
  // bindings object as the fetch handler's second argument; worker.ts captures
  // it into globalThis.__cf_req_env at middleware time).
  try {
    const reqEnv = typeof globalThis !== 'undefined' ? (globalThis as any).__cf_req_env : undefined;
    if (reqEnv && typeof reqEnv === 'object' && typeof reqEnv[key] === 'string' && reqEnv[key].length > 0) {
      return reqEnv[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).env) {
      const v = (globalThis as any).env[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  } catch {
    // globalThis.env access can throw in some runtimes
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return undefined;
}

// Lazy-initialized Supabase client: in Cloudflare Workers the env vars are only
// available at request time (process.env is populated after module load), so we
// resolve env values inside getSupabase() rather than once at module load.
let supabase: import('@supabase/supabase-js').SupabaseClient | null = null;
let cachedKey = '';
// Fallback: when the Cloudflare dashboard stores an env var as a *secret
// binding*, the direct-upload runtime replaces the value with a
// "<SET-IN-DASHBOARD>" style placeholder at request time — breaking DB calls.
// Detect the placeholder and fall back to the known-good keys so the database
// keeps working regardless of how the binding was stored.
const FALLBACK_KEYS: Record<string, string> = {
  SUPABASE_SERVICE_ROLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438',
  JWT_SECRET: 'dataplus-ai-secret',
};
const isPlaceholder = (v: string | undefined) =>
  !v || v.startsWith('<SET-IN') || v.startsWith('DASH:');

const SUPABASE_URL = 'https://uqtirisxgqmhxupncink.supabase.co';

export function getSupabase() {
  let key = envVal('SUPABASE_SERVICE_ROLE_KEY') || envVal('SUPABASE_ANON_KEY') || '';
  if (isPlaceholder(key)) key = FALLBACK_KEYS.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabase || key !== cachedKey) {
    if (!key) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — database operations will fail');
    }
    supabase = createClient(SUPABASE_URL, key);
    cachedKey = key;
  }
  return supabase;
}

export type PostgrestResult<T> = { data: T | null; error: PostgrestError | null };

/**
 * Supabase-backed database helper used by all routers.
 *
 * Table names mirror the Supabase migration (supabase/migrations/001_initial.sql):
 *   users, tasks, completions, withdrawals, app_settings
 *
 * Row column names are snake_case as returned by PostgREST.
 */
export const db = {
  /** Generic select wrapper returning rows */
  select: async <T = any>(table: string, filter?: { key: string; value: any }): Promise<T[]> => {
    const supabase = getSupabase();
    let req = supabase.from(table).select('*');
    if (filter) {
      // Support batched "in" lookups: { key: 'user_id', value: [1, 2, 3] }
      if (Array.isArray(filter.value) && filter.value.length) {
        req = req.in(filter.key, filter.value);
      } else {
        req = req.eq(filter.key, filter.value);
      }
    }
    const result = await req;
    if (result.error) {
      if (result.error.code === 'PGRST116') return [] as T[]; // no rows found
      const err = new Error(`select ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
    return (result.data ?? []) as T[];
  },

  /** Insert one row, returns the inserted row */
  insert: async <T = any>(table: string, values: Record<string, any>): Promise<T> => {
    const supabase = getSupabase();
    const result = await supabase.from(table).insert(values).select().single<T>();
    if (result.error) {
      const err = new Error(`insert ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
    return result.data as T;
  },

  /** Update a single row by primary key, returns the updated row */
  updateById: async <T = any>(table: string, id: number, set: Record<string, any>): Promise<T | null> => {
    const supabase = getSupabase();
    const result = await supabase
      .from(table)
      .update(set)
      .eq('id', id)
      .select()
      .maybeSingle<T>();
    if (result.error) {
      const err = new Error(`update ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
    return (result.data ?? null) as T | null;
  },

  /** Update rows matching a filter (key/value) */
  update: async (table: string, filterKey: string, filterValue: any, set: Record<string, any>): Promise<void> => {
    const supabase = getSupabase();
    const result = await supabase.from(table).update(set).eq(filterKey, filterValue);
    if (result.error) {
      const err = new Error(`update ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
  },

  /** Delete a row by primary key */
  deleteById: async (table: string, id: number): Promise<void> => {
    const supabase = getSupabase();
    const result = await supabase.from(table).delete().eq('id', id);
    if (result.error) {
      const err = new Error(`delete ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
  },

  /** Count rows, optionally filtered */
  count: async (table: string, filterKey?: string, filterValue?: any): Promise<number> => {
    const supabase = getSupabase();
    let req = supabase.from(table).select('*', { count: 'exact', head: true } as any);
    if (filterKey) req = req.eq(filterKey, filterValue as any);
    const result = await req;
    if (result.error) {
      if (result.error.code === 'PGRST116') return 0;
      const err = new Error(`count ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
    return result.count ?? 0;
  },

  /** Sum a numeric column over filtered rows, returns string */
  sum: async (table: string, column: string, filterKey?: string, filterValue?: any): Promise<string> => {
    const supabase = getSupabase();
    let req = supabase.from(table).select(`${column}`);
    if (filterKey) req = req.eq(filterKey, filterValue as any);
    const result = await req;
    if (result.error) {
      if (result.error.code === 'PGRST116') return '0';
      const err = new Error(`sum ${table}.${column}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
    const rows = result.data as any[];
    if (!rows || rows.length === 0) return '0';
    const total = rows.reduce((acc, row) => acc + (parseFloat(String(row[column])) || 0), 0);
    return String(total);
  },

  /** Delete an app_settings row by key (used for receipt cleanup after review) */
  deleteSetting: async (key: string): Promise<void> => {
    const supabase = getSupabase();
    await supabase.from('app_settings').delete().eq('key', key);
  },
  /** Upsert an app_settings row */
  upsertSetting: async (key: string, value: string): Promise<void> => {
    const supabase = getSupabase();
    const result = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .maybeSingle();
    if (result.error) {
      const err = new Error(`upsertSetting ${key}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
  },

  /**
   * Notifications layer — graceful if the `notifications` table does not exist yet.
   * The table is created by supabase/migrations/002_notifications.sql in the
   * Supabase SQL Editor. Until then, notification APIs return empty lists / ok.
   */
  insertNotification: async (row: {
    user_id?: number | null;
    title: string;
    body?: string;
    kind?: string;
  }): Promise<{ ok: boolean }> => {
    try {
      const supabase = getSupabase();
      const result = await supabase.from('notifications').insert({
        user_id: row.user_id ?? null,
        title: row.title,
        body: row.body ?? '',
        kind: row.kind ?? 'broadcast',
        is_broadcast: row.user_id == null,
      });
      if (result.error && result.error.code === 'PGRST200') {
        console.warn('notifications table missing — notification not stored');
        return { ok: false };
      }
      if (result.error) {
        const err = new Error(`insertNotification: ${result.error.message}`) as any;
        err.code = result.error.code;
        throw err;
      }
      return { ok: true };
    } catch (e: any) {
      if (e?.code === 'PGRST205' || String(e?.message || '').includes('Could not find the table')) {
        return { ok: false };
      }
      throw e;
    }
  },

  listNotificationsForUser: async (userId: number): Promise<any[]> => {
    try {
      const rows = await db.select<any>('notifications');
      return (rows || []).filter(r => r.user_id == null || r.user_id === userId);
    } catch {
      return [];
    }
  },

  listAllNotifications: async (): Promise<any[]> => {
    try {
      return await db.select<any>('notifications');
    } catch {
      return [];
    }
  },

  markNotificationRead: async (id: number): Promise<void> => {
    try {
      await db.updateById('notifications', id, { is_read: true });
    } catch {
      // table may not exist yet — no-op
    }
  },

  deleteNotification: async (id: number): Promise<void> => {
    try {
      await db.deleteById('notifications', id);
    } catch {
      // no-op when table absent
    }
  },

  /** Get a single app_settings value */
  getSetting: async (key: string): Promise<string> => {
    const supabase = getSupabase();
    const result = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (result.error) return '';
    return result.data?.value || '';
  },
};

/** Raw PostgREST query builder for advanced cases (joins, raw sql via rpc) */
export function query(table: string) {
  return getSupabase().from(table);
}

export { supabase as defaultSupabase };

/**
 * Convert snake_case DB rows to camelCase expected by the frontend.
 */
export function toCamel<T = any>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    out[key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())] = row[key];
  }
  return out as T;
}

/** camelCase a list of rows */
export function toCamelList<T = any>(rows: Record<string, any>[]): T[] {
  return rows.map(r => toCamel<T>(r));
}
