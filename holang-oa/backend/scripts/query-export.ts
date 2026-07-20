import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const cs = await prisma.customer.findMany({
    where: { salesType: 'EXTERNAL', country: null },
    select: { id: true, companyName: true, address: true, companyPhone: true, businessLine: true }
  })
  console.log('COUNT=', cs.length)
  for (const c of cs) {
    console.log(JSON.stringify({ n: c.companyName, a: c.address, p: c.companyPhone, bl: c.businessLine }))
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
