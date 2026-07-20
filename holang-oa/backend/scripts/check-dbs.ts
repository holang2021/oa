import { PrismaClient } from '@prisma/client'

async function probe(url: string) {
  try {
    const p = new PrismaClient({ datasources: { db: { url } } })
    const c = await p.customer.count()
    const ext = await p.customer.count({ where: { salesType: 'EXTERNAL' } })
    const extNull = await p.customer.count({ where: { salesType: 'EXTERNAL', country: null } })
    console.log('URL=' + url + ' => customers=' + c + ' external=' + ext + ' external_null_country=' + extNull)
    await p.$disconnect()
  } catch (e: any) {
    console.log('URL=' + url + ' => ERROR ' + String(e.message).slice(0, 140))
  }
}

async function main() {
  await probe('file:F:/HOLANGbuddy/HOLANG项目/销售管理系统/holang-sales-crm/backend/prisma/holang-crm.db')
  await probe('file:C:/Users/liush/.workbuddy/skills/系统建设/holang-crm.db')
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1) })
