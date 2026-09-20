// Probe v2: 改用 ID 字段 + include salesOwner
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/(股份有限公司|有限责任公司|有限公司|股份|集团|总部|分公司|控股|事业部|工厂|公司|\(.*?\)|（.*?）)/g, '')
  .trim();

// 中文→拼音首字母 & 简化的相似度
const asciiOf = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const containsLoose = (a, b) => {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  // 拼音首字母的子串匹配（如 HOLANG 头字母 = h o l a n g 不一定匹配 中文）
  return asciiOf(a).includes(asciiOf(b)) || asciiOf(b).includes(asciiOf(a));
};

(async () => {
  const variants = ['HOLANG', '昊朗', 'honglang', 'HONGLANG', '苏州'];
  console.log('=== 全表关键字扫描 ===');
  for (const k of variants) {
    const rows = await p.customer.findMany({
      where: { OR: [{ companyName: { contains: k } }, { customerCode: { contains: k } }] },
      include: { salesOwner: { select: { name: true } } },
    });
    console.log(`\n[${k}] ${rows.length} 条`);
    rows.slice(0, 8).forEach((r) => console.log(`   ${r.customerCode} | ${r.companyName} | owner=${r.salesOwner?.name} | status=${r.customerStatus}`));
  }

  console.log('\n=== 规范化+包含关系判重（看 "HOLANG"、"昊朗"、"honglang" 该撞到谁） ===');
  const inputs = ['HOLANG', '昊朗', 'honglang', 'holang', '海浪'];
  const all = await p.customer.findMany({ include: { salesOwner: { select: { name: true } } } });
  for (const q of inputs) {
    const nq = norm(q);
    const exact = all.filter((r) => norm(r.companyName) === nq);
    const contains = all.filter((r) => !exact.includes(r) && containsLoose(norm(r.companyName), nq));
    console.log(`\n输 [${q}] → 规范="${nq}"`);
    console.log(`  精确命中 ${exact.length} 条:`, exact.map((r) => r.companyName));
    console.log(`  包含+字母混排命中 ${contains.length} 条 (前5):`, contains.slice(0, 5).map((r) => r.companyName));
  }

  // 看一下是否有人名是 salesOwner
  console.log('\n=== salesOwner 关系样本（看 owner 表里有没有 name=HOLANG 这种别名） ===');
  const owners = await p.user.findMany({ select: { id: true, name: true }, take: 10 });
  owners.forEach((u) => console.log(`   user ${u.id} ${u.name}`));

  await p.$disconnect();
})();
