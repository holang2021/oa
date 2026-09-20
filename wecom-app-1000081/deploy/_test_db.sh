set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cd /opt/holang/oa/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.\$queryRaw\`SELECT 1 as ok\`;
    console.log('RAW_OK', JSON.stringify(r));
    // 试着数几张常见表，证明 schema 已迁移且可读
    const tables = await p.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table'\`;
    console.log('TABLE_COUNT', tables.length);
    process.exit(0);
  } catch (e) {
    console.error('DB_ERR', e.message);
    process.exit(1);
  }
})();
"
echo "DB_TEST_DONE"
