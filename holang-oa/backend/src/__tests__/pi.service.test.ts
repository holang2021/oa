import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as piService from '../services/pi.service';
import * as quoteService from '../services/quote.service';
import * as oppRepo from '../repositories/opportunity.repository';
import * as custRepo from '../repositories/customer.repository';
import * as productRepo from '../repositories/product.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';
import { OpportunityStage } from '../constants/enums';

const MARK = '批次1B_PI_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-pi'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : 'EXTERNAL_SALES', traceId: 'ut-trace' };
}

let externalCustId = '';
let internalCustId = '';
let productId = '';
let wonOppId = '';
let acceptedQuoteId = '';
let draftQuoteId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 'ut-user-pi' },
    update: {},
    create: { id: 'ut-user-pi', name: 'UT PI User', role: 'EXTERNAL_SALES' },
  });
  const a = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户`, salesType: 'EXTERNAL' } });
  const b = await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL' } });
  const p = await prisma.product.create({ data: { name: `${MARK}_设备`, unitPrice: 2000 } });
  externalCustId = a.id;
  internalCustId = b.id;
  productId = p.id;

  const opp = await oppRepo.createOpportunity({
    name: `${MARK}_商机`,
    customerId: externalCustId,
    expectedAmount: 2000,
    stage: OpportunityStage.WON,
    winProbability: 100,
    salesType: 'EXTERNAL',
    salesOwnerId: 'ut-user-pi',
  });
  wonOppId = opp.id;

  const q1 = await quoteService.createQuote(
    { customerId: externalCustId, items: [{ productId, quantity: 1 }], opportunityId: wonOppId },
    ctx('EXTERNAL')
  );
  const accepted = await quoteService.acceptQuote(q1.id, ctx('EXTERNAL'));
  acceptedQuoteId = accepted.id;

  const q2 = await quoteService.createQuote(
    { customerId: externalCustId, items: [{ productId, quantity: 1 }] },
    ctx('EXTERNAL')
  );
  draftQuoteId = q2.id;
});

afterAll(async () => {
  await prisma.pi.deleteMany({ where: { customerId: externalCustId } });
  await prisma.quote.deleteMany({ where: { customerId: externalCustId } });
  await prisma.opportunity.deleteMany({ where: { id: wonOppId } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.product.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D2 单元：外销 PI 生成骨架', () => {
  it('外销 EXTERNAL 域 + ACCEPTED 报价 => 生成 PI 成功，复用金额', async () => {
    const pi = await piService.createPi({ customerId: externalCustId, quoteRef: acceptedQuoteId }, ctx('EXTERNAL'));
    expect(pi.salesType).toBe('EXTERNAL');
    expect(pi.status).toBe('DRAFT');
    expect(pi.quoteRef).toBe(acceptedQuoteId);
    expect(pi.amount).toBeGreaterThan(0);
  });

  it('报价未接受 => 409 明确错误', async () => {
    let err: unknown;
    try {
      await piService.createPi({ customerId: externalCustId, quoteRef: draftQuoteId }, ctx('EXTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });

  it('缺少 quoteRef => 400 明确错误', async () => {
    let err: unknown;
    try {
      await piService.createPi({ customerId: externalCustId }, ctx('EXTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
  });
});

describe('D2 单元：外销 PI 服务端域强制（内销禁生成）', () => {
  it('内销销售域生成 PI => 403 明确错误', async () => {
    let err: unknown;
    try {
      await piService.createPi({ customerId: externalCustId, quoteRef: acceptedQuoteId }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });

  it('内销客户不能生成 PI => 400', async () => {
    let err: unknown;
    try {
      await piService.createPi({ customerId: internalCustId, quoteRef: acceptedQuoteId }, ctx('EXTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
  });
});

describe('D2 单元：PI 确认（DRAFT → CONFIRMED）', () => {
  it('确认后状态为 CONFIRMED', async () => {
    const pi = await piService.createPi({ customerId: externalCustId, quoteRef: acceptedQuoteId }, ctx('EXTERNAL'));
    const confirmed = await piService.confirmPi(pi.id, ctx('EXTERNAL'));
    expect(confirmed.status).toBe('CONFIRMED');
  });
});
