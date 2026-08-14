import { getSupabase } from './db';

/**
 * Startup table check for Supabase.
 *
 * PostgREST does not support DDL (CREATE TABLE), so the schema must be
 * applied manually once via the Supabase SQL editor
 * (supabase/migrations/001_initial.sql). Here we verify all required
 * tables exist and fail fast with a clear error if the schema is missing.
 */
const REQUIRED_TABLES = ['users', 'tasks', 'completions', 'withdrawals', 'app_settings'];

export async function runStartupCheck(): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Set it in your hosting provider (e.g. Koyeb) before starting the server.'
    );
  }

  // Verify auth endpoint is reachable
  const authRes = await getSupabase().auth.getUser('dummy');
  if (authRes.error && authRes.error.message.includes('Invalid JWT')) {
    console.log('✅ Supabase connection OK');
  }

  // Verify required tables exist
  for (const table of REQUIRED_TABLES) {
    const result = await getSupabase().from(table).select('id', { count: 'exact', head: true });
    if (result.error) {
      throw new Error(
        `Supabase schema check failed for table "${table}": ${result.error.message}. ` +
          `Please apply supabase/migrations/001_initial.sql in the Supabase SQL editor.`
      );
    }
    console.log(`  table "${table}" exists (${result.count ?? 0} rows)`);
  }

  console.log('✅ Supabase tables ready');
  return true;
}
