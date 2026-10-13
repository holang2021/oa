// ============================================================
// Opportunity Service —— 批次1-A D3 (商机从0激活)
// 完整业务：建/查/列/改/删 + 漏斗/预测 + 公海 claim/return 透传。
// 服务端销售域强制（salesType 透传 + 域强制 + audit_log，门禁规则6）。
// ============================================================
import { OpportunityStage } from '../constants/enums';
import * as oppRepo from '../repositories/opportunity.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import * as pool from './public-pool.service';
import type { ServiceContext } from './types';

const STAGE_WIN_PROBABILITY: Record<string, number> = {
  [OpportunityStage.INITIAL_CONTACT]: 10,
  [OpportunityStage.REQUIREMENT_CONFIRMED]: 25,
  [OpportunityStage.QUOTING]: 50,
  [OpportunityStage.CONTRACT_NEGOTIATION]: 75,
  [OpportunityStage.WON]: 100,
};

export function stageToWinProbability(stage: string): number {
  return STAGE_WIN_PROBABILITY[stage] ?? 0;
}

export interface CreateOpportunityInput {
  name?: string;
  customerId?: string;
  productId?: string | null;
  expectedAmount?: number;
  winProbability?: number;
  expectedCloseDate?: string | null;
  stage?: string;
  description?: string | null;
  competitorInfo?: string | null;
  customerContactId?: string | null;
}

/** 新建商机（D3 核心）：透传 salesType + 服务端域强制 + audit_log */
export async function createOpportunity(input: CreateOpportunityInput, ctx: ServiceContext) {
  const custRepo = await import('../repositories/customer.repository');
  const cust = await custRepo.findCustomerById(input.customerId);
  if (!cust) throw new AppError('客户不存在', 404);

  // 服务端销售域强制：商机域必须匹配调用者域（全域放行）
  if (ctx.scope !== 'ALL' && (cust.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权在该销售域下创建商机', 403);
  }

  const stage = input.stage ?? 'INITIAL_CONTACT';
  const winProbability = input.winProbability ?? stageToWinProbability(stage);

  const opportunity = await oppRepo.createOpportunity({
    name: input.name,
    customerId: input.customerId,
    productId: input.productId ?? null,
    expectedAmount: input.expectedAmount,
    expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
    stage,
    description: input.description ?? null,
    competitorInfo: input.competitorInfo ?? null,
    winProbability,
    salesType: cust.salesType ?? 'INTERNAL',
    salesOwnerId: ctx.userId,
    customerContactId: input.customerContactId ?? null,
  });

  // 客户状态推进（POTENTIAL → INTERESTED），与既有逻辑一致
  if (cust.status === 'POTENTIAL') {
    const { updateCustomerStatusIfNeeded } = await import('./customer-status.helper');
    await updateCustomerStatusIfNeeded(input.customerId, 'INTERESTED');
  }

  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'opportunities',
    entityId: opportunity.id,
    salesType: opportunity.salesType,
    result: 'SUCCESS',
    detail: { op: 'create', stage, salesType: opportunity.salesType },
    traceId: ctx.traceId ?? null,
  });

  return opportunity;
}

/** 商机列表（服务端域过滤） */
export async function listOpportunities(filter: oppRepo.OpportunityFilter, ctx: ServiceContext) {
  const salesType = ctx.scope === 'ALL' ? filter.salesType : ctx.scope;
  return oppRepo.findOpportunities({ ...filter, salesType });
}

/** 商机详情（域强制） */
export async function getOpportunity(id: string, ctx: ServiceContext) {
  const opp = await oppRepo.findOpportunityById(id);
  if (!opp) throw new AppError('商机不存在', 404);
  if (ctx.scope !== 'ALL' && (opp.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权查看该商机', 403);
  }
  return opp;
}

export async function updateOpportunity(
  id: string,
  data: {
    name?: string;
    customerId?: string;
    productId?: string | null;
    expectedAmount?: number;
    winProbability?: number;
    expectedCloseDate?: string | null;
    stage?: string;
    description?: string | null;
    competitorInfo?: string | null;
    customerContactId?: string | null;
  },
  ctx: ServiceContext
) {
  const existing = await oppRepo.findOpportunityById(id);
  if (!existing) throw new AppError('商机不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权修改该商机', 403);
  }
  const winProbability = data.winProbability ?? (data.stage ? stageToWinProbability(data.stage) : existing.winProbability);
  const updated = await oppRepo.updateOpportunity(id, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.customerId !== undefined && { customerId: data.customerId }),
    ...(data.productId !== undefined && { productId: data.productId }),
    ...(data.expectedAmount !== undefined && { expectedAmount: data.expectedAmount }),
    ...(data.expectedCloseDate !== undefined && {
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
    }),
    ...(data.stage !== undefined && { stage: data.stage }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.competitorInfo !== undefined && { competitorInfo: data.competitorInfo }),
    ...(data.customerContactId !== undefined && { customerContactId: data.customerContactId }),
    winProbability,
  });

  // 赢单推进客户状态
  if (data.stage === OpportunityStage.WON) {
    const { updateCustomerStatusIfNeeded } = await import('./customer-status.helper');
    await updateCustomerStatusIfNeeded(updated.customerId, 'WON');
  }

  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'opportunities',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'update', stage: data.stage },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

export async function deleteOpportunity(id: string, ctx: ServiceContext) {
  const existing = await oppRepo.findOpportunityById(id);
  if (!existing) throw new AppError('商机不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权删除该商机', 403);
  }
  await oppRepo.removeOpportunity(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'opportunities',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'delete' },
    traceId: ctx.traceId ?? null,
  });
  return { id };
}

/** 漏斗数据 */
export async function getFunnel(ctx: ServiceContext, salesOwnerId?: string) {
  const where: Record<string, unknown> = {};
  if (ctx.scope !== 'ALL') where.salesType = ctx.scope;
  if (salesOwnerId) where.salesOwnerId = salesOwnerId;
  const grouped = await oppRepo.groupByStage(where);
  return Object.values(OpportunityStage).map((stage) => {
    const row = grouped.find((g) => g.stage === stage);
    return { stage, count: row?._count.stage ?? 0, amount: row?._sum.expectedAmount ?? 0 };
  });
}

/** 预测数据 */
export async function getForecast(ctx: ServiceContext, salesOwnerId?: string) {
  const salesType = ctx.scope === 'ALL' ? undefined : ctx.scope;
  const { list: opps } = await oppRepo.findOpportunities({
    salesType,
    salesOwnerId,
    take: 1000,
  });
  const open = opps.filter((o) => o.stage !== OpportunityStage.WON);
  const byStage = Object.values(OpportunityStage)
    .filter((s) => s !== OpportunityStage.WON)
    .map((stage) => {
      const items = open.filter((o) => o.stage === stage);
      const totalAmount = items.reduce((sum, o) => sum + (o.expectedAmount ?? 0), 0);
      const weighted = items.reduce((sum, o) => sum + (o.expectedAmount ?? 0) * ((o.winProbability ?? 0) / 100), 0);
      return { stage, count: items.length, totalAmount, weightedAmount: weighted, winProbability: STAGE_WIN_PROBABILITY[stage] };
    });
  const totalForecast = {
    count: open.length,
    totalAmount: byStage.reduce((s, x) => s + x.totalAmount, 0),
    weightedAmount: byStage.reduce((s, x) => s + x.weightedAmount, 0),
  };
  return { forecastByStage: byStage, totalForecast, opportunities: open.slice(0, 50) };
}

// ── 公海透传（D2）──
export const claimOpportunityPool = (id: string, ctx: ServiceContext) => pool.claimOpportunity(id, ctx);
export const returnOpportunityPool = (id: string, ctx: ServiceContext) => pool.returnOpportunity(id, ctx);
export const listPool = (ctx: ServiceContext, filter: { search?: string; skip?: number; take?: number }) =>
  pool.listPoolOpportunities(ctx, filter);
