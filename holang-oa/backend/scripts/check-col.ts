import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const info = await prisma.$queryRawUnsafe<any[]>('PRAGMA table_info(Customer)')
  const cols = info.map((c:any)=>c.name)
  console.log('HAS_country=', cols.includes('country'))
  console.log('COLS=', cols.join(','))
  // count export customers
  const ext = await prisma.$queryRawUnsafe<any[]>('SELECT COUNT(*) as c FROM Customer WHERE salesType="EXTERNAL"')
  console.log('EXTERNAL_total=', ext[0].c)
  const extNull = await prisma.$queryRawUnsafe<any[]>('SELECT COUNT(*) as c FROM Customer WHERE salesType="EXTERNAL" AND (country IS NULL OR country="")')
  console.log('EXTERNAL_country_null=', extNull[0].c)
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e));process.exit(1)})
