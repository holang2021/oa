import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const users = await p.user.findMany({ select: { id: true, name: true, email: true, role: true, wecomUserId: true } })
  console.log(`Count: ${users.length}`)
  for (const u of users) console.log(JSON.stringify(u))
}
main().then(()=>process.exit(0))
