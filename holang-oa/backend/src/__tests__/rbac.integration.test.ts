import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import { generateToken } from '../utils/jwt';
import { ROLES, Role } from '../constants/roles';

const DOMAIN = '@holang.batch0.test';

interface Seed {
  id: string;
  token: string;
}

const seeds: Record<string, Seed> = {};

function auth(user: Seed) {
  return { Authorization: `Bearer ${user.token}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  // 清理旧测试用户，避免重跑唯一约束冲突
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });

  const specs: Array<{ key: string; role: Role; wecom: string }> = [
    { key: 'internal', role: ROLES.INTERNAL_SALES, wecom: 'wb_b0_internal' },
    { key: 'external', role: ROLES.EXTERNAL_SALES, wecom: 'wb_b0_external' },
    { key: 'finance', role: ROLES.FINANCE, wecom: 'wb_b0_finance' },
    { key: 'readonly', role: ROLES.READONLY_AUDIT, wecom: 'wb_b0_readonly' },
    { key: 'admin', role: ROLES.ADMIN, wecom: 'wb_b0_admin' },
  ];

  for (const s of specs) {
    const u = await prisma.user.create({
      data: {
        name: `批次0${s.key}`,
        email: `${s.key}${DOMAIN}`,
        wecomUserId: s.wecom,
        role: s.role,
        password: 'x',
      },
    });
    seeds[s.key] = { id: u.id, token: generateToken({ id: u.id, name: u.name, role: s.role }) };
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: '批次0' } } });
  await prisma.$disconnect();
});

describe('D1 集成：导出权限（H-2 防下载硬约束）', () => {
  it('非 ADMIN/FINANCE 访问客户导出端点 => 403', async () => {
    const res = await request(app)
      .get('/api/v1/customers/export/excel')
      .set(auth(seeds.internal));
    expect(res.status).toBe(403);
  });

  it('FINANCE 访问客户导出端点 => 不被拦截（非 403）', async () => {
    const res = await request(app)
      .get('/api/v1/customers/export/excel')
      .set(auth(seeds.finance));
    expect(res.status).not.toBe(403);
  });

  it('非导出角色访问迁移模板下载 => 403', async () => {
    const res = await request(app).get('/api/v1/migration/template').set(auth(seeds.internal));
    expect(res.status).toBe(403);
  });
});

describe('D4 集成：销售域隔离（公海/客户主数据 可看不可下 + 按域隔离）', () => {
  it('内销销售仅见 INTERNAL 客户，且 EXTERNAL 客户被隔离', async () => {
    const extSample = await prisma.customer.findFirst({ where: { salesType: 'EXTERNAL' } });
    const res = await request(app).get('/api/v1/customers').set(auth(seeds.internal));
    expect(res.status).toBe(200);
    const list: any[] = res.body?.data?.list ?? [];
    // 全部为内销域
    expect(list.every((c) => c.salesType === 'INTERNAL')).toBe(true);
    // 若存在外销样本，绝不应出现在内销销售视野中
    if (extSample) {
      expect(list.find((c) => c.id === extSample.id)).toBeUndefined();
    }
  });

  it('外销销售仅见 EXTERNAL 客户', async () => {
    const res = await request(app).get('/api/v1/customers').set(auth(seeds.external));
    expect(res.status).toBe(200);
    const list: any[] = res.body?.data?.list ?? [];
    expect(list.every((c) => c.salesType === 'EXTERNAL')).toBe(true);
  });

  it('ADMIN(全域) 可见全部客户', async () => {
    const res = await request(app).get('/api/v1/customers').set(auth(seeds.admin));
    expect(res.status).toBe(200);
    const list: any[] = res.body?.data?.list ?? [];
    const total = await prisma.customer.count();
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(total);
  });
});

describe('D2 集成：统一审计落库', () => {
  it('客户主数据访问被记录（CUSTOMER_ACCESS）', async () => {
    await request(app).get('/api/v1/customers').set(auth(seeds.internal));
    await sleep(150);
    const rows = await prisma.auditLog.findMany({
      where: { userId: seeds.internal.id, action: 'CUSTOMER_ACCESS' },
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].salesType).toBe('INTERNAL');
  });

  it('被拒的导出尝试被记录（EXPORT + DENIED）', async () => {
    await request(app).get('/api/v1/customers/export/excel').set(auth(seeds.internal));
    await sleep(150);
    const rows = await prisma.auditLog.findMany({
      where: { userId: seeds.internal.id, action: 'EXPORT', result: 'DENIED' },
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('写操作（新建客户）被记录（WRITE）', async () => {
    await request(app)
      .post('/api/v1/customers')
      .set(auth(seeds.internal))
      .send({ companyName: `批次0写入测试${Date.now()}`, contacts: [] });
    await sleep(150);
    const rows = await prisma.auditLog.findMany({
      where: { userId: seeds.internal.id, action: 'WRITE' },
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe('D1 集成：未认证请求被拒', () => {
  it('无 token 访问受保护端点 => 401', async () => {
    const res = await request(app).get('/api/v1/rbac/roles');
    expect(res.status).toBe(401);
  });
});
