import jwt from 'jsonwebtoken';
const secret = (process.env.JWT_SECRET || 'dataplus-ai-secret');
const token = jwt.sign({ id: 14, email: 'Bitcoinxml2000@proton.me', role: 'admin' }, secret, { expiresIn: '1h' });
const r = await fetch('https://ai-computer-xplus-ai-fresh.pages.dev/api/admin/import-ad-tasks', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});
console.log('status:', r.status);
console.log(await r.text());
