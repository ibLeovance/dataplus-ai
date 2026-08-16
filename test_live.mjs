import jwt from 'jsonwebtoken';

export async function getAdminToken() {
  const r = await fetch('https://ai-computer-xplus-ai-fresh.pages.dev/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Bitcoinxml2000@proton.me', password: 'Ibrahim@2121' }),
  });
  const d = await r.json();
  return d.token;
}

export async function call(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`https://ai-computer-xplus-ai-fresh.pages.dev${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
