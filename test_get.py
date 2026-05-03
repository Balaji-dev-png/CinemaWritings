import urllib.request
import json

req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login/', 
    data=json.dumps({"username": "testuser1", "password": "testpassword1"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req)
token = json.loads(resp.read())['access']

req2 = urllib.request.Request('http://127.0.0.1:8000/api/scripts/1a645112-0776-4ec7-abad-70dc781795f6/', 
    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
)
try:
    resp2 = urllib.request.urlopen(req2)
    print(resp2.read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode())
