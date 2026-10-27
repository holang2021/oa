import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = `PostgreSQL CI smoke ${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      name,
      role: 'SALES',
    },
  });

  const persisted = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (persisted?.name !== name) {
    throw new Error('PostgreSQL Prisma smoke verification failed.');
  }

  await prisma.user.delete({
    where: { id: user.id },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
