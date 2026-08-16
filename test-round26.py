import requests, jwt, time, json

SECRET = 'dataplus-ai-secret'
BASE = 'https://ai-computer-xplus-ai-fresh.pages.dev'

# Find a real user id first
token = jwt.encode({
    'id': 999999, 'role': 'user',
    'exp': int(time.time()) + 3600, 'iat': int(time.time())
}, SECRET, algorithm='HS256')
h = {'Authorization': f'Bearer {token}'}

r = requests.get(BASE + '/api/notifications', headers=h, timeout=30)
print('GET /api/notifications status:', r.status_code)
print(json.dumps(r.json(), indent=1)[:2000])
