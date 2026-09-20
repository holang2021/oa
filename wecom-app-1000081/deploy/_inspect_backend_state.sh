set -e
echo "=== /opt/holang/oa/backend exists? ==="
ls -la /opt/holang/oa/backend 2>/dev/null | head -30 || echo "NOT_DEPLOYED"
echo "=== pm2 list ==="
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
pm2 list 2>/dev/null || echo "PM2_NA"
echo "=== port 3001 listening? ==="
(ss -ltnp 2>/dev/null | grep ':3001' || netstat -ltnp 2>/dev/null | grep ':3001' || echo "PORT_3001_NOT_LISTEN")
echo "=== backend .env DATABASE_URL ==="
grep -n "^DATABASE_URL" /opt/holang/oa/backend/.env 2>/dev/null || echo "NO_ENV"
echo "=== db on server ==="
ls -lh /opt/holang/oa/backend/prisma/holang-crm.db 2>/dev/null || echo "NO_SERVER_DB"
