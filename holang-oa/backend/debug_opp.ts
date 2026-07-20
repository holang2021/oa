import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function main() {
  try {
    const total = await prisma.opportunity.count({});
    console.log("COUNT:", total);
    const list = await prisma.opportunity.findMany({
      where: {},
      include: {
        customer: { select: { id: true, companyName: true, status: true } },
        product: { select: { id: true, name: true, model: true } },
        salesOwner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 5,
    });
    console.log("LIST len:", list.length);
    console.log(JSON.stringify(list.slice(0, 1), null, 2));
  } catch (e) {
    console.error("=== REAL ERROR ===");
    console.error("name:", e.name);
    console.error("code:", e.code);
    console.error("message:", e.message);
    console.error("meta:", JSON.stringify(e.meta || {}, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
