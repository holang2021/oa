import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const list = await p.customer.findMany({
    where: { salesType: 'EXTERNAL', country: null },
    select: { id: true, companyName: true, companyPhone: true, businessLine: true },
  })
  let withPhone = 0; let noPhone = 0
  for (const c of list) {
    const hasPhone = c.companyPhone && c.companyPhone.trim().length > 0
    if (hasPhone) withPhone++; else noPhone++
    console.log((hasPhone ? '[PHONE]' : '[NONE]') + ' ' + c.id + ' | ' + c.companyName + ' | ' + (c.companyPhone || 'N/A') + ' | ' + c.businessLine)
  }
  console.log('\nTotal: ' + list.length + ' | WithPhone: ' + withPhone + ' | NoPhone: ' + noPhone)
}
main().then(() => process.exit(0)).catch(e => { console.error(String(e)); process.exit(1) })
