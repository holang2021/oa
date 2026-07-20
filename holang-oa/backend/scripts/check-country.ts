import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const all = await p.customer.count()
  const ext = await p.customer.count({ where: { salesType: 'EXTERNAL' } })
  const nullC = await p.customer.count({ where: { salesType: 'EXTERNAL', country: null } })
  const hasC = await p.customer.count({ where: { salesType: 'EXTERNAL', country: { not: null } } })
  console.log(`Total=${all} External=${ext} Null=${nullC} Has=${hasC}`)
  const samples = await p.customer.findMany({
    where: { salesType: 'EXTERNAL', country: null },
    select: { id: true, companyName: true, companyPhone: true, address: true, businessLine: true },
    take: 10
  })
  for (const s of samples) console.log(JSON.stringify(s))
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e));process.exit(1)})
