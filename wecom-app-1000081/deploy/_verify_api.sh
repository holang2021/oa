#!/bin/bash
BASE=http://localhost:3001
echo "=== login as admin ==="
TOK=$(curl -s -X POST $BASE/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token") or d.get("data",{}).get("token") or "")')
if [ -z "$TOK" ]; then echo "LOGIN FAILED (no token)"; curl -s -X POST $BASE/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | head -c 300; exit 0; fi
echo "token len: ${#TOK}"
echo "=== customers via API ==="
curl -s $BASE/api/v1/customers -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("customers total:", d.get("total") or d.get("data",{}).get("total") or len(d.get("data",[])) if isinstance(d,dict) else "n/a")' 2>/dev/null || echo "parse failed; raw head:" 
curl -s $BASE/api/v1/customers -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' | head -c 200
echo ""
echo "=== END ==="
