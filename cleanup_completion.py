#!/usr/bin/env python3
"""Approve the verification completion (id 11) so no stray pending task remains."""
import json
import verify_live as vl

adm, err = vl.login("Bitcoinxml2000@proton.me", "Ibrahim@2121") if hasattr(vl, "login") else (None, None)
if not adm:
    c, d = vl.req("POST", "/api/auth/login", {"email": "Bitcoinxml2000@proton.me", "password": "Ibrahim@2121"})
    adm = json.loads(d)["token"]

# review completion id 11 as approved (VIP admin gets the $15 credited to wallet)
c, d = vl.req("PUT", "/api/admin/completions/11/review", body={"status": "approved"}, token=adm)
print("review:", c, d[:200])

# confirm pending list cleared
c, d = vl.req("GET", "/api/admin/completions/pending", token=adm)
j = json.loads(d)
print("pending count:", len(j.get("completions", j)))
