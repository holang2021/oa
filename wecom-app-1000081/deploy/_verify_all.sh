#!/bin/bash
BASE=http://localhost:3001
TOK=$(curl -s -X POST $BASE/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("token") or (d.get("data") or {}).get("token") or "")')
for EP in customers orders contacts follow-ups payments invoices deliveries; do
  RES=$(curl -s "$BASE/api/v1/$EP?page=1&pageSize=1" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json')
  TOT=$(echo "$RES" | python3 -c 'import sys,json;d=json.load(sys.stdin);dd=d.get("data") or {};print(dd.get("total") if isinstance(dd,dict) else "n/a")' 2>/dev/null)
  MSG=$(echo "$RES" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("message"))' 2>/dev/null)
  echo "$EP -> total=$TOT msg=$MSG"
done
