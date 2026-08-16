#!/usr/bin/env python3
import json
import verify_live as vl

code, d = vl.req("POST", "/api/auth/login", {"email": "Bitcoinxml2000@proton.me", "password": "Ibrahim@2121"})
token = json.loads(d)["token"]
code, d = vl.req("GET", "/api/admin/notification-hub", token=token)
j = json.loads(d)
print("totalUnread:", j.get("totalUnread"), "| total users:", j.get("total"))
hub = j.get("hub", [])
print("first 2 boxes:")
for box in hub[:2]:
    print(json.dumps(box, indent=2)[:900])
