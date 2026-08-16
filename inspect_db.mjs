import { createClient } from '@supabase/supabase-js';

const URL = 'https://uqtirisxgqmhxupncink.supabase.co';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438';
const sb = createClient(URL, KEY);

const cols = async (t) => {
  const { data, error } = await sb.from(t).select('*').limit(1);
  if (error) { console.log(t, 'ERR', error.message); return []; }
  return data?.[0] ? Object.keys(data[0]) : [];
};

for (const t of ['tasks', 'completions', 'app_settings', 'vip_purchases']) {
  const keys = await cols(t);
  console.log(t, '->', keys.join(', '));
}

const { data: tasks } = await sb.from('tasks').select('id,title,category,reward,status').limit(20);
console.log('\ntasks sample:', JSON.stringify(tasks, null, 1));

const { data: settings } = await sb.from('app_settings').select('key,value').limit(40);
console.log('\nsettings keys:', (settings || []).map((s) => s.key).join(', '));
