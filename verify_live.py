#!/usr/bin/env python3
"""Verify live endpoints on ai-computer-xplus-ai-fresh.pages.dev with an admin JWT."""
import json, urllib.request, urllib.error

BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
UA = {"User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36"}

def req(method, path, body=None, token=None):
    r = urllib.request.Request(f"{BASE}{path}", method=method, data=(json.dumps(body).encode() if body else None))
    for k, v in UA.items(): r.add_header(k, v)
    if token: r.add_header("Authorization", f"Bearer {token}")
    if body: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    code, d = req("POST", "/api/auth/login", {
        "email": "Bitcoinxml2000@proton.me", "password": "Ibrahim@2121"})
    print("login:", code, d[:200])
    token = json.loads(d)["token"]
    checks = [
        ("GET", "/api/admin/notification-hub"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/funding"),
        ("GET", "/api/vip-plans"),
        ("GET", "/api/tasks"),
    ]
    for m, p in checks:
        s, body = req(m, p, token=token)
        try:
            j = json.loads(body)
            if isinstance(j, dict):
                keys = list(j.keys())[:6]
            else:
                keys = f"len={len(j)}"
        except Exception:
            keys = body[:60]
        print(f"{s} {m} {p} -> {keys}")

if __name__ == "__main__":
    main()
