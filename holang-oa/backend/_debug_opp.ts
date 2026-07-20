import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  try {
    const total = await prisma.opportunity.count({});
    console.log('count:', total);
    const list = await prisma.opportunity.findMany({
      include: {
        customer: { select: { id: true, companyName: true, status: true } },
        product: { select: { id: true, name: true, model: true } },
        salesOwner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    console.log('found:', list.length);
    console.log('sample:', JSON.stringify(list[0]?.name));
  } catch (e: any) {
    console.error('REAL ERROR:', e?.message);
    console.error((e?.stack || '').split('\n').slice(0, 6).join('\n'));
  } finally {
    await prisma.$disconnect();
  }
})();
