const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const safe = (x) => JSON.stringify(x, (k, v) => typeof v === 'bigint' ? Number(v) : v);

(async () => {
  try {
    const rows = await p.$queryRawUnsafe("SELECT id, customerCode, length(customerCode) AS code_len, companyName, length(companyName) AS name_len FROM customers WHERE companyName LIKE '%武汉%' AND customerCode LIKE '%409%'");
    console.log('武汉+409:', safe(rows));

    const lenDist = await p.$queryRawUnsafe("SELECT length(customerCode) AS len, COUNT(*) AS n FROM customers WHERE customerCode IS NOT NULL GROUP BY length(customerCode)");
    console.log('code_len distribution:', safe(lenDist));

    const all409 = await p.$queryRawUnsafe("SELECT id, customerCode, companyName FROM customers WHERE customerCode LIKE '%409%'");
    console.log('all with %409%:', safe(all409));
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();