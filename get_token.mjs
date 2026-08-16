const r = await fetch('https://ai-computer-xplus-ai-fresh.pages.dev/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'Bitcoinxml2000@proton.me', password: 'Ibrahim@2121' }),
});
const d = await r.json();
console.log('status', r.status);
console.log(Object.keys(d));
console.log(JSON.stringify(d).slice(0, 300));
