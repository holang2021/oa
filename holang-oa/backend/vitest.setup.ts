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
const testDb = path.join(cacheDir, 'holang-test.db');

if (!fs.existsSync(testDb)) {
  fs.copyFileSync(realDb, testDb);
}

// Prisma 以 file:<绝对路径> 形式解析（与 .env 中 DATABASE_URL 格式一致）
process.env.DATABASE_URL = `file:${testDb}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch0-test-secret';

// 抑制 pino 在测试中的输出噪声
process.env.LOG_LEVEL = 'silent';
