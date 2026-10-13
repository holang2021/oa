// ============================================================
// Customer Repository —— 批次1-A (D1 客户等级 / D2 公海)
// Repository 层独占 Prisma 写权限（门禁规则2）。Controller/Service 不碰 Prisma。
// ============================================================
import { prisma } from '../config/database';
import type { CustomerGrade } from '../services/types';

export interface CustomerContactInput {
  name?: string;
  position?: string | null;
  title?: string | null;
  type?: string;
  phone?: string | null;
  email?: string | null;
  isKeyPerson?: boolean;
}

export interface CreateCustomerInput {
  companyName: string;
  customerCode?: string | null;
  industry?: string | null;
  scale?: string | null;
  address?: string | null;
  companyPhone?: string | null;
  website?: string | null;
  creditCode?: string | null;
  dunsNumber?: string | null;
  country?: string | null;
  status?: string;
  source?: string | null;
  salesOwnerId?: string | null;
  createdBy?: string | null;
  notes?: string | null;
  taxTitle?: string | null;
  taxNumber?: string | null;
  invoiceType?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankCode?: string | null;
  contacts?: CustomerContactInput[];
  // ── D1 等级 ──
  customerGrade?: CustomerGrade | null;
  nextFollowupAt?: Date | null;
  gradeReviewAt?: Date | null;
  // ── D2 公海 ──
  salesType: string;
  inPublicPool?: boolean;
  ownerId?: string | null;
}

export interface CustomerFilter {
  search?: string;
  status?: string;
  industry?: string;
  businessLine?: string;
  salesType?: string;
  salesOwnerId?: string;
  inPublicPool?: boolean;
  includeUnassignedAsPool?: boolean;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      companyName: data.companyName,
      customerCode: data.customerCode ?? null,
      industry: data.industry ?? null,
      scale: data.scale ?? null,
      address: data.address ?? null,
      companyPhone: data.companyPhone ?? null,
      website: data.website ?? null,
      creditCode: data.creditCode ?? null,
      dunsNumber: data.dunsNumber ?? null,
      country: data.country ?? null,
      status: data.status ?? 'POTENTIAL',
      source: data.source ?? null,
      salesOwnerId: data.salesOwnerId ?? null,
      createdBy: data.createdBy ?? null,
      // Customer 模型无 notes 列，备注落入 remark 字段
      remark: data.notes ?? null,
      taxTitle: data.taxTitle ?? null,
      taxNumber: data.taxNumber ?? null,
      invoiceType: data.invoiceType ?? null,
      bankName: data.bankName ?? null,
      bankAccount: data.bankAccount ?? null,
      bankCode: data.bankCode ?? null,
      salesType: data.salesType,
      customerGrade: data.customerGrade ?? null,
      nextFollowupAt: data.nextFollowupAt ?? null,
      gradeReviewAt: data.gradeReviewAt ?? null,
      inPublicPool: data.inPublicPool ?? false,
      ownerId: data.ownerId ?? null,
      contacts: data.contacts?.length
        ? {
            create: data.contacts.map((c) => ({
              name: c.name,
              position: c.position ?? null,
              title: c.title ?? null,
              type: c.type ?? 'PRIMARY',
              phone: c.phone ?? null,
              email: c.email ?? null,
              isKeyPerson: c.isKeyPerson ?? false,
            })),
          }
        : undefined,
    },
    include: {
      salesOwner: { select: { id: true, name: true } },
      contacts: true,
    },
  });
}

export async function findCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

export async function findCustomers(filter: CustomerFilter) {
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (filter.search) {
    and.push({ OR: [
      { companyName: { contains: filter.search } },
      { contacts: { some: { name: { contains: filter.search } } } },
    ] });
  }
  if (filter.status) where.status = filter.status;
  if (filter.industry) where.industry = filter.industry;
  if (filter.businessLine) where.businessLine = filter.businessLine;
  if (filter.salesType) where.salesType = filter.salesType.toUpperCase();
  if (filter.salesOwnerId) where.salesOwnerId = filter.salesOwnerId;
  if (filter.includeUnassignedAsPool) {
    // 兼容历史导入客户：未分配负责人时先按公海可见，认领后才正式绑定负责人。
    and.push({ OR: [{ inPublicPool: true }, { salesOwnerId: null }] });
  } else if (typeof filter.inPublicPool === 'boolean') {
    where.inPublicPool = filter.inPublicPool;
  }
  if (filter.ownerId) where.ownerId = filter.ownerId;
  if (and.length > 0) where.AND = and;

  const [list, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        salesOwner: { select: { id: true, name: true } },
        _count: { select: { opportunities: true, followUps: true } },
      },
      orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder ?? 'desc' },
      skip: filter.skip ?? 0,
      take: filter.take ?? 20,
    }),
    prisma.customer.count({ where }),
  ]);
  return { list, total };
}

/** 更新客户等级与频次字段（D1） */
export async function updateCustomerGrade(
  id: string,
  grade: CustomerGrade | null,
  nextFollowupAt: Date | null,
  gradeReviewAt: Date | null
) {
  return prisma.customer.update({
    where: { id },
    data: { customerGrade: grade, nextFollowupAt, gradeReviewAt },
  });
}

/** 统计各等级客户数量（A 占比控用） */
export async function countByGrade(): Promise<Record<string, number>> {
  const rows = await prisma.customer.groupBy({ by: ['customerGrade'], _count: { _all: true } });
  const result: Record<string, number> = { A: 0, B: 0, C: 0, null: 0 };
  let total = 0;
  for (const r of rows) {
    const key = r.customerGrade ?? 'null';
    result[key] = r._count._all;
    total += r._count._all;
  }
  result.total = total;
  return result;
}

/** 公海认领：移出公海 + 绑定 owner（D2） */
export async function claimCustomer(id: string, ownerId: string) {
  return prisma.customer.update({
    where: { id },
    data: { inPublicPool: false, ownerId, salesOwnerId: ownerId },
  });
}

/** 退回公海：标记公海 + 解绑 owner（D2） */
export async function returnCustomerToPool(id: string) {
  return prisma.customer.update({
    where: { id },
    data: { inPublicPool: true, ownerId: null, salesOwnerId: null },
  });
}

/** 扫描到期跟进客户（供 1-D 统一待办聚合；D1 频次任务） */
export async function findDueFollowups(now: Date) {
  return prisma.customer.findMany({
    where: {
      inPublicPool: false,
      nextFollowupAt: { lte: now },
    },
    select: {
      id: true,
      companyName: true,
      customerGrade: true,
      nextFollowupAt: true,
      ownerId: true,
      salesType: true,
    },
  });
}

/**
 * 取下一个客户编号（KH + 年 + 6位序号，基于当前客户计数）。
 * 与报价 nextQuoteNumber / 合同 nextContractNumber 同款后端原子取号机制，统一编号体系。
 * 前端不传 customerCode 时由服务端兜底生成，彻底消除“客户编号靠手工/空着”的缺口。
 */
export async function nextCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `KH${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
}
