import { createClient } from '@supabase/supabase-js';
const URL='https://uqtirisxgqmhxupncink.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438';
const sb=createClient(URL,KEY);
const { data, error } = await sb.from('bots').select('*').limit(3);
console.log('bots table:', error?.message || data);
const { data: c } = await sb.from('completions').select('*').eq('user_id','bot').limit(2);
console.log('bot completions:', c);
