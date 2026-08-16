import requests, jwt, time, json

SECRET = 'dataplus-ai-secret'
BASE = 'https://ai-computer-xplus-ai-fresh.pages.dev'

# Admin JWT (user id 1 = admin IbrahimAdmin per earlier state)
token = jwt.encode({'id': 1, 'role': 'admin', 'exp': int(time.time()) + 3600, 'iat': int(time.time())}, SECRET, algorithm='HS256')
h = {'Authorization': f'Bearer {token}'}

# Send broadcast
r = requests.post(BASE + '/api/admin/notifications', json={'title': 'Gwaji — barka da zuwa', 'body': 'Wannan gwaji ne daga admin.', 'target': 'all'}, headers=h, timeout=30)
print('POST admin/notifications:', r.status_code, r.text[:300])

# Send to one user (user id 5)
r2 = requests.post(BASE + '/api/admin/notifications', json={'title': 'Gwaji ga mutum daya', 'body': 'Saƙo ga mutum ɗaya kawai.', 'target': 'user', 'user_id': 5}, headers=h, timeout=30)
print('POST user notification:', r2.status_code, r2.text[:300])

# User 5 lists own notifications
u5 = jwt.encode({'id': 5, 'role': 'user', 'exp': int(time.time()) + 3600, 'iat': int(time.time())}, SECRET, algorithm='HS256')
r3 = requests.get(BASE + '/api/notifications', headers={'Authorization': f'Bearer {u5}'}, timeout=30)
print('GET user5 notifications:', r3.status_code)
print(json.dumps(r3.json(), indent=1)[:1500])

# Another user should NOT see the user-specific one
u9 = jwt.encode({'id': 9, 'role': 'user', 'exp': int(time.time()) + 3600, 'iat': int(time.time())}, SECRET, algorithm='HS256')
r4 = requests.get(BASE + '/api/notifications', headers={'Authorization': f'Bearer {u9}'}, timeout=30)
print('GET user9 notifications:', r4.status_code)
for n in r4.json().get('notifications', []):
    print(' -', n.get('title'), 'user_id=', n.get('user_id'), 'broadcast=', n.get('is_broadcast'))
