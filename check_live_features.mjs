import { getAdminToken, call } from './test_live.mjs';
const t = await getAdminToken();
for (const p of ['/api/admin/bots', '/api/admin/funding', '/api/admin/funding-stats', '/api/video-pool?tier=vip']) {
  const r = await call(p, { token: t });
  console.log(p, '→', r.status, JSON.stringify(r.data).slice(0, 400));
}
