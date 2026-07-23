// ============================================================
// Vitest 全局 setup —— 批次0 地基
// 关键安全：复制真实 DB(holang-crm.db) 为临时副本，所有测试仅在副本上进行，
// 绝不触碰生产数据（394 客户 / 283 订单 / 458 回款）。
// 设置 DATABASE_URL 指向副本，必须在 import app 之前完成。
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const backendDir = path.resolve(__dirname);
const realDb = path.join(backendDir, 'prisma', 'holang-crm.db');
const cacheDir = path.join(backendDir, 'node_modules', '.cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}
// 每个 worker 独立副本：避免多 worker 并发 ALTER 同一 SQLite 文件导致锁竞争。
// 副本由真实库【文件复制】得到（仅读字节，绝不开连接改真实库）。
const workerId = process.env.VITEST_WORKER_ID || '0';
const testDb = path.join(cacheDir, `holang-test-${workerId}.db`);

// 每次都从真实库【文件复制】一份干净副本：避免上次失败残留的残缺副本被复用
// （残缺副本缺新列会永久导致 P2022）。仅读字节，绝不开连接改真实库。
fs.copyFileSync(realDb, testDb);

// Prisma 以 file:<绝对路径> 形式解析（与 .env 中 DATABASE_URL 格式一致）
process.env.DATABASE_URL = `file:${testDb}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch0-test-secret';

// 抑制 pino 在测试中的输出噪声
process.env.LOG_LEVEL = 'silent';

// ── 批次1-A：将本批次 schema 变更（仅 ALTER ADD COLUMN / CREATE TABLE / 种子）
//    应用到「测试库副本」，保证测试可跑新字段。绝不触碰真实库 holang-crm.db。
//    注意：必须【先设置 DATABASE_URL 再动态 import prisma】，否则 PrismaClient
//    单例会在 import 时捕获 .env 中的真实库 URL（ESM import 提升），导致误改真实库。
async function applyMigration(migrationDir: string, label: string) {
  const migrationSql = path.join(backendDir, 'prisma', 'migrations', migrationDir, 'migration.sql');
  if (!fs.existsSync(migrationSql)) return;
  const { prisma } = await import('./src/config/database');
  const raw = fs.readFileSync(migrationSql, 'utf-8');
  // 先去掉纯注释行（以 -- 开头的整行），避免「注释 + 语句」同段时被整段丢弃，
  // 否则 CREATE TABLE / ALTER 等会被误删导致列缺失。
  const sql = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(`${stmt}`);
    } catch (e) {
      // 幂等：列/表/种子已存在则忽略；其余错误打印出来便于排查（绝不吞错）
      const msg = (e as Error)?.message || String(e);
      if (!/already exists|duplicate column/i.test(msg)) {
        console.error(`[${label}-migration] 语句执行失败:`, stmt, '->', msg);
      }
    }
  }
}

// 批次1-A：客户等级 + 公海（既有关联）
await applyMigration('batch1a_customer_grade_public_pool', 'batch1a');
// 批次1-B：MVP 闭环（合同扩展 + 外销 PI 表 + 关联字段）。仅作用于测试库副本，绝不碰真实库。
await applyMigration('batch1b_mvp_closed_loop', 'batch1b');
