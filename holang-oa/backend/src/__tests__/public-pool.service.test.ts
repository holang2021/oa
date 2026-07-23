import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as pool from '../services/public-pool.service';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';

const MARK = '批次1A_POOL_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-pool'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : scope === 'INTERNAL' ? 'INTERNAL_SALES' : 'EXTERNAL_SALES', traceId: 'ut-trace' };
}

let internalPoolId = '';
let externalPoolId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 'ut-user-pool' },
    update: {},
    create: { id: 'ut-user-pool', name: 'UT Pool User', role: 'INTERNAL_SALES' },
  });
  await prisma.user.upsert({
    where: { id: 'ut-admin-pool' },
    update: {},
    create: { id: 'ut-admin-pool', name: 'UT Pool Admin', role: 'ADMIN' },
  });
  const a = await prisma.customer.create({
    data: { companyName: `${MARK}_内销公海`, salesType: 'INTERNAL', inPublicPool: true, ownerId: null },
  });
  const b = await prisma.customer.create({
    data: { companyName: `${MARK}_外销公海`, salesType: 'EXTERNAL', inPublicPool: true, ownerId: null },
  });
  internalPoolId = a.id;
  externalPoolId = b.id;
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D2 单元：公海认领服务端域强制', () => {
  it('内销销售认领内销公海 => 成功，移出公海并绑定 owner', async () => {
    const updated = await pool.claimCustomer(internalPoolId, ctx('INTERNAL'));
    expect(updated.inPublicPool).toBe(false);
    expect(updated.ownerId).toBe('ut-user-pool');
  });

  it('内销销售认领外销公海 => 403 越权拦截', async () => {
    // 先把上面认领的退回，制造一个仍在公海的外销样本（externalPoolId 仍在公海）
    let err: unknown;
    try {
      await pool.claimCustomer(externalPoolId, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
    // 外销样本仍处公海
    const still = await prisma.customer.findUnique({ where: { id: externalPoolId } });
    expect(still?.inPublicPool).toBe(true);
  });

  it('ADMIN(全域) 可认领外销公海', async () => {
    const updated = await pool.claimCustomer(externalPoolId, ctx('ALL', 'ut-admin-pool'));
    expect(updated.inPublicPool).toBe(false);
    expect(updated.ownerId).toBe('ut-admin-pool');
  });

  it('退回公海 => 标记 inPublicPool + 解绑 owner', async () => {
    const returned = await pool.returnCustomer(internalPoolId, ctx('INTERNAL'));
    expect(returned.inPublicPool).toBe(true);
    expect(returned.ownerId).toBeNull();
  });
});

describe('D2 单元：公海列表服务端域过滤', () => {
  it('内销销售列公海 => 仅 INTERNAL', async () => {
    // 确保两个都在公海
    await prisma.customer.update({ where: { id: externalPoolId }, data: { inPublicPool: true, ownerId: null } });
    const { list } = await pool.listPoolCustomers(ctx('INTERNAL'), {});
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c: any) => c.salesType === 'INTERNAL')).toBe(true);
  });

  it('ADMIN 列公海 => 含内外销', async () => {
    const { list } = await pool.listPoolCustomers(ctx('ALL'), {});
    const types = new Set(list.map((c: any) => c.salesType));
    expect(types.has('INTERNAL')).toBe(true);
    expect(types.has('EXTERNAL')).toBe(true);
  });
});
