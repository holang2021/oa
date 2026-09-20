const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const pw = 'demo1234';
  const hash = await bcrypt.hash(pw, 10);
  await prisma.user.upsert({
    where: { id: 'demo-preview-001' },
    update: {},
    create: {
      id: 'demo-preview-001',
      name: '演示账号',
      email: 'demo@holang.com',
      password: hash,
      role: 'ADMIN',
      department: null,
      isActive: true,
    },
  });
  const u = await prisma.user.findUnique({ where: { id: 'demo-preview-001' }, select: { id: true, name: true, role: true } });
  console.log('DEMO_ADMIN_READY ' + JSON.stringify(u));
  await prisma.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
