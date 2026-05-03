import urllib.request
import json

# Register
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/register/', 
    data=json.dumps({"username": "testuser1", "password": "testpassword1", "email": "test@test.com"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except Exception as e:
    print("Register error:", e.read().decode())

# Login
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login/', 
    data=json.dumps({"username": "testuser1", "password": "testpassword1"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    token = data['access']
    print("Logged in!")
    
    # Create script
    req2 = urllib.request.Request('http://127.0.0.1:8000/api/scripts/', 
        data=json.dumps({"title": "Test Script", "content": "..."}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    resp2 = urllib.request.urlopen(req2)
    print("Script created:", resp2.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())

