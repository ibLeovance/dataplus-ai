import { createClient } from '@supabase/supabase-js';
const URL='https://uqtirisxgqmhxupncink.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438';
const sb=createClient(URL,KEY);
for (const k of ['vip_plans','video_pool','vip_purchases']) {
  const {data}=await sb.from('app_settings').select('value').eq('key',k).limit(1);
  console.log(k,'->',String(data?.[0]?.value||'').slice(0,1500));
  console.log('----');
}
