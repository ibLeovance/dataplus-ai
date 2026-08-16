#!/usr/bin/env python3
"""Verify live 24h reset + tiered pools on ai-computer-xplus-ai-fresh.pages.dev."""
import json
import verify_live as vl

def login(email, password):
    c, d = vl.req("POST", "/api/auth/login", {"email": email, "password": password})
    if c != 200:
        return None, f"login failed {c} {d[:100]}"
    return json.loads(d)["token"], None

# 1. Admin completes task 3 to trigger reset logic (can undo by deleting completion later)
adm, err = login("Bitcoinxml2000@proton.me", "Ibrahim@2121")
assert adm, err
c, d = vl.req("POST", "/api/tasks/complete", body={"taskId": 3, "durationWatched": 31}, token=adm)
print("admin complete task3:", c, d[:160])
j = json.loads(d)

c, d = vl.req("GET", "/api/tasks", token=adm)
tasks = json.loads(d)["tasks"]
t = [x for x in tasks if x["id"] == 3][0]
print("task3 -> canRedo:", t.get("canRedo"), "| resetInHours:", t.get("resetInHours"), "| resetAt:", t.get("resetAt"))
for k in ["tier", "pool", "poolType"]:
    if k in t:
        print(k, "=", t[k])

# 2. Check my-completions for pool field
c, d = vl.req("GET", "/api/tasks/my-completions", token=adm)
comp = json.loads(d)
print("my-completions:", str(comp)[:300])
