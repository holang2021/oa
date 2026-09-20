set -e
export PATH="/usr/local/node22/bin:/usr/local/bin:$PATH"
cd /opt/holang/oa/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.\$queryRaw\`SELECT 1\`;
    console.log('RAW_OK', r[0]['1']);
    const tables = await p.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\`;
    console.log('TABLE_COUNT', tables.length);
    console.log('TABLES', tables.map(t=>t.name).join(','));
    process.exit(0);
  } catch (e) {
    console.error('DB_ERR', e.message);
    process.exit(1);
  }
})();
"
echo "DB_TEST_DONE"
