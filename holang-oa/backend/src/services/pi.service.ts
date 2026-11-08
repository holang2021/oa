// ============================================================
// Pi Service —— 批次1-B D2 (外销 PI 生成骨架 · 分层)
// 仅生成 PI 记录 + 数据落库（复用 Quote 金额/明细），不做强校验模板引擎（归 1-C）。
// 报价单为选填，关联时须 ACCEPTED；合同/PI 确认后才可建订单（见 deal-flow.service）。
// 服务端域强制：仅 EXTERNAL 可生成 PI；内销调用返回 403（D3 内销走 Contract）。
// ============================================================
import * as piRepo from '../repositories/pi.repository';
import * as quoteRepo from '../repositories/quote.repository';
import * as custRepo from '../repositories/customer.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from './types';
import { QuoteStatus } from '../constants/enums';

export interface CreatePiInput {
  piNo?: string;
  customerId?: string;
  quoteRef?: string | null;
  amount?: number;
  currency?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  customerContactId?: string | null;
  // 商品明细（Commercial Items）：销售在 PI 表单直接录入，随单据落库、可编辑、供打印（刘总 2026-11-08）
  items?: piRepo.PiItem[];
}

export interface UpdatePiPatch {
  status?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  items?: piRepo.PiItem[];
}

/** 生成外销 PI 记录（D2 核心）：仅 EXTERNAL 域；报价单选填，关联时复用其金额/明细 */
export async function createPi(input: CreatePiInput, ctx: ServiceContext) {
  // 服务端域强制：仅外销可生成 PI（D3 内销走商务合同）
  if (ctx.scope !== 'ALL' && ctx.scope !== 'EXTERNAL') {
    throw new AppError('仅外销销售域可生成 PI，内销请使用商务合同(Contract)', 403);
  }

  const cust = await custRepo.findCustomerById(input.customerId);
  if (!cust) throw new AppError('客户不存在', 404);
  if ((cust.salesType ?? '').toUpperCase() !== 'EXTERNAL') {
    throw new AppError('该客户非外销客户，不能生成 PI', 400);
  }
  if (ctx.scope !== 'ALL' && (cust.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权在该销售域下生成 PI', 403);
  }

  // 报价单改为选填（刘总 2026-11-08）：有些报价单暂时未在系统内完成，允许先建 PI、后续再补关联。
  // 仅当关联了报价单时，才校验「存在 / ACCEPTED / 外销」；未关联时金额取前端传入值。
  const quote = input.quoteRef ? await quoteRepo.findQuoteById(input.quoteRef) : null;
  if (input.quoteRef && !quote) throw new AppError('关联的报价单不存在', 404);
  if (quote && quote.status !== QuoteStatus.ACCEPTED) {
    throw new AppError(`报价单尚未接受(当前状态:${quote.status})，只有 ACCEPTED 报价才可生成 PI`, 409);
  }
  if (quote && (quote.salesType ?? '').toUpperCase() !== 'EXTERNAL') {
    throw new AppError('关联的报价单非外销报价，不能生成 PI', 400);
  }

  const piNo = input.piNo ?? (await piRepo.nextPiNumber());
  const existing = await piRepo.findPiByNo(piNo);
  if (existing) throw new AppError('PI 编号已存在', 409);

  const pi = await piRepo.createPi({
    piNo,
    customerId: input.customerId,
    salesType: 'EXTERNAL',
    quoteRef: input.quoteRef,
    amount: input.amount ?? quote?.totalAmount ?? 0,
    currency: input.currency ?? 'USD',
    issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    notes: input.notes ?? null,
    customerContactId: input.customerContactId ?? null,
    createdById: ctx.userId,
  });

  const items = input.items ?? [];
  if (items.length) await piRepo.savePiItems(pi.id, items);

  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'pis',
    entityId: pi.id,
    salesType: 'EXTERNAL',
    result: 'SUCCESS',
    detail: { op: 'create', piNo, quoteRef: input.quoteRef, status: pi.status, itemCount: items.length },
    traceId: ctx.traceId ?? null,
  });
  return { ...pi, items };
}

/** 确认 PI（DRAFT → CONFIRMED，闭环：CONFIRMED 后才可建订单） */
export async function confirmPi(id: string, ctx: ServiceContext) {
  const existing = await piRepo.findPiById(id);
  if (!existing) throw new AppError('PI 不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权操作该 PI', 403);
  }
  if (existing.status === 'CONFIRMED') return existing; // 幂等
  const updated = await piRepo.confirmPi(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'pis',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'confirm' },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** PI 列表（服务端域过滤：非全域仅 EXTERNAL） */
export async function listPis(filter: piRepo.PiFilter, ctx: ServiceContext) {
  const salesType = ctx.scope === 'ALL' ? 'EXTERNAL' : ctx.scope === 'EXTERNAL' ? 'EXTERNAL' : undefined;
  return piRepo.findPis({ ...filter, salesType });
}

/** PI 详情（域强制，带商品明细） */
export async function getPi(id: string, ctx: ServiceContext) {
  const p = await piRepo.findPiById(id);
  if (!p) throw new AppError('PI 不存在', 404);
  if (ctx.scope !== 'ALL' && (p.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权查看该 PI', 403);
  }
  return { ...p, items: await piRepo.readPiItems(id) };
}

/**
 * 更新 PI（域强制）。明细与金额属「最终交易事实」：确认前可改、CONFIRMED 后冻结
 * （LOCKED 总纲第6条）。明细存 items_json，编辑页保存后重开不丢，避免销售回 Excel 重做。
 */
export async function updatePi(id: string, patch: UpdatePiPatch, ctx: ServiceContext) {
  const existing = await piRepo.findPiById(id);
  if (!existing) throw new AppError('PI 不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权操作该 PI', 403);
  }
  const touchingFacts = patch.items !== undefined || patch.amount !== undefined || patch.currency !== undefined;
  if (existing.status === 'CONFIRMED' && touchingFacts) {
    throw new AppError('PI 已确认，最终交易事实已冻结，不能再修改商品明细与金额', 409);
  }
  const updated = await piRepo.updatePiContent(id, {
    status: patch.status,
    amount: patch.amount,
    currency: patch.currency,
    notes: patch.notes,
  });
  let items = await piRepo.readPiItems(id);
  if (patch.items !== undefined) {
    await piRepo.savePiItems(id, patch.items);
    items = patch.items;
  }
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'pis',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'update', status: patch.status, itemCount: items.length },
    traceId: ctx.traceId ?? null,
  });
  return { ...updated, items };
}

/** 仅更新 PI 关联联系人（轻量，不影响状态机；域强制） */
export async function updatePiContact(id: string, customerContactId: string | null, ctx: ServiceContext) {
  const existing = await piRepo.findPiById(id);
  if (!existing) throw new AppError('PI 不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权操作该 PI', 403);
  }
  const updated = await piRepo.updatePiContact(id, customerContactId);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'pis',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'updateContact', customerContactId },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 删除（域强制） */
export async function deletePi(id: string, ctx: ServiceContext) {
  const existing = await piRepo.findPiById(id);
  if (!existing) throw new AppError('PI 不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权删除该 PI', 403);
  }
  await piRepo.removePi(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'pis',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'delete' },
    traceId: ctx.traceId ?? null,
  });
  return { id };
}
