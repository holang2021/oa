// ============================================================
// Public Pool Service —— 批次1-A D2 (客户·商机公海)
// claim/return + 服务端销售域强制隔离（复用 salesType 中间件推导的 scope）。
// 内销员工只认领 INTERNAL 公海、外销只 EXTERNAL；越权服务端拦截（门禁规则6）。
// ============================================================
import * as customerRepo from '../repositories/customer.repository';
import * as opportunityRepo from '../repositories/opportunity.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from './types';

/** 服务端销售域强制：实体域必须匹配调用者域（全域角色放行） */
function assertDomain(entitySalesType: string | null, ctx: ServiceContext, entityLabel: string) {
  if (ctx.scope === 'ALL') return;
  if (!entitySalesType || entitySalesType.toUpperCase() !== ctx.scope) {
    throw new AppError(`无权操作${entityLabel}：域隔离拦截（仅可操作 ${ctx.scope} 公海）`, 403);
  }
}

interface PoolEntity {
  id: string;
  salesType: string | null;
  inPublicPool: boolean;
  ownerId: string | null;
}

/**
 * 认领客户出公海。
 * - 服务端域强制：非全域角色只能认领其域公海。
 * - 必须处于公海状态。
 */
export async function claimCustomer(id: string, ctx: ServiceContext) {
  const entity = (await customerRepo.findCustomerById(id)) as PoolEntity | null;
  if (!entity) throw new AppError('客户不存在', 404);
  assertDomain(entity.salesType, ctx, '客户');
  if (!entity.inPublicPool && entity.ownerId) throw new AppError('该客户不在公海中', 409);
  if (entity.ownerId && entity.ownerId !== ctx.userId && ctx.scope !== 'ALL') {
    throw new AppError('该客户已被其他销售认领', 409);
  }

  const updated = await customerRepo.claimCustomer(id, ctx.userId);
  await createAuditLog({
    userId: ctx.userId,
    action: 'POOL_OP',
    entity: 'customers',
    entityId: id,
    salesType: entity.salesType,
    result: 'SUCCESS',
    detail: { op: 'claim', scope: ctx.scope },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 退回客户到公海 */
export async function returnCustomer(id: string, ctx: ServiceContext) {
  const entity = (await customerRepo.findCustomerById(id)) as PoolEntity | null;
  if (!entity) throw new AppError('客户不存在', 404);
  assertDomain(entity.salesType, ctx, '客户');
  if (entity.inPublicPool) throw new AppError('该客户已在公海中', 409);
  if (entity.ownerId && entity.ownerId !== ctx.userId && ctx.scope !== 'ALL') {
    throw new AppError('仅认领人本人可退回公海', 403);
  }

  const updated = await customerRepo.returnCustomerToPool(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'POOL_OP',
    entity: 'customers',
    entityId: id,
    salesType: entity.salesType,
    result: 'SUCCESS',
    detail: { op: 'return', scope: ctx.scope },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 认领商机出公海 */
export async function claimOpportunity(id: string, ctx: ServiceContext) {
  const entity = (await opportunityRepo.findOpportunityById(id)) as PoolEntity | null;
  if (!entity) throw new AppError('商机不存在', 404);
  assertDomain(entity.salesType, ctx, '商机');
  if (!entity.inPublicPool) throw new AppError('该商机不在公海中', 409);
  if (entity.ownerId && entity.ownerId !== ctx.userId && ctx.scope !== 'ALL') {
    throw new AppError('该商机已被其他销售认领', 409);
  }

  const updated = await opportunityRepo.claimOpportunity(id, ctx.userId);
  await createAuditLog({
    userId: ctx.userId,
    action: 'POOL_OP',
    entity: 'opportunities',
    entityId: id,
    salesType: entity.salesType,
    result: 'SUCCESS',
    detail: { op: 'claim', scope: ctx.scope },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 退回商机到公海 */
export async function returnOpportunity(id: string, ctx: ServiceContext) {
  const entity = (await opportunityRepo.findOpportunityById(id)) as PoolEntity | null;
  if (!entity) throw new AppError('商机不存在', 404);
  assertDomain(entity.salesType, ctx, '商机');
  if (entity.inPublicPool) throw new AppError('该商机已在公海中', 409);
  if (entity.ownerId && entity.ownerId !== ctx.userId && ctx.scope !== 'ALL') {
    throw new AppError('仅认领人本人可退回公海', 403);
  }

  const updated = await opportunityRepo.returnOpportunityToPool(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'POOL_OP',
    entity: 'opportunities',
    entityId: id,
    salesType: entity.salesType,
    result: 'SUCCESS',
    detail: { op: 'return', scope: ctx.scope },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 列出公海客户（服务端域强制：非全域只列其域） */
export async function listPoolCustomers(ctx: ServiceContext, filter: { search?: string; skip?: number; take?: number }) {
  const salesType = ctx.scope === 'ALL' ? undefined : ctx.scope;
  return customerRepo.findCustomers({
    includeUnassignedAsPool: true,
    salesType,
    search: filter.search,
    skip: filter.skip,
    take: filter.take,
  });
}

/** 列出公海商机（服务端域强制：非全域只列其域） */
export async function listPoolOpportunities(ctx: ServiceContext, filter: { search?: string; skip?: number; take?: number }) {
  const salesType = ctx.scope === 'ALL' ? undefined : ctx.scope;
  return opportunityRepo.findOpportunities({
    inPublicPool: true,
    salesType,
    search: filter.search,
    skip: filter.skip,
    take: filter.take,
  });
}
