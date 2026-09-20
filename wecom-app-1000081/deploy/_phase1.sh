#!/bin/bash
set -e
cd /opt/holang/oa/migration
echo "=== python3 ==="
python3 --version
TS=$(date +%Y%m%d_%H%M%S)
echo "=== export (fresh from huoban API) ==="
python3 huoban_export.py
echo "=== convert to CRM json ==="
python3 huoban_to_crm.py
echo "=== backup production db (timestamped) ==="
cp /opt/holang/oa/backend/prisma/holang-crm.db /opt/holang/oa/backend/prisma/holang-crm.db.bak-$TS
ls -la /opt/holang/oa/backend/prisma/holang-crm.db.bak-$TS
echo "=== PROVE load against a COPY (non-destructive) ==="
cp /opt/holang/oa/backend/prisma/holang-crm.db /tmp/prod_dry.db
python3 load_huoban_to_oa.py /tmp/prod_dry.db
echo "=== PHASE1 DONE ==="
