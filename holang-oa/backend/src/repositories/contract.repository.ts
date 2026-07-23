// ============================================================
// Contract Repository —— 批次1-B D1/D3 (内销商务合同 · 分层)
// Repository 层独占 Prisma 写权限（门禁规则2）。Controller/Service 不碰 Prisma。
// 内销商务合同承载：salesType=INTERNAL；外销走 Pi 表（见 pi.repository）。
// ============================================================
import { prisma } from '../config/database';

export interface CreateContractInput {
  contractNumber: string;
  customerId: string;
  salesType: string;
  amount: number;
  quoteRef?: string | null;
  opportunityRef?: string | null;
  orderRef?: string | null;
  piRef?: string | null;
  contractType?: string | null;
  signedAt?: Date | null;
  expiresAt?: Date | null;
  status?: string;
  filePath?: string | null;
  notes?: string | null;
  createdById: string;
}

export interface ContractFilter {
  search?: string;
  status?: string;
  customerId?: string;
  salesType?: string;
  quoteRef?: string;
  skip?: number;
  take?: number;
}

export async function createContract(data: CreateContractInput) {
  return prisma.contract.create({
    data: {
      contractNumber: data.contractNumber,
      customerId: data.customerId,
      salesType: data.salesType,
      amount: data.amount,
      quoteRef: data.quoteRef ?? null,
      opportunityRef: data.opportunityRef ?? null,
      orderRef: data.orderRef ?? null,
      piRef: data.piRef ?? null,
      contractType: data.contractType ?? 'COMMERCIAL',
      signedAt: data.signedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      status: data.status ?? 'DRAFT',
      filePath: data.filePath ?? null,
      notes: data.notes ?? null,
      // 标量 createdById：与 1-A 既有约定一致（关系名 creator 仅在 include 阶段使用）
      createdById: data.createdById,
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function findContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: {
      customer: true,
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function findContractByNumber(contractNumber: string) {
  return prisma.contract.findUnique({ where: { contractNumber } });
}

export async function findContracts(filter: ContractFilter) {
  const where: Record<string, unknown> = {};
  if (filter.search) {
    where.OR = [
      { contractNumber: { contains: filter.search } },
      { customer: { companyName: { contains: filter.search } } },
    ];
  }
  if (filter.status) where.status = filter.status;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.quoteRef) where.quoteRef = filter.quoteRef;
  if (filter.salesType) where.salesType = filter.salesType.toUpperCase();

  const [list, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.skip ?? 0,
      take: filter.take ?? 20,
    }),
    prisma.contract.count({ where }),
  ]);
  return { list, total };
}

export async function updateContractStatus(id: string, status: string) {
  return prisma.contract.update({
    where: { id },
    data: { status },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

/** 确认合同（签署）：置 CONFIRMED + signedAt（闭环校验：CONFIRMED 后才可建订单） */
export async function confirmContract(id: string) {
  return prisma.contract.update({
    where: { id },
    data: { status: 'CONFIRMED', signedAt: new Date() },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function updateContractFields(
  id: string,
  data: {
    amount?: number;
    signedAt?: Date | null;
    expiresAt?: Date | null;
    status?: string;
    filePath?: string | null;
    notes?: string | null;
    orderRef?: string | null;
  }
) {
  return prisma.contract.update({
    where: { id },
    data: {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.signedAt !== undefined && { signedAt: data.signedAt }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.filePath !== undefined && { filePath: data.filePath }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.orderRef !== undefined && { orderRef: data.orderRef }),
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function removeContract(id: string) {
  return prisma.contract.delete({ where: { id } });
}

/** 取下一个合同号（HT + 年 + 6位序号） */
export async function nextContractNumber(): Promise<string> {
  const count = await prisma.contract.count();
  return `HT${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
}
