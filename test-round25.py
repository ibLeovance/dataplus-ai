import jwt, time, urllib.request, urllib.error, json

JWT_SECRET = "dataplus-ai-secret"
BASE = "https://ai-computer-xplus-ai-fresh.pages.dev"
user_id = 30
headers = {
    "Authorization": "Bearer " + jwt.encode(
        {"id": user_id, "role": "user", "iat": int(time.time()), "exp": int(time.time()) + 3600},
        JWT_SECRET, algorithm="HS256"),
    "User-Agent": "Mozilla/5.0",
}

def get(path):
    req = urllib.request.Request(BASE + path, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

for name, path in [
    ("overview", "/api/auth/overview"),
    ("daily-task", "/api/tasks/daily-task"),
    ("tasks", "/api/tasks"),
]:
    try:
        data = get(path)
        print(f"--- {name} ---")
        print(json.dumps(data, indent=2)[:1500])
    except Exception as e:
        print(f"--- {name} --- ERROR: {e}")
