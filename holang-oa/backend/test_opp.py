import urllib.request
import json

BASE = "http://localhost:3001/api/v1"

def post(path, data=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def get(path, token):
    req = urllib.request.Request(BASE + path, headers={"Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# Login
s, body = post("/auth/login", {"username": "admin", "password": "admin123"})
print("LOGIN:", s, body.get("message"))
token = body.get("data", {}).get("token", "")
print("TOKEN len:", len(token))

# Test opportunities
s, body = get("/opportunities?page=1&pageSize=5", token)
print("OPPORTUNITIES:", s)
print(json.dumps(body, ensure_ascii=False, indent=2)[:1500])
