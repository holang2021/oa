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

// ============================================================
// PI 商品明细（Commercial Items）—— 走法B：加 1 列 JSON，不新增 Model / Relation / BOM。
// 刘总 2026-11-08 一线反馈「产品销售单价、明细没有地方能填写」；真实 Allum PI 有 3 行明细。
// 一张 PI 的行项可能是 设备 / 外购 / 配件 / 运杂 / 安装 / 服务，不为每种建字段；
// 每行统一表达：品名描述 name / HS Code / 数量 qty / 单位 unit / 单价 price / 金额 amount。
// 用原生 SQL 读写 items_json，避免重新生成线上 Prisma 客户端（同 currency.service.ts 范式）。
// ============================================================
export interface PiItem {
  productCode?: string | null;  // 产品编号（型号/料号）
  hsCode?: string | null;
  name: string;
  qty?: number | null;
  unit?: string | null;
  price?: number | null;
  amount?: number | null;
}

export async function savePiItems(id: string, items: PiItem[]) {
  await prisma.$executeRaw`UPDATE pis SET items_json = ${JSON.stringify(items ?? [])} WHERE id = ${id}`;
  return items;
}

export async function readPiItems(id: string): Promise<PiItem[]> {
  const rows = await prisma.$queryRaw<Array<{ items_json: string | null }>>`SELECT items_json FROM pis WHERE id = ${id}`;
  const raw = rows?.[0]?.items_json;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/** 更新 PI 的可编辑内容（金额/币种/备注/状态）；明细单独经 savePiItems 写入 */
export async function updatePiContent(id: string, data: {
  amount?: number; currency?: string; notes?: string; status?: string;
}) {
  const patch: { amount?: number; currency?: string; notes?: string; status?: string } = {};
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.status !== undefined) patch.status = data.status;
  return prisma.pi.update({
    where: { id },
    data: patch,
    include: {
      customer: { select: { id: true, companyName: true } },
      creator: { select: { id: true, name: true } },
    },
  });
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
