import requests, json
BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
H = {"User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36", "Content-Type": "application/json"}
r = requests.post(BASE + "/api/auth/login", headers=H, json={"email": "Bitcoinxml2000@proton.me", "password": "Ibrahim@2121"})
tok = r.json()["token"]
AH = {**H, "Authorization": f"Bearer {tok}"}
u = requests.get(BASE + "/api/admin/users", headers=AH).json()["users"]
v = next((x for x in u if x.get("id") == 38), None)
if not v:
    print("user 38 not found"); raise SystemExit(1)
before = float(v.get("available_balance") or 0)
print("user38 before:", before)
if before <= 0:
    raise SystemExit("user 38 has 0 balance; nothing to deduct")
print("user38 before:", before)
r = requests.post(BASE + "/api/admin/users/38/deduct", headers=AH, json={"amount": 0.01, "reason": "round41 test"})
print("deduct:", r.status_code, r.text[:200])
nb = float(r.json().get("newBalance", before))
r2 = requests.put(BASE + "/api/admin/users/38", headers=AH, json={"available_balance": f"{before:.4f}"})
print("refund:", r2.status_code, r2.text[:120])
r3 = requests.put(BASE + "/api/admin/recharges/999999/decision", headers=AH, json={"decision": "invalid", "note": "test"})
print("invalid-decision route:", r3.status_code, r3.text[:120])
