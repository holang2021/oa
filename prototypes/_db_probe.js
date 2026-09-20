const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // 1. 查 C0000409 这个客户
    const cust = await p.customer.findFirst({ where: { code: 'C0000409' } });
    if (!cust) {
      console.log('CUSTOMER_NOT_FOUND_BY_CODE_C0000409');
      // 退一步：模糊查公司名
      const fuzzy = await p.customer.findMany({ where: { companyName: { contains: '卓工' } } });
      console.log('FUZZY_MATCH:', JSON.stringify(fuzzy.map(c => ({ id: c.id, code: c.code, name: c.companyName })), null, 2));
      return;
    }
    console.log('CUSTOMER_FOUND:');
    console.log('  id=', cust.id);
    console.log('  code=', cust.code);
    console.log('  name=', cust.companyName);

    // 2. 查该客户的所有联系人
    const contacts = await p.contact.findMany({ where: { customerId: cust.id } });
    console.log('CONTACTS_TOTAL:', contacts.length);
    contacts.forEach(c => console.log('  -', JSON.stringify({ name: c.name, phone: c.phone, email: c.email, position: c.position, isPrimary: c.isPrimary })));

    // 3. 顺便：整库有多少客户、多少联系人
    const custCount = await p.customer.count();
    const conCount = await p.contact.count();
    console.log('GLOBAL: customers=', custCount, 'contacts=', conCount);
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();