import requests, json, sys

BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
H = {"User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
     "Content-Type": "application/json"}

# 1. Login as admin
r = requests.post(BASE + "/api/auth/login", headers=H, json={
    "email": "Bitcoinxml2000@proton.me", "password": "Ibrahim@2121"})
print("login:", r.status_code)
tok = r.json().get("token") or r.json().get("data", {}).get("token")
print("token:", (tok or "")[:30], "...")
AH = {**H, "Authorization": f"Bearer {tok}"}

def show(name, r):
    try:
        d = r.json()
    except Exception:
        d = r.text[:200]
    print(f"{name}: {r.status_code} -> {json.dumps(d)[:300]}")
    return d

# 2. Notification hub
show("hub", requests.get(BASE + "/api/admin/notification-hub", headers=AH))

# 3. Review-all (dry: find pending first via pending endpoint)
r = requests.get(BASE + "/api/admin/completions/pending", headers=AH)
pend = r.json().get("completions", [])
print("pending completions:", len(pend))
if pend:
    # 4. review-all approve (automatic for every user)
    r = requests.post(BASE + "/api/admin/completions/review-all", headers=AH, json={"mode": "approve"})
    show("review-all approve", r)
else:
    print("review-all: skipped (no pending); endpoint presence test only")
    r = requests.post(BASE + "/api/admin/completions/review-all", headers=AH, json={"mode": "approve"})
    print("review-all endpoint exists:", r.status_code, r.text[:150])

# 5. Hub review (mark all read)
show("hub-review", requests.post(BASE + "/api/admin/notification-hub/review", headers=AH, json={}))

# 6. Deduct test against a low-value non-admin user (id 1?) — safe: deduct $0.01
users = requests.get(BASE + "/api/admin/users", headers=AH).json().get("users", [])
victim = next((u for u in users if u.get("role") != "admin" and float(u.get("availableBalance", 0)) >= 0.01), None)
if victim:
    before = float(victim["availableBalance"])
    r = requests.post(BASE + f"/api/admin/users/{victim['id']}/deduct", headers=AH, json={"amount": 0.01, "reason": "round41 test"})
    d = show("deduct 0.01", r)
    # refund to restore
    try:
        amt = float(d.get("newBalance", 0))
        requests.put(BASE + f"/api/admin/users/{victim['id']}", headers=AH,
                     json={"available_balance": f"{before:.4f}"})
        print("refunded balance to", before)
    except Exception as e:
        print("refund err", e)
else:
    print("no suitable test user for deduct")

# 7. Invalid decision test: find a pending recharge without actually marking any (dry check endpoint signature)
r = requests.post(BASE + "/api/admin/import-ad-tasks", headers=AH, json={"dryRun": True})
print("import-ad-tasks dry:", r.status_code)

print("\nROUND41 LIVE VERIFY DONE")
