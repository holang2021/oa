// 幂等种子：客户等级配置 A/B/C（来源：prisma/migrations/batch1a_*/migration.sql）
// 仅补数据，不碰业务逻辑；运行后端同库（dotenv 自动加载 ./env 的 DATABASE_URL）
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROWS = [
  { grade: 'A', label: '高紧迫·短期可成', followupMinDays: 5,  followupMaxDays: 7,  reviewDays: 30, maxRatioPct: 30, downgradeRule: '连续2次超期未跟进自动降至B；A占比超30%触发总监复审' },
  { grade: 'B', label: '周期慢·中期评估', followupMinDays: 14, followupMaxDays: 21, reviewDays: 60, maxRatioPct: 0,  downgradeRule: '连续2次超期未跟进自动降至C' },
  { grade: 'C', label: '需求一般·长期培育', followupMinDays: 28, followupMaxDays: 42, reviewDays: 90, maxRatioPct: 0,  downgradeRule: '超期未跟进保持C并标记沉睡' },
];

(async () => {
  for (const r of ROWS) {
    const existing = await prisma.customerGradeConfig.findUnique({ where: { grade: r.grade } });
    if (existing) {
      console.log('  SKIP 已存在:', r.grade, '-', existing.label);
    } else {
      await prisma.customerGradeConfig.create({ data: r });
      console.log('  INSERT 已补:', r.grade, '-', r.label);
    }
  }
  const all = await prisma.customerGradeConfig.findMany({ orderBy: { grade: 'asc' } });
  console.log('现有配置行数:', all.length, all.map((x) => x.grade).join(','));
  await prisma.$disconnect();
})().catch((e) => { console.error('种子失败:', e.message); process.exit(1); });
