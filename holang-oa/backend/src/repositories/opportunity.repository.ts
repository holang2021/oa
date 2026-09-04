// ============================================================
// Opportunity Repository —— 批次1-A (D3 从0激活 / D2 公海)
// Repository 层独占 Prisma 写权限（门禁规则2）。
// ============================================================
import { prisma } from '../config/database';

export interface CreateOpportunityInput {
  name: string;
  customerId: string;
  productId?: string | null;
  expectedAmount: number;
  expectedCloseDate?: Date | null;
  stage?: string;
  description?: string | null;
  winProbability: number;
  salesType: string;
  salesOwnerId: string;
  customerContactId?: string | null;
}

export interface OpportunityFilter {
  search?: string;
  stage?: string;
  customerId?: string;
  salesOwnerId?: string;
  salesType?: string;
  inPublicPool?: boolean;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

export async function createOpportunity(data: CreateOpportunityInput) {
  return prisma.opportunity.create({
    data: {
      name: data.name,
      customerId: data.customerId,
      productId: data.productId ?? null,
      expectedAmount: data.expectedAmount,
      expectedCloseDate: data.expectedCloseDate ?? null,
      stage: data.stage ?? 'INITIAL_CONTACT',
      description: data.description ?? null,
      winProbability: data.winProbability,
      salesType: data.salesType,
      salesOwnerId: data.salesOwnerId,
      customerContactId: data.customerContactId ?? null,
      inPublicPool: false,
      ownerId: data.salesOwnerId,
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      product: { select: { id: true, name: true, model: true } },
      salesOwner: { select: { id: true, name: true } },
    },
  });
}

export async function findOpportunityById(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      customer: true,
      product: true,
      salesOwner: { select: { id: true, name: true } },
    },
  });
}

export async function findOpportunities(filter: OpportunityFilter) {
  const where: Record<string, unknown> = {};
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search } },
      { customer: { companyName: { contains: filter.search } } },
    ];
  }
  if (filter.stage) where.stage = filter.stage;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.salesType) where.salesType = filter.salesType.toUpperCase();
  if (filter.salesOwnerId) where.salesOwnerId = filter.salesOwnerId;
  if (typeof filter.inPublicPool === 'boolean') where.inPublicPool = filter.inPublicPool;
  if (filter.ownerId) where.ownerId = filter.ownerId;

  const [list, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, status: true } },
        product: { select: { id: true, name: true, model: true } },
        salesOwner: { select: { id: true, name: true } },
      },
      orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder ?? 'desc' },
      skip: filter.skip ?? 0,
      take: filter.take ?? 20,
    }),
    prisma.opportunity.count({ where }),
  ]);
  return { list, total };
}

export async function updateOpportunity(
  id: string,
  data: {
    name?: string;
    customerId?: string;
    productId?: string | null;
    expectedAmount?: number;
    expectedCloseDate?: Date | null;
    stage?: string;
    description?: string | null;
    winProbability?: number;
    customerContactId?: string | null;
  }
) {
  return prisma.opportunity.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, companyName: true } },
      product: { select: { id: true, name: true } },
      salesOwner: { select: { id: true, name: true } },
    },
  });
}

export async function removeOpportunity(id: string) {
  return prisma.opportunity.delete({ where: { id } });
}

/** 公海认领（D2） */
export async function claimOpportunity(id: string, ownerId: string) {
  return prisma.opportunity.update({
    where: { id },
    data: { inPublicPool: false, ownerId, salesOwnerId: ownerId },
  });
}

/** 退回公海（D2） */
export async function returnOpportunityToPool(id: string) {
  return prisma.opportunity.update({
    where: { id },
    data: { inPublicPool: true, ownerId: null, salesOwnerId: null },
  });
}

/** 商机漏斗（D3 辅助） */
export async function groupByStage(where: Record<string, unknown>) {
  return prisma.opportunity.groupBy({
    by: ['stage'],
    where,
    _count: { stage: true },
    _sum: { expectedAmount: true },
  });
}
