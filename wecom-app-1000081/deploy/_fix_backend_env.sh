set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cd /opt/holang/oa/backend
echo "=== before ==="
grep '^DATABASE_URL' .env
# 改为服务器绝对路径，指向生产库 holang-crm.db（避开 Prisma 相对路径歧义）
sed -i 's#^DATABASE_URL=.*#DATABASE_URL="file:/opt/holang/oa/backend/prisma/holang-crm.db"#' .env
echo "=== after ==="
grep '^DATABASE_URL' .env
echo "=== db file present? ==="
ls -lh /opt/holang/oa/backend/prisma/holang-crm.db
echo "=== restart pm2 ==="
pm2 restart holang-oa-backend
sleep 5
echo "=== pm2 status ==="
pm2 list | grep holang-oa-backend
echo "=== health /api/v1 ==="
curl -sS -m 10 http://127.0.0.1:3001/api/v1 || echo "HEALTH_FAIL"
echo ""
echo "=== recent pm2 logs (look for DB errors) ==="
pm2 logs holang-oa-backend --lines 25 --nostream 2>/dev/null | tail -25
echo "FIX_DONE"
