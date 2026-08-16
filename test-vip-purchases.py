#!/usr/bin/env python3
import jwt, requests, json, warnings
warnings.filterwarnings("ignore")
SECRET = "dataplus-ai-secret"
token = jwt.encode({"id": 14, "username": "Ibrahim", "role": "admin"}, SECRET, algorithm="HS256")
for path in ["/api/vip/purchases", "/api/vip-my"]:
    r = requests.get(f"https://ai-computer-xplus-ai-fresh.pages.dev{path}", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    print(path, r.status_code, json.dumps(r.json(), indent=1)[:600])
    print()
