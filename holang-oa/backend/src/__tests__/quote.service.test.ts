import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as quoteService from '../services/quote.service';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';

const MARK = '批次1A_QUOTE_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-quote'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : scope === 'INTERNAL' ? 'INTERNAL_SALES' : 'EXTERNAL_SALES', traceId: 'ut-trace' };
}

let internalCustId = '';
let externalCustId = '';
let productId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 'ut-user-quote' },
    update: {},
    create: { id: 'ut-user-quote', name: 'UT Quote User', role: 'INTERNAL_SALES' },
  });
  const a = await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL' } });
  const b = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户`, salesType: 'EXTERNAL' } });
  const p = await prisma.product.create({ data: { name: `${MARK}_设备`, unitPrice: 1000 } });
  internalCustId = a.id;
  externalCustId = b.id;
  productId = p.id;
});

afterAll(async () => {
  // 报价单号为 QT... 生成式、不含 MARK，按 customerId 删除（避免 P2003 外键约束）
  await prisma.quote.deleteMany({ where: { customerId: { in: [internalCustId, externalCustId] } } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.product.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D3 单元：报价金额计算（内外销计税）', () => {
  it('内销：含税计算 amountWithoutTax', () => {
    const r = quoteService.calcQuoteTotals([{ unitPrice: 1000, quantity: 2, discount: 0, subtotal: 2000 }], 0, false, 13);
    expect(r.totalAmount).toBe(2000);
    expect(r.taxRate).toBe(13);
    // 2000 / 1.13
    expect(Math.round(r.amountWithoutTax * 100) / 100).toBe(1769.91);
  });
  it('外销：统一未税 taxRate=0', () => {
    const r = quoteService.calcQuoteTotals([{ unitPrice: 1000, quantity: 1, discount: 0, subtotal: 1000 }], 0, true, 13);
    expect(r.taxRate).toBe(0);
    expect(r.amountWithoutTax).toBe(1000);
    expect(r.totalAmount).toBe(1000);
  });
});

describe('D3 单元：报价新建 + 服务端域强制', () => {
  it('内销销售对外销客户建报价 => 403 越权', async () => {
    let err: unknown;
    try {
      await quoteService.createQuote({ customerId: externalCustId, items: [{ productId, quantity: 1 }] }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });

  it('内销销售对内销客户建报价 => 成功，salesType=INTERNAL', async () => {
    const q = await quoteService.createQuote(
      { customerId: internalCustId, items: [{ productId, quantity: 2, discount: 0 }], discount: 0, taxRate: 13 },
      ctx('INTERNAL')
    );
    expect(q.salesType).toBe('INTERNAL');
    expect(q.totalAmount).toBe(2000);
    expect(q.items.length).toBe(1);
  });

  it('内销销售列报价 => 仅 INTERNAL', async () => {
    const { list } = await quoteService.listQuotes({}, ctx('INTERNAL'));
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((q: any) => q.salesType === 'INTERNAL')).toBe(true);
  });
});
