#!/bin/bash
echo "=== DATABASE_URL in backend .env ==="
grep -i "DATABASE_URL" /opt/holang/oa/backend/.env 2>/dev/null | sed 's/\(sqlite.*\/\/\).*/\1***/' || echo "no .env or no DATABASE_URL"
echo "=== last 40 lines of backend log ==="
pm2 logs holang-oa-backend --lines 40 --nostream 2>/dev/null | tail -45
echo "=== END ==="
