// ============================================================
// Quote Service —— 批次1-A D3 (报价从0激活)
// 建/查/列/状态/删 + 预览数据。透传 salesType + 服务端域强制 + audit_log（门禁规则6）。
// 内外销计税：外销(EXTERNAL)统一未税(taxRate=0)；内销取传入税率默认 13%。
// ============================================================
import * as quoteRepo from '../repositories/quote.repository';
import * as productRepo from '../repositories/product.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import type { ServiceContext } from './types';

export interface QuoteItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateQuoteInput {
  customerId: string;
  items: QuoteItemInput[];
  discount?: number;
  validUntil?: string | null;
  notes?: string | null;
  taxRate?: number;
}

/** 计算报价金额（内外销计税规则） */
export function calcQuoteTotals(
  lineItems: { unitPrice: number; quantity: number; discount: number; subtotal: number }[],
  headerDiscount: number,
  isExternal: boolean,
  inputTaxRate: number
) {
  const totalAmount = lineItems.reduce((s, i) => s + i.subtotal, 0);
  const finalAmount = Math.round(totalAmount * (1 - headerDiscount / 100) * 100) / 100;
  const rate = isExternal ? 0 : inputTaxRate;
  const amountWithoutTax = rate > 0 ? Math.round((finalAmount / (1 + rate / 100)) * 100) / 100 : finalAmount;
  return { totalAmount: finalAmount, amountWithoutTax, taxRate: rate };
}

/** 新建报价（D3 核心） */
export async function createQuote(input: CreateQuoteInput, ctx: ServiceContext) {
  const custRepo = await import('../repositories/customer.repository');
  const cust = await custRepo.findCustomerById(input.customerId);
  if (!cust) throw new AppError('客户不存在', 404);
  if (ctx.scope !== 'ALL' && (cust.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权在该销售域下创建报价', 403);
  }

  // 取产品单价并计算行小计
  const lineItems = [];
  for (const it of input.items) {
    const product = await productRepo.findProductById(it.productId);
    if (!product) throw new AppError(`产品不存在: ${it.productId}`, 404);
    const unitPrice = product.unitPrice;
    const itemDiscount = it.discount ?? 0;
    const subtotal = Math.round(unitPrice * it.quantity * (1 - itemDiscount / 100) * 100) / 100;
    lineItems.push({ unitPrice, quantity: it.quantity, discount: itemDiscount, subtotal });
  }

  const isExternal = (cust.salesType ?? '').toUpperCase() === 'EXTERNAL';
  const totals = calcQuoteTotals(lineItems, input.discount ?? 0, isExternal, input.taxRate ?? 13);

  const quoteNumber = await quoteRepo.nextQuoteNumber();
  const quote = await quoteRepo.createQuote({
    quoteNumber,
    customerId: input.customerId,
    salesType: cust.salesType ?? 'INTERNAL',
    totalAmount: totals.totalAmount,
    amountWithoutTax: totals.amountWithoutTax,
    taxRate: totals.taxRate,
    discount: input.discount ?? 0,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    notes: input.notes ?? null,
    createdById: ctx.userId,
    items: lineItems.map((li, idx) => ({
      productId: input.items[idx].productId,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      discount: li.discount,
      subtotal: li.subtotal,
    })),
  });

  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'quotes',
    entityId: quote.id,
    salesType: quote.salesType,
    result: 'SUCCESS',
    detail: { op: 'create', quoteNumber, salesType: quote.salesType },
    traceId: ctx.traceId ?? null,
  });
  return quote;
}

/** 报价列表（服务端域过滤） */
export async function listQuotes(filter: quoteRepo.QuoteFilter, ctx: ServiceContext) {
  const salesType = ctx.scope === 'ALL' ? filter.salesType : ctx.scope;
  return quoteRepo.findQuotes({ ...filter, salesType });
}

/** 报价详情（域强制） */
export async function getQuote(id: string, ctx: ServiceContext) {
  const quote = await quoteRepo.findQuoteById(id);
  if (!quote) throw new AppError('报价单不存在', 404);
  if (ctx.scope !== 'ALL' && (quote.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权查看该报价单', 403);
  }
  return quote;
}

/** 更新状态 */
export async function updateQuoteStatus(id: string, status: string, ctx: ServiceContext) {
  const existing = await quoteRepo.findQuoteById(id);
  if (!existing) throw new AppError('报价单不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权修改该报价单', 403);
  }
  const updated = await quoteRepo.updateQuoteStatus(id, status);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'quotes',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'updateStatus', status },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 更新可编辑字段（折扣/有效期/备注） */
export async function updateQuote(
  id: string,
  data: { discount?: number; validUntil?: string | null; notes?: string | null },
  ctx: ServiceContext
) {
  const existing = await quoteRepo.findQuoteById(id);
  if (!existing) throw new AppError('报价单不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权修改该报价单', 403);
  }
  const updated = await quoteRepo.updateQuoteFields(id, {
    discount: data.discount,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    notes: data.notes ?? null,
  });
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'quotes',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'update' },
    traceId: ctx.traceId ?? null,
  });
  return updated;
}

/** 删除（仅草稿） */
export async function deleteQuote(id: string, ctx: ServiceContext) {
  const existing = await quoteRepo.findQuoteById(id);
  if (!existing) throw new AppError('报价单不存在', 404);
  if (ctx.scope !== 'ALL' && (existing.salesType ?? '').toUpperCase() !== ctx.scope) {
    throw new AppError('无权删除该报价单', 403);
  }
  if (existing.status !== 'DRAFT') {
    throw new AppError('只能删除草稿状态的报价单', 400);
  }
  await quoteRepo.removeQuote(id);
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'quotes',
    entityId: id,
    salesType: existing.salesType,
    result: 'SUCCESS',
    detail: { op: 'delete' },
    traceId: ctx.traceId ?? null,
  });
  return { id };
}
