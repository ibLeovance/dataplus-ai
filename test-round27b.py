import requests, jwt, time

BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
SECRET = "dataplus-ai-secret"
ADMIN_ID = 14  # IbrahimAdmin
tok = jwt.encode({"id": ADMIN_ID, "role": "admin", "exp": int(time.time()) + 3600, "iat": int(time.time())}, SECRET, algorithm="HS256")
H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

ok = fail = 0
def check(label, fn):
    global ok, fail
    try:
        r = fn()
        s = "OK " if r.status_code < 400 else "ERR"
        print(f"[{s}] {label} -> {r.status_code} {r.text[:150]}")
        if r.status_code < 400: ok += 1
        else: fail += 1
    except Exception as e:
        fail += 1
        print(f"[FAIL] {label} -> {e}")

check("GET /api/admin/stats", lambda: requests.get(BASE + "/api/admin/stats", headers=H, timeout=30))
check("POST /api/admin/tasks", lambda: requests.post(BASE + "/api/admin/tasks", headers=H, json={"title": "R27temp", "description": "temp", "reward": "0.05", "timeLimit": 30}, timeout=30))
tasks = requests.get(BASE + "/api/admin/tasks", headers=H, timeout=30).json()["tasks"]
t = next((x for x in tasks if x["title"] == "R27temp"), None)
if t:
    tid = t["id"]
    check("PUT /api/admin/tasks/:id toggle", lambda: requests.put(f"{BASE}/api/admin/tasks/{tid}", headers=H, json={**{k: (t.get(k) if k not in ("created_at",) else None) for k in t}}, timeout=30))
    check("DELETE /api/admin/tasks/:id", lambda: requests.delete(f"{BASE}/api/admin/tasks/{tid}", headers=H, timeout=30))
check("GET /api/admin/completions/pending", lambda: requests.get(BASE + "/api/admin/completions/pending", headers=H, timeout=30))
check("GET /api/admin/withdrawals", lambda: requests.get(BASE + "/api/admin/withdrawals", headers=H, timeout=30))
check("GET /api/admin/users", lambda: requests.get(BASE + "/api/admin/users", headers=H, timeout=30))
check("POST /api/admin/users/:id/topup (unlimited)", lambda: requests.post(f"{BASE}/api/admin/users/32/topup", headers=H, json={"amount": 2, "reason": "round27 test"}, timeout=30))
check("POST /api/admin/self-topup (admin balance)", lambda: requests.post(BASE + "/api/admin/self-topup", headers=H, json={"amount": 5}, timeout=30))
check("GET /api/admin/settings", lambda: requests.get(BASE + "/api/admin/settings", headers=H, timeout=30))
check("POST /api/admin/notifications send", lambda: requests.post(BASE + "/api/admin/notifications", headers=H, json={"target": "all", "title": "R27", "message": "ok"}, timeout=30))
notifs = requests.get(BASE + "/api/admin/notifications", headers=H, timeout=30).json()["notifications"]
nid = next((n["id"] for n in notifs if n.get("title") == "R27"), None)
if nid:
    check("DELETE /api/admin/notifications/:id", lambda: requests.delete(f"{BASE}/api/admin/notifications/{nid}", headers=H, timeout=30))
check("GET /api/admin/recharges", lambda: requests.get(BASE + "/api/admin/recharges", headers=H, timeout=30))
check("User-facing /api/notifications", lambda: requests.get(BASE + "/api/notifications", headers=H, timeout=30))
print(f"\nOK={ok} FAIL={fail}")
