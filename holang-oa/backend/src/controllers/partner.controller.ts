import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { resolveRole, isSalesOnlyRole, ROLES } from '../constants/roles';

const prisma = new PrismaClient();

/**
 * 代理商档案 — 刘总 2026-10-09 拍板 A'（奥卡姆剃刀收敛）
 * 代理商 = Customer 的一种（customerType='AGENT'），不另立 Partner 表。
 *   依据：① 报备(DealerReport)审核本就落 Customer，独立表=重复+跨表撞单；
 *         ② 内销/外销本是同一 CRM 按 role 分流（刘总 2026-10-08 铁律）。
 * 本控制器 API 契约与旧 Partner 版完全一致（前端零改动），底层读写 customers：
 *   JSON salesType(INTERNAL内销业务/EXTERNAL外销) ↔ Customer.businessLine(INDUSTRIAL/RETAIL)
 *   JSON agentRegion(DOMESTIC国内/OVERSEAS海外)   ↔ Customer.salesType(INTERNAL/EXTERNAL)
 *   JSON ownerId(归属人)      ↔ Customer.salesOwnerId
 *   JSON responsibleId(责任人) ↔ Customer.salesPerson（存用户姓名，刘总 2026-10-09 选 A 映射）
 *   JSON contactName/Phone/Email ↔ 主联系人 Contact(type=PRIMARY)
 *   JSON followUp(跟进)       ↔ Customer.remark
 *   JSON status(审批态)       ↔ Customer.agentStatus（仅 AGENT 用）
 *   JSON submittedBy(提交人)  ↔ Customer.createdBy
 * 状态机: PENDING → APPROVED / REJECTED(必填原因) → 改后重提回 PENDING
 * 查重: 主维度=公司名归一化双向匹配（跨全部客户，含终端客户防撞单）；邮箱/电话辅助。
 * 审批人: 管理员/主管统一一个审批池;内/外销仅标签不分流。职责分离: 提交人不能自审。
 */

// 公司名归一化:去空格/大小写/常见公司后缀/标点,用于模糊查重主维度
function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(limited|ltd|inc|corp|co\.?|company|gmbh|llc|股份|有限公司|有限责任公司|集团)/g, '')
    .replace(/[.,，。()（）]/g, '');
}

// ── 契约字段 ↔ Customer 字段 映射 ─────────────────────────────
const bizToCustomer = (salesType: string) => (salesType === 'EXTERNAL' ? 'RETAIL' : 'INDUSTRIAL');
const bizFromCustomer = (businessLine?: string | null) =>
  businessLine === 'RETAIL' ? 'EXTERNAL' : 'INTERNAL';
const regionToCustomer = (agentRegion: string) => (agentRegion === 'OVERSEAS' ? 'EXTERNAL' : 'INTERNAL');
const regionFromCustomer = (salesType?: string | null) =>
  salesType === 'EXTERNAL' ? 'OVERSEAS' : 'DOMESTIC';

const upsertPartnerSchema = z.object({
  companyName: z.string().min(1, '公司名称不能为空'),
  salesType: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  agentRegion: z.enum(['DOMESTIC', 'OVERSEAS']).default('DOMESTIC'),
  email: z.string().email().optional().or(z.literal('')),
  contactName: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  ownerId: z.string().optional().or(z.literal('')),
  responsibleId: z.string().optional().or(z.literal('')),
  followUp: z.string().optional().default(''),
});

const customerInclude = {
  contacts: { select: { id: true, name: true, phone: true, email: true, type: true } },
  salesOwner: { select: { id: true, name: true } },
};

/** 全量用户映射（用户表量级小）：byId 取名字，byName 反查 id（责任人映射用） */
async function getUserMaps() {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const byName = new Map(users.filter((u) => u.name).map((u) => [u.name as string, u]));
  return { byId, byName };
}

function primaryContact(row: any) {
  return row.contacts?.find((c: any) => c.type === 'PRIMARY') || row.contacts?.[0] || null;
}

/** Customer 行 → 旧 Partner 契约 JSON（前端零改动） */
function mapRow(row: any, userMaps: { byId: Map<string, any>; byName: Map<string, any> }) {
  const contact = primaryContact(row);
  const responsible = row.salesPerson ? userMaps.byName.get(row.salesPerson) || null : null;
  return {
    id: row.id,
    companyName: row.companyName,
    salesType: bizFromCustomer(row.businessLine),
    agentRegion: regionFromCustomer(row.salesType),
    email: contact?.email || '',
    contactName: contact?.name || '',
    contactPhone: contact?.phone || '',
    ownerId: row.salesOwnerId || null,
    responsibleId: responsible?.id || null,
    status: row.agentStatus || 'PENDING',
    followUp: row.remark || '',
    followUpAt: row.lastFollowAt,
    reviewedBy: row.agentReviewedBy || null,
    reviewedAt: row.agentReviewedAt,
    rejectReason: row.agentRejectReason || null,
    submittedBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner: row.salesOwner ? { id: row.salesOwner.id, name: row.salesOwner.name } : null,
    responsible: responsible ? { id: responsible.id, name: responsible.name } : null,
    reviewer: row.agentReviewedBy ? userMaps.byId.get(row.agentReviewedBy) || null : null,
    submitter: row.createdBy ? userMaps.byId.get(row.createdBy) || null : null,
  };
}

/** 模糊查询：q 跨 公司名/邮箱/联系人(电话)/归属人名/责任人名/状况/跟进情况 */
function fuzzyWhere(q: string): any[] {
  const cond = { contains: q };
  return [
    { companyName: cond },
    { remark: cond }, // 跟进情况
    { agentStatus: cond }, // 状况
    { salesPerson: cond }, // 责任人
    { salesOwner: { name: cond } }, // 归属人
    {
      contacts: {
        some: {
          OR: [{ name: cond }, { email: cond }, { phone: cond }],
        },
      },
    },
  ];
}

/** 写入/更新主联系人（CRM 正确形态：联系人挂在客户下，复用报备同款模式） */
async function upsertPrimaryContact(customerId: string, name: string, phone: string, email: string) {
  if (!name && !phone && !email) return;
  const existing =
    (await prisma.contact.findFirst({ where: { customerId, type: 'PRIMARY' } })) ||
    (await prisma.contact.findFirst({ where: { customerId } }));
  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: { name: name || existing.name, phone: phone || null, email: email || null },
    });
  } else {
    await prisma.contact.create({
      data: { customerId, name: name || '联系人', type: 'PRIMARY', phone: phone || null, email: email || null },
    });
  }
}

/**
 * GET /partners?q=&salesType=&agentRegion=&status=&page=&pageSize=
 * 列表 + 模糊查询(纯销售仅看自己归属的)
 */
export const getPartners = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q = '', salesType = '', agentRegion = '', status = '', page = '1', pageSize = '20' } = req.query as any;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    const where: any = { customerType: 'AGENT' };
    if (String(q).trim()) where.OR = fuzzyWhere(String(q).trim());
    if (salesType) where.businessLine = bizToCustomer(salesType);
    if (agentRegion) where.salesType = regionToCustomer(agentRegion);
    if (status) where.agentStatus = status;

    const role = resolveRole(req.user?.role);
    if (isSalesOnlyRole(role)) where.salesOwnerId = req.user!.id;

    const userMaps = await getUserMaps();
    const total = await prisma.customer.count({ where });
    const rows = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      include: customerInclude,
    });
    const list = rows.map((r) => mapRow(r, userMaps));

    res.json({
      code: 0,
      message: '获取成功',
      data: { list, pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partners/check-duplicate?q=&excludeId=
 * 模糊查重(列表页快速搜相似;审批页查重走 /:id/review-checks)
 */
export const checkPartnerDuplicate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = String((req.query.q as string) || '').trim();
    if (q.length < 1) return res.json({ code: 0, message: '获取成功', data: { list: [] } });

    const excludeId = String((req.query.excludeId as string) || '');
    const where: any = { customerType: 'AGENT', OR: fuzzyWhere(q).slice(0, 5) };
    if (excludeId) where.id = { not: excludeId };

    const userMaps = await getUserMaps();
    const rows = await prisma.customer.findMany({
      where, take: 5, orderBy: { updatedAt: 'desc' }, include: customerInclude,
    });
    res.json({ code: 0, message: '获取成功', data: { list: rows.map((r) => mapRow(r, userMaps)) } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /partners — 新建 → 一律进入 PENDING 待审批(Odoo partner approval 模式)
 * 落 customers(customerType='AGENT')，联系人落 Contact(PRIMARY)
 */
export const createPartner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = upsertPartnerSchema.parse(req.body);
    const userMaps = await getUserMaps();
    const responsibleUser = validated.responsibleId ? userMaps.byId.get(validated.responsibleId) : null;

    const customer = await prisma.customer.create({
      data: {
        companyName: validated.companyName,
        customerType: 'AGENT',
        businessLine: bizToCustomer(validated.salesType),
        salesType: regionToCustomer(validated.agentRegion),
        salesOwnerId: validated.ownerId || req.user?.id || null,
        salesPerson: responsibleUser?.name || null,
        remark: validated.followUp || null,
        lastFollowAt: validated.followUp ? new Date() : null,
        agentStatus: 'PENDING', // 新建强制进审批,不直接生效
        createdBy: req.user?.id,
      },
      include: customerInclude,
    });
    await upsertPrimaryContact(customer.id, validated.contactName || '', validated.contactPhone || '', validated.email || '');

    const fresh = await prisma.customer.findUnique({ where: { id: customer.id }, include: customerInclude });
    res.status(201).json({ code: 0, message: '已提交审批', data: mapRow(fresh!, userMaps) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partners/:id/review-checks — 审批页实时模糊查重
 * 公司名归一化双向匹配(防"恒信科技"vs"恒信科技有限公司"漏网),
 * 邮箱精确、电话包含、联系人双向。跨全部客户(含终端客户)防撞单。
 * 客户量级内内存匹配足够。
 */
export const getPartnerReviewChecks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const target = await prisma.customer.findUnique({ where: { id: req.params.id }, include: customerInclude });
    if (!target || target.customerType !== 'AGENT') {
      return res.status(404).json({ code: 404, message: '代理商不存在', data: null });
    }

    const all = await prisma.customer.findMany({
      where: { id: { not: target.id } },
      take: 2000,
      include: customerInclude,
    });
    const userMaps = await getUserMaps();
    const tContact = primaryContact(target);

    const bidir = (a: string, b: string) => a.includes(b) || b.includes(a);
    const matches = all.filter((m) => {
      // 主维度:公司名归一化后双向匹配
      const tn = normalizeName(target.companyName);
      const mn = normalizeName(m.companyName);
      if (tn && mn && (tn === mn || bidir(tn, mn))) return true;
      const mContact = primaryContact(m);
      if (tContact?.email && mContact?.email && tContact.email === mContact.email) return true;
      if (tContact?.phone && mContact?.phone &&
          (mContact.phone.includes(tContact.phone) || tContact.phone.includes(mContact.phone))) return true;
      if (tContact?.name && mContact?.name && bidir(mContact.name, tContact.name)) return true;
      return false;
    }).slice(0, 5).map((m) => mapRow(m, userMaps));

    res.json({ code: 0, message: '获取成功', data: { matches } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /partners/:id/review { action: 'approve' | 'reject', reason? }
 * 审批人:管理员/主管统一一个审批池(内/外销仅标签,不分流);提交人不能自审
 */
export const reviewPartner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, reason } = req.body as { action: string; reason?: string };
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer || customer.customerType !== 'AGENT') {
      return res.status(404).json({ code: 404, message: '代理商不存在', data: null });
    }

    if ((customer.agentStatus || 'PENDING') !== 'PENDING') {
      return res.status(400).json({ code: 400, message: '该档案不在待审批状态', data: null });
    }

    // 审批人:管理员/主管统一一个审批池(内/外销仅标签,不分流流程)
    const role = resolveRole(req.user?.role);
    const canReview =
      role === ROLES.ADMIN || role === ROLES.INTERNAL_LEAD || role === ROLES.EXTERNAL_LEAD;
    if (!canReview) {
      return res.status(403).json({ code: 403, message: '无审批权限(需管理员或主管)', data: null });
    }

    // 职责分离:提交人不能自审
    if (customer.createdBy && customer.createdBy === req.user!.id) {
      return res.status(403).json({ code: 403, message: '不能审批自己提交的档案', data: null });
    }

    if (action === 'approve') {
      const updated = await prisma.customer.update({
        where: { id: req.params.id },
        data: { agentStatus: 'APPROVED', agentReviewedBy: req.user!.id, agentReviewedAt: new Date() },
        include: customerInclude,
      });
      const userMaps = await getUserMaps();
      return res.json({ code: 0, message: '已通过,档案生效', data: mapRow(updated, userMaps) });
    }

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        return res.status(400).json({ code: 400, message: '驳回必须填写原因', data: null });
      }
      const updated = await prisma.customer.update({
        where: { id: req.params.id },
        data: { agentStatus: 'REJECTED', agentReviewedBy: req.user!.id, agentReviewedAt: new Date(), agentRejectReason: reason.trim() },
        include: customerInclude,
      });
      const userMaps = await getUserMaps();
      return res.json({ code: 0, message: '已驳回', data: mapRow(updated, userMaps) });
    }

    return res.status(400).json({ code: 400, message: '无效的审批动作', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partners/:id
 */
export const getPartnerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.customer.findUnique({ where: { id: req.params.id }, include: customerInclude });
    if (!row || row.customerType !== 'AGENT') {
      return res.status(404).json({ code: 404, message: '代理商不存在', data: null });
    }
    const userMaps = await getUserMaps();
    res.json({ code: 0, message: '获取成功', data: mapRow(row, userMaps) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /partners/:id — 编辑;已驳回的档案编辑保存后自动重新进入待审批
 */
export const updatePartner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.customerType !== 'AGENT') {
      return res.status(404).json({ code: 404, message: '代理商不存在', data: null });
    }

    const validated = upsertPartnerSchema.parse(req.body);
    const userMaps = await getUserMaps();
    const responsibleUser = validated.responsibleId ? userMaps.byId.get(validated.responsibleId) : null;

    const willResubmit = (existing.agentStatus || 'PENDING') === 'REJECTED';
    await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        companyName: validated.companyName,
        businessLine: bizToCustomer(validated.salesType),
        salesType: regionToCustomer(validated.agentRegion),
        salesOwnerId: validated.ownerId || null,
        salesPerson: responsibleUser?.name || null,
        remark: validated.followUp || null,
        lastFollowAt: validated.followUp ? new Date() : null,
        ...(willResubmit
          ? { agentStatus: 'PENDING', agentRejectReason: null, agentReviewedBy: null, agentReviewedAt: null, createdBy: req.user?.id }
          : {}),
      },
    });
    await upsertPrimaryContact(req.params.id, validated.contactName || '', validated.contactPhone || '', validated.email || '');

    const fresh = await prisma.customer.findUnique({ where: { id: req.params.id }, include: customerInclude });
    res.json({
      code: 0,
      message: willResubmit ? '已更新并重新提交审批' : '更新成功',
      data: mapRow(fresh!, userMaps),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /partners/:id — 仅 ADMIN(主数据防误删铁律)
 * 代理商=Customer，先清挂靠联系人再删（有订单/合同等关联时拒绝删除防数据事故）
 */
export const deletePartner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { orders: true, contracts: true, quotes: true, opportunities: true } } },
    });
    if (!existing || existing.customerType !== 'AGENT') {
      return res.status(404).json({ code: 404, message: '代理商不存在', data: null });
    }
    const counts = (existing as any)._count;
    if (counts && (counts.orders || counts.contracts || counts.quotes || counts.opportunities)) {
      return res.status(409).json({ code: 409, message: '该代理商已有业务关联(订单/合同/报价/商机)，禁止删除', data: null });
    }
    await prisma.contact.deleteMany({ where: { customerId: req.params.id } });
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    next(error);
  }
};
