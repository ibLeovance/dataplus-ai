import { createClient } from '@supabase/supabase-js';
const URL='https://uqtirisxgqmhxupncink.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdGlyaXN4Z3FtaHh1cG5jaW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY1NjI0MywiZXhwIjoyMTAyMjMyMjQzfQ.patjJ_GGmXM2xrgLikXEYeHz6WZzDZPwH8vAyatB438';
const sb=createClient(URL,KEY);
const { data } = await sb.from('app_settings').select('key,value').in('key',['bots_registry','funding_ledger','daily_admin_credit_amount','payout_gateway','payout_api_key','payout_mode','free_video_pool','vip_video_pool','admin_daily_credit']);
for (const r of (data||[])) console.log(r.key, '->', String(r.value).slice(0,600));
