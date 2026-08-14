import { createClient, type PostgrestError } from '@supabase/supabase-js';

function envVal(key: string): string | undefined {
  // Works in Node (process.env) and in Workers runtime (bindings via process.env when
  // nodejs_compat_populate_process_env, otherwise via globalThis.env).
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (typeof globalThis !== 'undefined' && (globalThis as any).env?.[key]) return (globalThis as any).env[key];
  return undefined;
}

const SUPABASE_URL = envVal('SUPABASE_URL') || 'https://uqtirisxgqmhxupncink.supabase.co';
const SUPABASE_KEY = envVal('SUPABASE_SERVICE_ROLE_KEY') || envVal('SUPABASE_ANON_KEY') || '';

if (!SUPABASE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — database operations will fail');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    let req = supabase.from(table).select('*');
    if (filter) req = req.eq(filter.key, filter.value);
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
    const result = await supabase.from(table).update(set).eq(filterKey, filterValue);
    if (result.error) {
      const err = new Error(`update ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
  },

  /** Delete a row by primary key */
  deleteById: async (table: string, id: number): Promise<void> => {
    const result = await supabase.from(table).delete().eq('id', id);
    if (result.error) {
      const err = new Error(`delete ${table}: ${result.error.message}`) as any;
      err.code = result.error.code;
      throw err;
    }
  },

  /** Count rows, optionally filtered */
  count: async (table: string, filterKey?: string, filterValue?: any): Promise<number> => {
    let req = supabase.from(table).select('*', { count: 'exact', head: true });
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

  /** Upsert an app_settings row */
  upsertSetting: async (key: string, value: string): Promise<void> => {
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

  /** Get a single app_settings value */
  getSetting: async (key: string): Promise<string> => {
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
  return supabase.from(table);
}

export { supabase };

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
