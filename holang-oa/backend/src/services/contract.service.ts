// ============================================================
// Contract Service —— 批次1-B D1/D3 (内销商务合同 · 分层)
// 闭环校验：报价 ACCEPTED 才可建合同；合同 CONFIRMED 才可建订单（见 deal-flow.service）。
// 透传 salesType + 服务端域强制（复用 salesType.ts）+ audit_log（门禁规则6）。
// 外销分支不在此建合同（走 Pi，见 pi.service），内销销售域之外调用将被服务端拦截。
// ============================================================
import * as contractRepo from '../repositories/contract.repository';
import * as quoteRepo from '../repositories/quote.repository';
import * as custRepo from '../repositories/customer.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from './types';
import { QuoteStatus } from '../constants/enums';

export interface CreateContractInput {
  contractNumber?: string;
  customerId: string;
  quoteRef?: string | null;
  opportunityRef?: string | null;
  piRef?: string | null;
  amount?: number;
  signedAt?: string | null;
  expiresAt?: string | null;
  status?: string;
  filePath?: string | null;
  notes?: string | null;
}

/** 新建内销商务合同（D1 核心）：报价 ACCEPTED 才可建，服务端域强制 + audit_log */
export async function createContract(input: CreateContractInput, ctx: ServiceContext) {
  const cust = await custRepo.findCustomerById(input.customerId);
  if (!cust) throw new AppError('客户不存在', 404);

  // 内销商务合同：仅 INTERNAL 域可建；外销域越权拦截（D3 外销走 PI）
  if (ctx.scope !== 'ALL' && ctx.scope !== 'INTERNAL') {
    throw new AppError('外销销售域不可创建内销商务合同（外销请使用 PI）', 403);
  }
  if ((cust.salesType ?? '').toUpperCase() !== 'INTERNAL') {
    throw new AppError('该客户非内销客户，不能创建内销商务合同', 400);
  }
  if (ctx.scope !== 'ALL' && (cust.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权在该销售域下创建合同', 403);
  }

  // 闭环校验：报价 ACCEPTED 才可建合同（D1 状态机）
  if (!input.quoteRef) {
    throw new AppError('创建合同必须关联一份已接受的报价单(quoteRef)', 400);
  }
  const quote = await quoteRepo.findQuoteById(input.quoteRef);
  if (!quote) throw new AppError('关联的报价单不存在', 404);
  if (quote.status !== QuoteStatus.ACCEPTED) {
    throw new AppError(`报价单尚未接受(当前状态:${quote.status})，只有 ACCEPTED 报价才可建合同`, 409);
  }
  if ((quote.salesType ?? '').toUpperCase() !== 'INTERNAL') {
    throw new AppError('关联的报价单非内销报价，不能创建内销商务合同', 400);
  }

  const contractNumber = input.contractNumber ?? (await contractRepo.nextContractNumber());
  const existing = await contractRepo.findContractByNumber(contractNumber);
  if (existing) throw new AppError('合同编号已存在', 409);

  const contract = await contractRepo.createContract({
    contractNumber,
    customerId: input.customerId,
    salesType: 'INTERNAL',
    amount: input.amount ?? quote.totalAmount,
    quoteRef: input.quoteRef,
    opportunityRef: input.opportunityRef ?? null,
    piRef: input.piRef ?? null,
    contractType: 'COMMERCIAL',
    signedAt: input.signedAt ? new Date(input.signedAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    status: input.status ?? 'DRAFT',
    filePath: input.filePath ?? null,
    notes: input.notes ?? null,
    createdById: ctx.userId,
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'contracts',
    entityId: contract.id,
    salesType: 'INTERNAL',
    result: 'SUCCESS',
    detail: { op: 'create', contractNumber, quoteRef: input.quoteRef, status: contract.status },
    traceId: ctx.traceId ?? null,
  });
  return contract;
}

/** 确认合同（签署）DRAFT → CONFIRMED（闭环：CONFIRMED 后才可建订单） */
export async function confirmContract(id: string, ctx: ServiceContext) {
  const existing = await contractRepo.findContractById(id);
  if (!existing) throw new AppError('合同不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权操作该合同', 403);
  }
  if (existing.status === 'CONFIRMED') {
    return existing; // 幂等
  }
  const updated = await contractRepo.confirmContract(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'contracts',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'confirm' },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 合同列表（服务端域过滤：非全域仅 INTERNAL） */
export async function listContracts(filter: contractRepo.ContractFilter, ctx: ServiceContext) {
  const salesType = ctx.scope === 'ALL' ? 'INTERNAL' : ctx.scope === 'INTERNAL' ? 'INTERNAL' : undefined;
  return contractRepo.findContracts({ ...filter, salesType });
}

/** 合同详情（域强制） */
export async function getContract(id: string, ctx: ServiceContext) {
  const c = await contractRepo.findContractById(id);
  if (!c) throw new AppError('合同不存在', 404);
  if (ctx.scope !== 'ALL' && (c.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权查看该合同', 403);
  }
  return c;
}

/** 更新可编辑字段（域强制） */
export async function updateContract(
  id: string,
  data: {
    amount?: number;
    signedAt?: string | null;
    expiresAt?: string | null;
    status?: string;
    filePath?: string | null;
    notes?: string | null;
  },
  ctx: ServiceContext
) {
  const existing = await contractRepo.findContractById(id);
  if (!existing) throw new AppError('合同不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权修改该合同', 403);
  }
  const updated = await contractRepo.updateContractFields(id, {
    amount: data.amount,
    signedAt: data.signedAt ? new Date(data.signedAt) : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    status: data.status,
    filePath: data.filePath,
    notes: data.notes,
  });
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'contracts',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'update' },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 删除（域强制） */
export async function deleteContract(id: string, ctx: ServiceContext) {
  const existing = await contractRepo.findContractById(id);
  if (!existing) throw new AppError('合同不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权删除该合同', 403);
  }
  await contractRepo.removeContract(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'contracts',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'delete' },
    traceId: ctx.traceId ?? null,
  });
  return { id };
}
