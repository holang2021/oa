// ============================================================
// Pi Repository —— 批次1-B D2 (外销 PI · 分层)
// Repository 层独占 Prisma 写权限（门禁规则2）。外销 PI 生成骨架：
// 仅落库 PI 记录（复用 Quote 数据），不做模板引擎强校验（那是 1-C）。
// ============================================================
import { prisma } from '../config/database';

export interface CreatePiInput {
  piNo: string;
  customerId: string;
  salesType: string;
  quoteRef?: string | null;
  amount: number;
  currency?: string | null;
  status?: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  customerContactId?: string | null;
  createdById: string;
}

export interface PiFilter {
  search?: string;
  status?: string;
  customerId?: string;
  salesType?: string;
  quoteRef?: string;
  skip?: number;
  take?: number;
}

export async function createPi(data: CreatePiInput) {
  return prisma.pi.create({
    data: {
      piNo: data.piNo,
      customerId: data.customerId,
      salesType: data.salesType,
      quoteRef: data.quoteRef ?? null,
      amount: data.amount,
      currency: data.currency ?? 'USD',
      status: data.status ?? 'DRAFT',
      issuedAt: data.issuedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      notes: data.notes ?? null,
      customerContactId: data.customerContactId ?? null,
      // 标量 createdById：与 1-A 既有约定一致（关系名 creator 仅在 include 阶段使用）
      createdById: data.createdById,
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function findPiById(id: string) {
  return prisma.pi.findUnique({
    where: { id },
    include: {
      customer: true,
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function findPiByNo(piNo: string) {
  return prisma.pi.findUnique({ where: { piNo } });
}

export async function findPis(filter: PiFilter) {
  const where: Record<string, unknown> = {};
  if (filter.search) {
    where.OR = [
      { piNo: { contains: filter.search } },
      { customer: { companyName: { contains: filter.search } } },
    ];
  }
  if (filter.status) where.status = filter.status;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.quoteRef) where.quoteRef = filter.quoteRef;
  if (filter.salesType) where.salesType = filter.salesType.toUpperCase();

  const [list, total] = await Promise.all([
    prisma.pi.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.skip ?? 0,
      take: filter.take ?? 20,
    }),
    prisma.pi.count({ where }),
  ]);
  return { list, total };
}

/** 确认 PI（DRAFT → CONFIRMED，闭环：CONFIRMED 后才可建订单） */
export async function confirmPi(id: string) {
  return prisma.pi.update({
    where: { id },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function updatePiStatus(id: string, status: string) {
  return prisma.pi.update({
    where: { id },
    data: { status },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

/** 仅更新 PI 关联联系人（轻量端点，不影响状态机） */
export async function updatePiContact(id: string, customerContactId: string | null) {
  return prisma.pi.update({
    where: { id },
    data: { customerContactId },
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function removePi(id: string) {
  return prisma.pi.delete({ where: { id } });
}

/** 取下一个 PI 号（PI + 年 + 6位序号） */
export async function nextPiNumber(): Promise<string> {
  const count = await prisma.pi.count();
  return `PI${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
}
