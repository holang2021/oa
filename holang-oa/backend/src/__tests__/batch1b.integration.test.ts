import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as contractService from '../services/contract.service';
import * as piService from '../services/pi.service';
import * as quoteService from '../services/quote.service';
import * as oppRepo from '../repositories/opportunity.repository';
import * as productRepo from '../repositories/product.repository';
import * as orderController from '../controllers/order.controller';
import * as paymentController from '../controllers/payment.controller';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from '../services/types';
import { OpportunityStage } from '../constants/enums';
import type { AuthRequest } from '../middleware/auth';

const MARK = '批次1B_INTEG';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId: string, role: string): ServiceContext {
  return { userId, scope, role, traceId: 'ut-trace' };
}

function mockRes() {
  const res: any = { statusCode: 200, _json: undefined as any };
  res.json = (body: any) => {
    res._json = body;
    return res;
  };
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.setHeader = () => {};
  res.send = () => res;
  return res;
}

async function callCtrl(
  fn: (req: AuthRequest, res: any, next: (e?: any) => void) => Promise<void>,
  req: any
) {
  const res = mockRes();
  const errors: any[] = [];
  const next = (e: any) => errors.push(e);
  await fn(req as AuthRequest, res, next);
  return { res, errors };
}

function mockReq(opts: { userId: string; salesType: 'INTERNAL' | 'EXTERNAL' | 'ALL'; role: string; body?: any; params?: any }) {
  return {
    user: { id: opts.userId, name: 'UT', role: opts.role, salesType: opts.salesType },
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: {},
    traceId: 'ut-trace',
  } as any;
}

let userId = 'ut-user-integ';
let internalCustId = '';
let externalCustId = '';
let productId = '';

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'UT Integ', role: 'INTERNAL_SALES' },
  });
  const a = await prisma.customer.create({ data: { companyName: `${MARK}_内销客户`, salesType: 'INTERNAL' } });
  const b = await prisma.customer.create({ data: { companyName: `${MARK}_外销客户`, salesType: 'EXTERNAL' } });
  const p = await prisma.product.create({ data: { name: `${MARK}_设备`, unitPrice: 1500 } });
  internalCustId = a.id;
  externalCustId = b.id;
  productId = p.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { customerId: { in: [internalCustId, externalCustId] } } });
  await prisma.order.deleteMany({ where: { customerId: { in: [internalCustId, externalCustId] } } });
  await prisma.contract.deleteMany({ where: { customerId: internalCustId } });
  await prisma.pi.deleteMany({ where: { customerId: externalCustId } });
  await prisma.quote.deleteMany({ where: { customerId: { in: [internalCustId, externalCustId] } } });
  await prisma.opportunity.deleteMany({ where: { customerId: { in: [internalCustId, externalCustId] } } });
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.product.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.$disconnect();
});

/** 走完「商机WIN→报价→接受→合同/PI→确认」前置，返回已确认的内销合同或外销 PI */
async function buildConfirmedInternalContract() {
  const opp = await oppRepo.createOpportunity({
    name: `${MARK}_内销商机`,
    customerId: internalCustId,
    expectedAmount: 1500,
    stage: OpportunityStage.WON,
    winProbability: 100,
    salesType: 'INTERNAL',
    salesOwnerId: userId,
  });
  const q = await quoteService.createQuote(
    { customerId: internalCustId, items: [{ productId, quantity: 1 }], opportunityId: opp.id },
    ctx('INTERNAL', userId, 'INTERNAL_SALES')
  );
  const accepted = await quoteService.acceptQuote(q.id, ctx('INTERNAL', userId, 'INTERNAL_SALES'));
  const contract = await contractService.createContract(
    { customerId: internalCustId, quoteRef: accepted.id, amount: 1500 },
    ctx('INTERNAL', userId, 'INTERNAL_SALES')
  );
  return contractService.confirmContract(contract.id, ctx('INTERNAL', userId, 'INTERNAL_SALES'));
}

async function buildConfirmedExternalPi() {
  const opp = await oppRepo.createOpportunity({
    name: `${MARK}_外销商机`,
    customerId: externalCustId,
    expectedAmount: 3000,
    stage: OpportunityStage.WON,
    winProbability: 100,
    salesType: 'EXTERNAL',
    salesOwnerId: userId,
  });
  const q = await quoteService.createQuote(
    { customerId: externalCustId, items: [{ productId, quantity: 2 }], opportunityId: opp.id },
    ctx('EXTERNAL', userId, 'EXTERNAL_SALES')
  );
  const accepted = await quoteService.acceptQuote(q.id, ctx('EXTERNAL', userId, 'EXTERNAL_SALES'));
  const pi = await piService.createPi(
    { customerId: externalCustId, quoteRef: accepted.id, amount: 3000 },
    ctx('EXTERNAL', userId, 'EXTERNAL_SALES')
  );
  return piService.confirmPi(pi.id, ctx('EXTERNAL', userId, 'EXTERNAL_SALES'));
}

describe('D1/D2/D3 集成：内销 MVP 主闭环（商机→报价→合同→订单→回款）', () => {
  it('全链路接实：合同 CONFIRMED → 建订单 → 登记回款 成功', async () => {
    const contract = await buildConfirmedInternalContract();

    const { res: orderRes, errors: orderErr } = await callCtrl(orderController.createOrder, mockReq({
      userId, salesType: 'INTERNAL', role: 'INTERNAL_SALES',
      body: { customerId: internalCustId, contractId: contract.id, amount: 1500 },
    }));
    expect(orderErr).toHaveLength(0);
    expect(orderRes._json.code).toBe(0);
    const order = orderRes._json.data;
    expect(order.contractId).toBe(contract.id);
    expect(order.status).toBe('CONFIRMED');

    const { res: payRes, errors: payErr } = await callCtrl(paymentController.createPayment, mockReq({
      userId, salesType: 'INTERNAL', role: 'INTERNAL_SALES',
      body: { customerId: internalCustId, orderId: order.id, amount: 800 },
    }));
    expect(payErr).toHaveLength(0);
    expect(payRes._json.code).toBe(0);
    expect(payRes._json.data.orderId).toBe(order.id);
  });

  it('内销订单缺少 contractId => 400（闭环强制）', async () => {
    const { errors } = await callCtrl(orderController.createOrder, mockReq({
      userId, salesType: 'INTERNAL', role: 'INTERNAL_SALES',
      body: { customerId: internalCustId, amount: 1500 },
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toBeInstanceOf(AppError);
    expect((errors[0] as AppError).statusCode).toBe(400);
  });

  it('回款关联未确认(DRAFT)订单 => 409（闭环强制）', async () => {
    const contract = await buildConfirmedInternalContract();
    const { res: orderRes } = await callCtrl(orderController.createOrder, mockReq({
      userId, salesType: 'INTERNAL', role: 'INTERNAL_SALES',
      body: { customerId: internalCustId, contractId: contract.id, amount: 1500, status: 'DRAFT' },
    }));
    const draftOrder = orderRes._json.data;

    const { errors } = await callCtrl(paymentController.createPayment, mockReq({
      userId, salesType: 'INTERNAL', role: 'INTERNAL_SALES',
      body: { customerId: internalCustId, orderId: draftOrder.id, amount: 500 },
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toBeInstanceOf(AppError);
    expect((errors[0] as AppError).statusCode).toBe(409);
  });
});

describe('D1/D2/D3 集成：外销 MVP 主闭环（商机→报价→PI→订单→回款）', () => {
  it('全链路接实：PI CONFIRMED → 建订单 → 登记回款 成功', async () => {
    const pi = await buildConfirmedExternalPi();

    const { res: orderRes, errors: orderErr } = await callCtrl(orderController.createOrder, mockReq({
      userId, salesType: 'EXTERNAL', role: 'EXTERNAL_SALES',
      body: { customerId: externalCustId, piId: pi.id, amount: 3000 },
    }));
    expect(orderErr).toHaveLength(0);
    expect(orderRes._json.code).toBe(0);
    const order = orderRes._json.data;
    expect(order.piId).toBe(pi.id);

    const { res: payRes, errors: payErr } = await callCtrl(paymentController.createPayment, mockReq({
      userId, salesType: 'EXTERNAL', role: 'EXTERNAL_SALES',
      body: { customerId: externalCustId, orderId: order.id, amount: 1500 },
    }));
    expect(payErr).toHaveLength(0);
    expect(payRes._json.code).toBe(0);
  });

  it('外销订单缺少 piId => 400（闭环强制）', async () => {
    const { errors } = await callCtrl(orderController.createOrder, mockReq({
      userId, salesType: 'EXTERNAL', role: 'EXTERNAL_SALES',
      body: { customerId: externalCustId, amount: 3000 },
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toBeInstanceOf(AppError);
    expect((errors[0] as AppError).statusCode).toBe(400);
  });
});
