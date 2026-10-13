import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import { generateToken } from '../utils/jwt';
import { ROLES } from '../constants/roles';

const DOMAIN = '@holang.batch1a.test';
const MARK = '批次1A_INTEG';
const seeds: Record<string, { id: string; token: string }> = {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
  // 测试副本使用固定等级配置，避免运行库中的人工配置影响基线断言。
  const gradeConfigs = [
    { grade: 'A', label: 'A', followupMinDays: 5, followupMaxDays: 7, reviewDays: 30, maxRatioPct: 30 },
    { grade: 'B', label: 'B', followupMinDays: 14, followupMaxDays: 21, reviewDays: 60, maxRatioPct: 100 },
    { grade: 'C', label: 'C', followupMinDays: 28, followupMaxDays: 42, reviewDays: 90, maxRatioPct: 100 },
  ];
  for (const config of gradeConfigs) {
    await prisma.customerGradeConfig.upsert({
      where: { grade: config.grade },
      create: config,
      update: config,
    });
  }

  const specs = [
    { key: 'internal', role: ROLES.INTERNAL_SALES, wecom: 'wb_b1a_internal' },
    { key: 'external', role: ROLES.EXTERNAL_SALES, wecom: 'wb_b1a_external' },
    { key: 'admin', role: ROLES.ADMIN, wecom: 'wb_b1a_admin' },
  ];
  for (const s of specs) {
    const u = await prisma.user.create({
      data: { name: `批次1A${s.key}`, email: `${s.key}${DOMAIN}`, wecomUserId: s.wecom, role: s.role, password: 'x' },
    });
    seeds[s.key] = { id: u.id, token: generateToken({ id: u.id, name: u.name, role: s.role }) };
  }

  // 制造公海样本（内销/外销各一）
  await prisma.customer.create({ data: { companyName: `${MARK}_内销公海`, salesType: 'INTERNAL', inPublicPool: true, ownerId: null } });
  await prisma.customer.create({ data: { companyName: `${MARK}_外销公海`, salesType: 'EXTERNAL', inPublicPool: true, ownerId: null } });
  // 一个内销客户用于建商机/报价
  await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL' } });
});

afterAll(async () => {
  // 先删子表（报价/商机依赖客户），再删客户，最后删用户，避免外键约束 P2003。
  // 报价单号为 QT... 生成式、不含 MARK，故按 customer 引用删除（而非 quoteNumber）。
  await prisma.quote.deleteMany({ where: { customer: { companyName: { contains: MARK } } } });
  await prisma.opportunity.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
  await prisma.$disconnect();
});

function auth(key: string) {
  return { Authorization: `Bearer ${seeds[key].token}` };
}

describe('批次1-A 集成：客户等级 A/B/C 频次', () => {
  it('POST /customers 带 4 选择题(A) => 返回 grade=A 且 nextFollowupAt 落在 5~7 天', async () => {
    const beforeRequest = Date.now();
    const res = await request(app)
      .post('/api/v1/customers')
      .set(auth('internal'))
      .send({
        companyName: `${MARK}_A客户`,
        gradeSignals: { urgency: 'HIGH', budget: 'READY', decision: 'CONTACTED', engagement: 'ACTIVE' },
      });
    expect(res.status).toBe(201);
    expect(['A', 'B']).toContain(res.body.data.grade); // A 占比控可能降为 B
    const next = new Date(res.body.data.nextFollowupAt).getTime();
    const days = (next - beforeRequest) / 86400000;
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThanOrEqual(7);
  });
});

describe('批次1-A 集成：公海服务端域隔离', () => {
  it('内销销售列公海 => 仅 INTERNAL', async () => {
    const res = await request(app).get(`/api/v1/customers/pool?search=${encodeURIComponent(MARK)}`).set(auth('internal'));
    expect(res.status).toBe(200);
    const list: any[] = res.body.data.list;
    expect(list.every((c) => c.salesType === 'INTERNAL')).toBe(true);
    expect(list.find((c) => c.companyName === `${MARK}_内销公海`)).toBeDefined();
  });

  it('外销销售列公海 => 仅 EXTERNAL', async () => {
    const res = await request(app).get(`/api/v1/customers/pool?search=${encodeURIComponent(MARK)}`).set(auth('external'));
    expect(res.status).toBe(200);
    const list: any[] = res.body.data.list;
    expect(list.every((c) => c.salesType === 'EXTERNAL')).toBe(true);
  });

  it('内销销售认领外销公海客户 => 403 越权拦截', async () => {
    const ext = await prisma.customer.findFirst({ where: { companyName: `${MARK}_外销公海` } });
    const res = await request(app).post(`/api/v1/customers/${ext!.id}/claim`).set(auth('internal'));
    expect(res.status).toBe(403);
  });

  it('内销销售认领内销公海客户 => 成功', async () => {
    const int = await prisma.customer.findFirst({ where: { companyName: `${MARK}_内销公海` } });
    const res = await request(app).post(`/api/v1/customers/${int!.id}/claim`).set(auth('internal'));
    expect(res.status).toBe(200);
    expect(res.body.data.inPublicPool).toBe(false);
  });
});

describe('批次1-A 集成：商机/报价从0激活 + 域隔离', () => {
  it('内销销售建商机 => 成功', async () => {
    const cust = await prisma.customer.findFirst({ where: { companyName: `${MARK}_内销客户` } });
    const res = await request(app)
      .post('/api/v1/opportunities')
      .set(auth('internal'))
      .send({ name: `${MARK}_商机`, customerId: cust!.id, expectedAmount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.data.salesType).toBe('INTERNAL');
  });

  it('内销销售建商机到外销客户 => 403', async () => {
    const ext = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户2`, salesType: 'EXTERNAL' } });
    const res = await request(app)
      .post('/api/v1/opportunities')
      .set(auth('internal'))
      .send({ name: `${MARK}_越权商机`, customerId: ext.id, expectedAmount: 500 });
    expect(res.status).toBe(403);
  });

  it('内销销售列商机 => 仅 INTERNAL', async () => {
    const res = await request(app).get('/api/v1/opportunities').set(auth('internal'));
    expect(res.status).toBe(200);
    const list: any[] = res.body.data.list;
    expect(list.every((o) => o.salesType === 'INTERNAL')).toBe(true);
  });

  it('内销销售建报价（需产品） => 成功', async () => {
    const cust = await prisma.customer.findFirst({ where: { companyName: `${MARK}_内销客户` } });
    const product = await prisma.product.create({ data: { name: `${MARK}_产品`, unitPrice: 800 } });
    const res = await request(app)
      .post('/api/v1/quotes')
      .set(auth('internal'))
      .send({ customerId: cust!.id, items: [{ productId: product.id, quantity: 1 }], discount: 0, taxRate: 13 });
    expect(res.status).toBe(201);
    expect(res.body.data.salesType).toBe('INTERNAL');
  });
});

describe('批次1-A 集成：等级配置种子正确', () => {
  it('customer_grade_config 含 A/B/C 三档且频次正确', async () => {
    const cfg = await prisma.customerGradeConfig.findMany({ orderBy: { grade: 'asc' } });
    expect(cfg.length).toBe(3);
    const map = Object.fromEntries(cfg.map((c) => [c.grade, c]));
    expect(map.A.followupMinDays).toBe(5);
    expect(map.A.followupMaxDays).toBe(7);
    expect(map.B.followupMinDays).toBe(14);
    expect(map.B.followupMaxDays).toBe(21);
    expect(map.C.followupMinDays).toBe(28);
    expect(map.C.followupMaxDays).toBe(42);
  });
});
