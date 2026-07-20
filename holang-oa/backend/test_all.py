import urllib.request, json

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

s, body = post("/auth/login", {"username": "admin", "password": "admin123"})
token = body.get("data", {}).get("token", "")

endpoints = [
    ("customers", "/customers?page=1&pageSize=3"),
    ("orders", "/orders?page=1&pageSize=3"),
    ("payments", "/payments?page=1&pageSize=3"),
    ("invoices", "/invoices?page=1&pageSize=3"),
    ("deliveries", "/deliveries?page=1&pageSize=3"),
    ("leads", "/leads?page=1&pageSize=3"),
    ("contacts", "/contacts?page=1&pageSize=3"),
    ("opportunities", "/opportunities?page=1&pageSize=3"),
]

print("=== BASELINE (all) ===")
for name, path in endpoints:
    s, b = get(path, token)
    tot = b.get("data", {}).get("pagination", {}).get("total") if isinstance(b.get("data"), dict) else "?"
    print(f"{name:14s} {s}  total={tot}")

# Internal / Export filtering on customers
print("\n=== customers internal vs export ===")
for bl in ["INDUSTRIAL", "RETAIL"]:
    s, b = get(f"/customers?page=1&pageSize=200&businessLine={bl}", token)
    tot = b.get("data", {}).get("pagination", {}).get("total")
    print(f"businessLine={bl:10s} {s}  total={tot}")

print("\n=== orders internal vs export ===")
for bl in ["INDUSTRIAL", "RETAIL"]:
    s, b = get(f"/orders?page=1&pageSize=200&businessLine={bl}", token)
    tot = b.get("data", {}).get("pagination", {}).get("total")
    print(f"businessLine={bl:10s} {s}  total={tot}")
