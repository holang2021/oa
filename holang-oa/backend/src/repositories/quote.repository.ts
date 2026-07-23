// ============================================================
// Quote Repository —— 批次1-A (D3 从0激活)
// Repository 层独占 Prisma 写权限（门禁规则2）。报价单无公海（仅客户/商机有公海）。
// ============================================================
import { prisma } from '../config/database';

export interface QuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface CreateQuoteInput {
  quoteNumber: string;
  customerId: string;
  salesType: string;
  totalAmount: number;
  amountWithoutTax: number;
  taxRate: number;
  discount: number;
  validUntil?: Date | null;
  opportunityId?: string | null; // 批次1-B D1：关联商机（商机 WIN 才可建报价）
  notes?: string | null;
  createdById: string;
  items: QuoteItemInput[];
}

export interface QuoteFilter {
  search?: string;
  status?: string;
  customerId?: string;
  salesType?: string;
  createdById?: string;
  skip?: number;
  take?: number;
}

export async function createQuote(data: CreateQuoteInput) {
  return prisma.quote.create({
    data: {
      quoteNumber: data.quoteNumber,
      customerId: data.customerId,
      salesType: data.salesType,
      totalAmount: data.totalAmount,
      amountWithoutTax: data.amountWithoutTax,
      taxRate: data.taxRate,
      discount: data.discount,
      validUntil: data.validUntil ?? null,
      opportunityId: data.opportunityId ?? null,
      notes: data.notes ?? null,
      // 标量 createdById：当前生成的 Prisma client（v5.22.0）在 Quote create 的 data
      // 类型中仅认标量 createdById（关系名 creator 在 create 阶段不被接受）。
      // include 中的 creator 关系保留不动（include 阶段 client 认关系名）。
      createdById: data.createdById,
      items: {
        create: data.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          subtotal: it.subtotal,
        })),
      },
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });
}

export async function findQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      creator: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });
}

export async function findQuotes(filter: QuoteFilter) {
  const where: Record<string, unknown> = {};
  if (filter.search) {
    where.OR = [
      { quoteNumber: { contains: filter.search } },
      { customer: { companyName: { contains: filter.search } } },
    ];
  }
  if (filter.status) where.status = filter.status;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.salesType) where.salesType = filter.salesType.toUpperCase();
  if (filter.createdById) where.createdById = filter.createdById;

  const [list, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.skip ?? 0,
      take: filter.take ?? 20,
    }),
    prisma.quote.count({ where }),
  ]);
  return { list, total };
}

export async function updateQuoteStatus(id: string, status: string) {
  return prisma.quote.update({
    where: { id },
    data: { status },
    include: {
      customer: { select: { id: true, companyName: true } },
      items: { include: { product: true } },
    },
  });
}

export async function removeQuote(id: string) {
  return prisma.quote.delete({ where: { id } });
}

/** 更新报价单可编辑字段（折扣/有效期/备注） */
export async function updateQuoteFields(
  id: string,
  data: { discount?: number; validUntil?: Date | null; notes?: string | null }
) {
  return prisma.quote.update({
    where: { id },
    data: {
      ...(data.discount !== undefined && { discount: data.discount }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      items: { include: { product: true } },
    },
  });
}

/** 取下一个报价单号（QT + 年 + 6位序号，基于当前计数） */
export async function nextQuoteNumber(): Promise<string> {
  const count = await prisma.quote.count();
  return `QT${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
}

/** 接受报价（D1 状态机：DRAFT/SENT → ACCEPTED；接受后才可建合同/PI） */
export async function acceptQuote(id: string) {
  return prisma.quote.update({
    where: { id },
    data: { status: 'ACCEPTED' },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });
}
