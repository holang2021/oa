import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as contractService from '../services/contract.service';
import * as quoteRepo from '../repositories/quote.repository';
import * as quoteService from '../services/quote.service';
import * as oppRepo from '../repositories/opportunity.repository';
import * as custRepo from '../repositories/customer.repository';
import * as productRepo from '../repositories/product.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';
import { OpportunityStage } from '../constants/enums';

const MARK = '批次1B_CONTRACT_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-contract'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : 'INTERNAL_SALES', traceId: 'ut-trace' };
}

let internalCustId = '';
let externalCustId = '';
let productId = '';
let wonOppId = '';
let acceptedQuoteId = '';
let draftQuoteId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 'ut-user-contract' },
    update: {},
    create: { id: 'ut-user-contract', name: 'UT Contract User', role: 'INTERNAL_SALES' },
  });
  const a = await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL' } });
  const b = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户`, salesType: 'EXTERNAL' } });
  const p = await prisma.product.create({ data: { name: `${MARK}_设备`, unitPrice: 1000 } });
  internalCustId = a.id;
  externalCustId = b.id;
  productId = p.id;

  // 商机 WIN（闭环：商机 WIN 才可建报价）
  const opp = await oppRepo.createOpportunity({
    name: `${MARK}_商机`,
    customerId: internalCustId,
    expectedAmount: 1000,
    stage: OpportunityStage.WON,
    winProbability: 100,
    salesType: 'INTERNAL',
    salesOwnerId: 'ut-user-contract',
  });
  wonOppId = opp.id;

  // 关联商机的报价（DRAFT）→ 接受为 ACCEPTED
  const q1 = await quoteService.createQuote(
    { customerId: internalCustId, items: [{ productId, quantity: 1 }], opportunityId: wonOppId },
    ctx('INTERNAL')
  );
  const accepted = await quoteService.acceptQuote(q1.id, ctx('INTERNAL'));
  acceptedQuoteId = accepted.id;

  // 另一份未接受报价（负向用例）
  const q2 = await quoteService.createQuote(
    { customerId: internalCustId, items: [{ productId, quantity: 1 }] },
    ctx('INTERNAL')
  );
  draftQuoteId = q2.id;
});

afterAll(async () => {
  await prisma.contract.deleteMany({ where: { customerId: internalCustId } });
  await prisma.quote.deleteMany({ where: { customerId: internalCustId } });
  await prisma.opportunity.deleteMany({ where: { id: wonOppId } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.product.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D1 单元：内销商务合同创建闭环校验', () => {
  it('报价 ACCEPTED 才可建合同 => 成功，salesType=INTERNAL', async () => {
    const c = await contractService.createContract({ customerId: internalCustId, quoteRef: acceptedQuoteId, amount: 1000 }, ctx('INTERNAL'));
    expect(c.salesType).toBe('INTERNAL');
    expect(c.status).toBe('DRAFT');
    expect(c.quoteRef).toBe(acceptedQuoteId);
  });

  it('报价未接受(ACCEPTED) => 409 明确错误', async () => {
    let err: unknown;
    try {
      await contractService.createContract({ customerId: internalCustId, quoteRef: draftQuoteId }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(409);
  });

  it('缺少 quoteRef => 400 明确错误', async () => {
    let err: unknown;
    try {
      await contractService.createContract({ customerId: internalCustId }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
  });

  it('外销客户不能建内销商务合同 => 400', async () => {
    let err: unknown;
    try {
      await contractService.createContract({ customerId: externalCustId, quoteRef: acceptedQuoteId }, ctx('INTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
  });
});

describe('D1 单元：内销合同服务端域强制', () => {
  it('外销销售域创建内销合同 => 403', async () => {
    let err: unknown;
    try {
      await contractService.createContract({ customerId: internalCustId, quoteRef: acceptedQuoteId }, ctx('EXTERNAL'));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });
});

describe('D1 单元：合同确认（DRAFT → CONFIRMED）', () => {
  it('确认后状态为 CONFIRMED', async () => {
    const created = await contractService.createContract({ customerId: internalCustId, quoteRef: acceptedQuoteId }, ctx('INTERNAL'));
    const confirmed = await contractService.confirmContract(created.id, ctx('INTERNAL'));
    expect(confirmed.status).toBe('CONFIRMED');
  });
});
