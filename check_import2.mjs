import { getAdminToken, call } from './test_live.mjs';
const token = await getAdminToken();
const r = await call('/api/admin/import-ad-tasks', { method: 'POST', token });
console.log('import-ad-tasks status:', r.status, JSON.stringify(r.data).slice(0, 200));
