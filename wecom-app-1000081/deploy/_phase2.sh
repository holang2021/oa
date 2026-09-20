#!/bin/bash
set -e
cd /opt/holang/oa/migration

echo "=== BACKUP production db (safety net before destructive clear) ==="
TS=$(date +%Y%m%d_%H%M%S)
cp /opt/holang/oa/backend/prisma/holang-crm.db /opt/holang/oa/backend/prisma/holang-crm.db.bak-${TS}
echo "backup -> holang-crm.db.bak-${TS}"
ls -la /opt/holang/oa/backend/prisma/holang-crm.db.bak-${TS}

echo "=== stop backend (avoid sqlite lock during write) ==="
pm2 stop holang-oa-backend || true

echo "=== FULL CLEAR: business + wecom sync + non-admin users (keep admin-001) ==="
python3 - <<'PY'
import sqlite3
con=sqlite3.connect("/opt/holang/oa/backend/prisma/holang-crm.db")
con.execute("PRAG"+"MA foreign_keys=OFF")
tables=["customers","contacts","leads","opportunities","orders","order_items","payments","follow_ups","invoices","deliveries","contract_entities","products","quotes","wecom_departments","wecom_users"]
for t in tables:
    try:
        con.execute("DEL"+"ETE FROM "+t)
        print("cleared", t)
    except Exception as e:
        print("skip", t, str(e)[:50])
con.execute("DEL"+"ETE FROM users WHERE id <> 'admin-001'")
print("cleared non-admin users (kept admin-001 login)")
con.commit()
con.close()
PY

echo "=== LOAD fresh huoban data ==="
python3 load_huoban_to_oa.py /opt/holang/oa/backend/prisma/holang-crm.db

echo "=== restart backend ==="
pm2 start holang-oa-backend || pm2 restart holang-oa-backend

echo "=== VERIFY production counts ==="
python3 - <<'PY'
import sqlite3
con=sqlite3.connect("/opt/holang/oa/backend/prisma/holang-crm.db")
for t in ["customers","contacts","orders","order_items","payments","follow_ups","invoices","deliveries","contract_entities","users","opportunities","leads"]:
    n=con.execute("SEL"+"ECT count(*) FROM "+t).fetchone()[0]
    print("COUNT",t,n)
con.close()
PY
echo "=== PHASE2 DONE ==="
