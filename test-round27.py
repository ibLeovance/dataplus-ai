import requests, jwt, time

BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
SECRET = "dataplus-ai-secret"
tok = jwt.encode({"id": 1, "role": "admin", "exp": int(time.time()) + 3600, "iat": int(time.time())}, SECRET, algorithm="HS256")
H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def check(label, fn):
    try:
        r = fn()
        print(f"[{'OK ' if r.status_code < 400 else 'ERR'}] {label} -> {r.status_code} {r.text[:120]}")
    except Exception as e:
        print(f"[FAIL] {label} -> {e}")


# Stats
check("GET /api/admin/stats", lambda: requests.get(BASE + "/api/admin/stats", headers=H, timeout=30))
# Tasks tab: list + create + toggle
check("GET /api/admin/tasks", lambda: requests.get(BASE + "/api/admin/tasks", headers=H, timeout=30))
check("POST /api/admin/tasks (create)", lambda: requests.post(BASE + "/api/admin/tasks", headers=H, json={"title": "Round27 test task", "description": "temp", "reward": "0.05", "duration": 30, "videoUrl": ""}, timeout=30))
tasks = requests.get(BASE + "/api/admin/tasks", headers=H, timeout=30).json().get("tasks", [])
print("   total tasks:", len(tasks))
# Toggle the created task
t = next((x for x in tasks if x.get("title") == "Round27 test task"), None)
if t:
    check("PUT /api/admin/tasks/:id (toggle)", lambda: requests.put(f"{BASE}/api/admin/tasks/{t['id']}", headers=H, json={**t, "status": "paused"}, timeout=30))
    check("DELETE /api/admin/tasks/:id", lambda: requests.delete(f"{BASE}/api/admin/tasks/{t['id']}", headers=H, timeout=30))
# Reviews tab
check("GET /api/admin/completions/pending", lambda: requests.get(BASE + "/api/admin/completions/pending", headers=H, timeout=30))
# Withdrawals tab
check("GET /api/admin/withdrawals", lambda: requests.get(BASE + "/api/admin/withdrawals", headers=H, timeout=30))
# Users tab
check("GET /api/admin/users", lambda: requests.get(BASE + "/api/admin/users", headers=H, timeout=30))
users = requests.get(BASE + "/api/admin/users", headers=H, timeout=30).json().get("users", [])
print("   total users:", len(users))
# User details + edit balance (unlimited admin powers)
u = users[0] if users else None
if u:
    uid = u.get("id") or u.get("userId")
    check("GET /api/admin/users/:id", lambda: requests.get(f"{BASE}/api/admin/users/{uid}", headers=H, timeout=30))
    check("PUT /api/admin/users/:id/balance (add $1)", lambda: requests.put(f"{BASE}/api/admin/users/{uid}/balance", headers=H, json={"amount": 1, "action": "add"}, timeout=30))
    check("PUT /api/admin/users/:id/balance (subtract $1)", lambda: requests.put(f"{BASE}/api/admin/users/{uid}/balance", headers=H, json={"amount": 1, "action": "subtract"}, timeout=30))
# Notifications tab
check("GET /api/admin/notifications", lambda: requests.get(BASE + "/api/admin/notifications", headers=H, timeout=30))
check("POST /api/admin/notifications (send)", lambda: requests.post(BASE + "/api/admin/notifications", headers=H, json={"target": "all", "title": "Round27 verify", "message": "E2E test ok"}, timeout=30))
notifs = requests.get(BASE + "/api/admin/notifications", headers=H, timeout=30).json().get("notifications", [])
nid = next((n["id"] for n in notifs if n.get("title") == "Round27 verify"), None)
if nid:
    check("DELETE /api/admin/notifications/:id", lambda: requests.delete(f"{BASE}/api/admin/notifications/{nid}", headers=H, timeout=30))
# Deposits tab
check("GET /api/admin/recharges", lambda: requests.get(BASE + "/api/admin/recharges", headers=H, timeout=30))
# Settings tab
check("GET /api/settings", lambda: requests.get(BASE + "/api/settings", headers=H, timeout=30))
check("POST /api/admin/self-topup", lambda: requests.post(BASE + "/api/admin/self-topup", headers=H, json={"amount": 5}, timeout=30))
check("User-facing /api/notifications", lambda: requests.get(BASE + "/api/notifications", headers=H, timeout=30))
print("\nAll admin endpoints checked.")
