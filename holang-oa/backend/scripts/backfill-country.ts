// ============================================================
// 国家字段回填脚本
// 1. 电话检测（高置信度）
// 2. 公司名关键词推断（中置信度）
// 3. 不可识别的留空，前端标注"待补全"
// ============================================================
import { PrismaClient } from '@prisma/client'
import { detectCountryFromPhone } from '../src/utils/phoneCountry'

const p = new PrismaClient()

// ── 公司名 → 国家 关键词映射（中置信度） ──
const NAME_KEYWORDS: Record<string, string> = {
  '泰国':'泰国', '曼谷':'泰国', 'Thailand':'泰国', 'Bangkok':'泰国',
  '马来西亚':'马来西亚', '吉隆坡':'马来西亚', 'Malaysia':'马来西亚', 'Kuala Lumpur':'马来西亚', 'SDN BHD':'马来西亚', 'SDN. BHD.':'马来西亚', 'Sdn.Bhd':'马来西亚',
  '乌克兰':'乌克兰', 'Ukraine':'乌克兰',
  '俄罗斯':'俄罗斯', 'Russia':'俄罗斯',
  '印尼':'印度尼西亚', 'Indonesia':'印度尼西亚', 'Jakarta':'印度尼西亚', 'PT ':'印度尼西亚', 'PT.':'印度尼西亚',
  '罗马尼亚':'罗马尼亚', 'Romania':'罗马尼亚', 'Bucharest':'罗马尼亚', '布加勒斯特':'罗马尼亚',
  '英国':'英国', 'United Kingdom':'英国', 'London':'英国', '伦敦':'英国', 'Leeds':'英国',
  '意大利':'意大利', 'Italy':'意大利', 'Milano':'意大利', 'SRL':'意大利',
  'USA':'美国', 'United States':'美国', '美国':'美国', 'New York':'美国',
  '韩国':'韩国', 'Korea':'韩国',
  '巴基斯坦':'巴基斯坦', 'Pakistan':'巴基斯坦',
  '波兰':'波兰', 'Poland':'波兰', 'Warsaw':'波兰',
  '芬兰':'芬兰', 'Finland':'芬兰',
  '巴西':'巴西', 'Brazil':'巴西',
  '印度':'印度', 'India':'印度',
  '比利时':'比利时', 'Belgium':'比利时',
  '荷兰':'荷兰', 'Netherlands':'荷兰',
  '澳大利亚':'澳大利亚', 'Australia':'澳大利亚',
  '法国':'法国', 'France':'法国',
  '德国':'德国', 'Germany':'德国',
  '菲律宾':'菲律宾', 'Philippines':'菲律宾',
  '越南':'越南', 'Vietnam':'越南',
  'Iraq':'伊拉克', 'Ibn':'伊拉克', 'Pharma':'伊拉克',
  '.pl':'波兰',
  'PROTOTYPUJEMY':'波兰',
  'Medical Research':'英国',
  'MRC':'英国',
  'Laboratory of Molecular':'英国',
  'United Air System':'美国',
  'Equilibrium Intertrade':'美国',
  'Peerless Energy':'美国',
  'Saymar Marine':'新加坡',
}

function detectFromName(name: string): string | null {
  const upper = name.toUpperCase()
  // 按关键词长度降序排列，确保长词优先匹配
  const entries = Object.entries(NAME_KEYWORDS).sort((a, b) => b[0].length - a[0].length)
  for (const [kw, country] of entries) {
    if (upper.includes(kw.toUpperCase())) {
      return country
    }
  }
  return null
}

async function main() {
  const list = await p.customer.findMany({
    where: { salesType: 'EXTERNAL', country: null },
    select: { id: true, companyName: true, companyPhone: true },
  })

  let phoneMatched = 0
  let nameMatched = 0
  let unmatched = 0
  const results: { id: string; name: string; country: string; method: string }[] = []

  for (const c of list) {
    let country: string | null = null
    let method = ''

    // 优先电话检测
    if (c.companyPhone) {
      const info = detectCountryFromPhone(c.companyPhone)
      if (info) {
        country = info.zh
        method = 'phone'
        phoneMatched++
      }
    }

    // 其次公司名推断
    if (!country) {
      const guessed = detectFromName(c.companyName)
      if (guessed) {
        country = guessed
        method = 'name'
        nameMatched++
      }
    }

    if (country) {
      results.push({ id: c.id, name: c.companyName, country, method })
    } else {
      unmatched++
    }
  }

  // 展示结果
  console.log('=== 将回填 ===')
  for (const r of results) {
    console.log(`  [${r.method}] ${r.id.slice(-8)} | ${r.country.padEnd(10)} | ${r.name}`)
  }
  console.log(`\n电话匹配: ${phoneMatched} | 名称推断: ${nameMatched} | 无法识别: ${unmatched}`)
  console.log(`共回填: ${results.length} / ${list.length}`)

  // 确认执行
  const dryRun = process.argv.includes('--dry')
  if (dryRun) {
    console.log('\n>>> DRY RUN — 未实际写入。加 --write 参数执行写入 <<<')
    return
  }

  const writeFlag = process.argv.includes('--write')
  if (!writeFlag) {
    console.log('\n>>> 预览模式 — 未实际写入。运行 tsx backfill-country.ts --write 执行写入 <<<')
    return
  }

  // 执行回填（用原始 SQL 绕过 SQLite DateTime 兼容问题）
  for (const r of results) {
    await p.$executeRawUnsafe(
      'UPDATE customers SET country = ?, updatedAt = datetime("now") WHERE id = ?',
      r.country,
      r.id
    )
  }
  console.log(`\n✅ 已回填 ${results.length} 条记录`)
}

main().then(() => process.exit(0)).catch(e => { console.error(String(e)); process.exit(1) })
