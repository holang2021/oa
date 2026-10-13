import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as oppService from '../services/opportunity.service';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';

const MARK = '批次1A_OPP_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-opp'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : scope === 'INTERNAL' ? 'INTERNAL_SALES' : 'EXTERNAL_SALES', traceId: 'ut-trace' };
}

let internalCustId = '';
let externalCustId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 'ut-user-opp' },
    update: {},
    create: { id: 'ut-user-opp', name: 'UT Opp User', role: 'INTERNAL_SALES' },
  });
  const a = await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL', status: 'POTENTIAL' } });
  const b = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户`, salesType: 'EXTERNAL', status: 'POTENTIAL' } });
  internalCustId = a.id;
  externalCustId = b.id;
});

afterAll(async () => {
  await prisma.opportunity.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D3 单元：商机新建 + 服务端域强制', () => {
  it('内销销售在 INTERNAL 客户下建商机 => 成功，salesType=INTERNAL', async () => {
    const opp = await oppService.createOpportunity(
      {
        name: `${MARK}_内销商机`,
        customerId: internalCustId,
        expectedAmount: 100,
        description: '客户需要稳定的现场供气方案',
        competitorInfo: '竞品A，客户仍在比价',
      },
      ctx('INTERNAL')
    );
    expect(opp.salesType).toBe('INTERNAL');
    expect(opp.winProbability).toBe(10); // INITIAL_CONTACT
    expect(opp.description).toBe('客户需要稳定的现场供气方案');
    expect(opp.competitorInfo).toBe('竞品A，客户仍在比价');
  });

  it('内销销售在外销客户下建商机 => 403 越权', async () => {
    let err: unknown;
    try {
      await oppService.createOpportunity({ name: `${MARK}_越权`, customerId: externalCustId, expectedAmount: 100 }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });

  it('客户 POTENTIAL 建商机后推进为 INTERESTED', async () => {
    const cust = await prisma.customer.findUnique({ where: { id: internalCustId } });
    expect(cust?.status).toBe('INTERESTED');
  });
});

describe('D3 单元：商机列表/详情域过滤', () => {
  it('内销销售列表 => 仅 INTERNAL', async () => {
    const { list } = await oppService.listOpportunities({}, ctx('INTERNAL'));
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((o: any) => o.salesType === 'INTERNAL')).toBe(true);
  });

  it('内销销售查外销客户商机详情 => 403', async () => {
    const extOpp = await prisma.opportunity.create({ data: { name: `${MARK}_外销商机详情`, customerId: externalCustId, salesType: 'EXTERNAL', salesOwnerId: 'ut-user-opp' } });
    let err: unknown;
    try {
      await oppService.getOpportunity(extOpp.id, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });
});
