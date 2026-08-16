#!/usr/bin/env python3
"""Mint a JWT for admin user id 14 and verify the fixed /api/withdrawals/my endpoint on the live site."""
import json
import jwt
import requests

SECRET = "dataplus-ai-secret"
token = jwt.encode({"id": 14, "username": "Ibrahim", "role": "admin"}, SECRET, algorithm="HS256")
r = requests.get(
    "https://ai-computer-xplus-ai-fresh.pages.dev/api/withdrawals/my",
    headers={"Authorization": f"Bearer {token}"},
    timeout=30,
)
print("status:", r.status_code)
data = r.json()
for w in data.get("withdrawals", [])[:3]:
    print(json.dumps(w, indent=2))
keys = list(data["withdrawals"][0].keys()) if data.get("withdrawals") else []
print("keys:", keys)
print("createdAt present:", "createdAt" in keys)
