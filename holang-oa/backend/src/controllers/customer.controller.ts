import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomerStatus, FollowMethod, ContactType } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { isSalesOnlyRole, Role } from '../constants/roles';
import { detectCountryFromPhones } from '../utils/phoneCountry';
import { success, paginated } from '../utils/response';
import { toServiceContext } from '../utils/ctx';
import * as customerGradeService from '../services/customer-grade.service';
import * as publicPoolService from '../services/public-pool.service';
import * as apiConfigService from '../services/api-config.service';

const prisma = new PrismaClient();

// Validation schemas
const createCustomerSchema = z.object({
  companyName: z.string().min(1, '公司名称不能为空'),
  customerCode: z.string().optional(),
  industry: z.string().optional(),
  scale: z.string().optional(),
  address: z.string().optional(),
  companyPhone: z.string().optional(),
  website: z.string().optional(),
  creditCode: z.string().optional(),
  dunsNumber: z.string().optional(),
  country: z.string().optional(),
  status: z.string().default('POTENTIAL'),
  source: z.string().optional(),
  salesOwnerId: z.string().optional(),
  notes: z.string().optional(),
  taxTitle: z.string().optional(),
  taxNumber: z.string().optional(),
  invoiceType: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankCode: z.string().optional(),
  // ── D1 等级：4 选择题提示分级（可选）──
  gradeSignals: customerGradeService.gradeSignalsSchema.optional(),
  customerGrade: z.enum(['A', 'B', 'C']).optional(),
  salesType: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  contacts: z.array(z.object({
    name: z.string().min(1, '联系人姓名不能为空'),
    position: z.string().optional(),
    title: z.string().optional(),
    type: z.string().default('PRIMARY'),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    isKeyPerson: z.boolean().default(false),
  })).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const addContactSchema = z.object({
  name: z.string().min(1, '联系人姓名不能为空'),
  position: z.string().optional(),
  title: z.string().optional(),
  type: z.string().default('PRIMARY'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  wechat: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  dept: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  remark: z.string().optional().or(z.literal('')),
  isKeyPerson: z.boolean().default(false),
});

const addFollowUpSchema = z.object({
  method: z.string(),
  content: z.string().min(1, '跟进内容不能为空'),
  nextFollowUpAt: z.string().datetime().optional(),
});

const duplicateCheckSchema = z.object({
  companyName: z.string().optional(),
  creditCode: z.string().optional(),
  taxNumber: z.string().optional(),
  dunsNumber: z.string().optional(),
  website: z.string().optional(),
  salesType: z.string().optional(),
  excludeId: z.string().optional(),
});

const aiLookupSchema = z.object({
  companyName: z.string().min(1, '请输入公司名称'),
  mode: z.enum(['domestic', 'export']).default('domestic'),
});

function normalizeCompanyName(v: string) {
  return v
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（）()·.,，。]/g, '')
    .replace(/(有限责任公司|股份有限公司|有限公司|集团|公司|co ltd|coltd|ltd|limited|inc|llc)$/g, '');
}

function normalizeWebsiteDomain(v?: string | null) {
  if (!v) return '';
  return v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

async function callDeepSeekJson(messages: any[]) {
  const cfg = apiConfigService.getConfig('deepseek');
  if (!cfg || !cfg.credentials?.apiKey) {
    const err: any = new Error('未配置 DeepSeek 凭证，请在「系统配置 → 第三方 API」中填写 DeepSeek API Key');
    err.code = 503;
    throw err;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout || 30000);
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(`DeepSeek 返回 ${res.status}: ${text.slice(0, 200)}`);
      err.code = 503;
      throw err;
    }
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const err: any = new Error('DeepSeek 返回内容为空');
      err.code = 503;
      throw err;
    }
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get all customers with pagination, filtering, and search
 */
export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      industry = '',
      salesOwnerId = '',
      businessLine = '',
      salesType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause
    const where: any = {};

    // Search by company name or contact name
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contacts: { some: { name: { contains: search } } } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by industry
    if (industry) {
      where.industry = industry;
    }

    // Filter by businessLine (内销 INDUSTRIAL / 外销 RETAIL)
    if (businessLine) {
      where.businessLine = businessLine;
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    // Filter by sales owner
    if (salesOwnerId) {
      where.salesOwnerId = salesOwnerId;
    } else if (req.user && isSalesOnlyRole(req.user.role as Role)) {
      // 纯销售角色仅看本人名下客户（域隔离见 enforceSalesTypeScope）
      where.salesOwnerId = req.user.id;
    }

    // Get total count
    const total = await prisma.customer.count({ where });

    // Get customers
    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesOwner: {
          select: { id: true, name: true },
        },
        contacts: {
          take: 1,
        },
        _count: {
          select: { opportunities: true, followUps: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSizeNum,
    });

    // 补充 country 字段（未纳入 Prisma 生成客户端，用原生 SQL 附加）
    if (customers.length > 0) {
      const ids = customers.map((c: any) => c.id);
      const countryRows = await prisma.$queryRawUnsafe<Array<{ id: string; country: string | null }>>(
        `SELECT id, country FROM customers WHERE id IN (${ids.map(() => '?').join(',')})`,
        ...ids
      );
      const countryMap = new Map(countryRows.map((r) => [r.id, r.country]));
      customers.forEach((c: any) => {
        c.country = countryMap.get(c.id) ?? null;
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: customers,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 地理分布统计（世界地图数据源）
 * 按国家聚合：客户总数 / 已成交(WON)数 / 内销数 / 外销数
 * 使用原生 SQL（country 字段尚未纳入 Prisma 生成客户端）
 */
export const getGeoStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      country: string | null;
      businessLine: string;
      status: string;
      cnt: number;
    }>>(
      `SELECT COALESCE(country, '未知') AS country, businessLine, status, COUNT(*) AS cnt
       FROM customers
       GROUP BY COALESCE(country, '未知'), businessLine, status`
    );

    // 聚合为国家维度
    const map = new Map<string, { country: string; total: number; won: number; potential: number; internal: number; export: number }>();
    for (const r of rows) {
      const key = r.country || '未知';
      if (!map.has(key)) {
        map.set(key, { country: key, total: 0, won: 0, potential: 0, internal: 0, export: 0 });
      }
      const item = map.get(key)!;
      const cnt = Number(r.cnt);
      item.total += cnt;
      if (r.status === 'WON') item.won += cnt;
      else item.potential += cnt;
      if (r.businessLine === 'INDUSTRIAL') item.internal += cnt;
      else item.export += cnt;
    }

    const list = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const grand = list.reduce(
      (acc, x) => ({
        total: acc.total + x.total,
        won: acc.won + x.won,
        potential: acc.potential + x.potential,
        internal: acc.internal + x.internal,
        export: acc.export + x.export,
      }),
      { total: 0, won: 0, potential: 0, internal: 0, export: 0 }
    );

    res.json({
      code: 0,
      message: '获取成功',
      data: { list, grand },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 新建/编辑客户前查重：国内优先统一信用代码/税号，海外兼顾 DUNS/网站域名/公司名。
 * 只返回提示，不阻断创建；最终是否新增由销售确认。
 */
export const checkCustomerDuplicate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = duplicateCheckSchema.parse(req.query);
    const companyName = (q.companyName || '').trim();
    const creditCode = (q.creditCode || '').trim();
    const taxNumber = (q.taxNumber || '').trim();
    const dunsNumber = (q.dunsNumber || '').trim();
    const domain = normalizeWebsiteDomain(q.website);

    if (!companyName && !creditCode && !taxNumber && !dunsNumber && !domain) {
      return res.json(success({ list: [] }, '获取成功', req.traceId ?? null));
    }

    const or: any[] = [];
    if (creditCode) or.push({ creditCode });
    if (taxNumber) or.push({ taxNumber });
    if (dunsNumber) or.push({ dunsNumber });
    if (domain) {
      or.push({ website: { contains: domain } });
      or.push({ website: { contains: `www.${domain}` } });
    }
    if (companyName) or.push({ companyName: { contains: companyName } });

    const where: any = { OR: or };
    if (q.excludeId) where.id = { not: q.excludeId };
    if (q.salesType) where.salesType = q.salesType.toUpperCase();

    const candidates = await prisma.customer.findMany({
      where,
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        salesOwner: { select: { id: true, name: true } },
        contacts: { take: 1 },
      },
    });

    const inputName = normalizeCompanyName(companyName);
    const matches = candidates.map((c: any) => {
      const reasons: string[] = [];
      let score = 0;
      if (creditCode && c.creditCode === creditCode) { reasons.push('统一信用代码一致'); score += 100; }
      if (taxNumber && c.taxNumber === taxNumber) { reasons.push('税号一致'); score += 90; }
      if (dunsNumber && c.dunsNumber === dunsNumber) { reasons.push('DUNS 一致'); score += 90; }
      if (domain && normalizeWebsiteDomain(c.website) === domain) { reasons.push('网站域名一致'); score += 70; }

      const candidateName = normalizeCompanyName(c.companyName || '');
      if (inputName && candidateName) {
        if (inputName === candidateName) { reasons.push('公司名归一化一致'); score += 80; }
        else if (inputName.includes(candidateName) || candidateName.includes(inputName)) { reasons.push('公司名高度相似'); score += 45; }
      }

      return {
        id: c.id,
        companyName: c.companyName,
        customerCode: c.customerCode,
        salesType: c.salesType,
        country: c.country,
        creditCode: c.creditCode,
        taxNumber: c.taxNumber,
        dunsNumber: c.dunsNumber,
        website: c.website,
        salesOwner: c.salesOwner,
        contactName: c.contacts?.[0]?.name ?? null,
        reasons,
        score,
      };
    }).filter((m) => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

    res.json(success({ list: matches }, '获取成功', req.traceId ?? null));
  } catch (error) {
    next(error);
  }
};

/**
 * DeepSeek 企业名称联想：只提供未核验名称线索，不返回或预填工商字段。
 * 统一信用代码、DUNS 等权威标识必须由真实企业数据源提供。
 */
export const lookupCustomerByDeepSeek = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = aiLookupSchema.parse(req.body);
    const isExport = input.mode === 'export';
    const result = await callDeepSeekJson([
      {
        role: 'system',
        content:
          '你是企业名称联想助手。只输出 JSON 对象，不要解释。返回格式必须是 {"candidates": [...]}。' +
          'candidates 最多 5 条，按相关度排序；每条字段只允许 companyName 和 sourceNote。' +
          '输入可能是简称、品牌名或名称片段。结果只是未核验的搜索线索，不代表企业真实存在。' +
          '不要输出或猜测统一社会信用代码、DUNS、税号、地址、电话、银行账户等工商或敏感字段。',
      },
      {
        role: 'user',
        content: isExport
          ? `根据海外公司关键词联想可能的英文公司全称：${input.companyName}。仅作为后续权威查询的名称线索。`
          : `根据中国企业关键词联想可能的公司全称：${input.companyName}。仅作为后续权威工商查询的名称线索。`,
      },
    ]);

    const rawCandidates = Array.isArray(result.candidates)
      ? result.candidates
      : (result.companyName ? [result] : []);
    const candidates = rawCandidates.slice(0, 5).map((item: any) => ({
      companyName: item.companyName || '',
      industry: '',
      scale: '',
      address: '',
      website: '',
      creditCode: '',
      dunsNumber: '',
      taxTitle: '',
      taxNumber: '',
      bankName: '',
      companyPhone: '',
      country: '',
      sourceNote: item.sourceNote || 'DeepSeek 名称联想，尚未经过企业数据源核验',
    })).filter((item: any) => item.companyName);

    res.json(success({ candidates }, candidates.length ? '查询成功' : '未找到可靠候选', req.traceId ?? null));
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOwner: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        contacts: true,
        opportunities: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // 补充 country 字段（未纳入 Prisma 生成客户端）
    if (customer) {
      const row = await prisma.$queryRawUnsafe<Array<{ country: string | null }>>(
        `SELECT country FROM customers WHERE id = ?`,
        id
      );
      (customer as any).country = row[0]?.country ?? null;
    }

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Check permission (sales can only view their own customers)
    if (req.user?.role === 'SALES' && customer.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new customer（D1：4 选择题提示分级 + 自动算下次跟进）
 * 业务经 customerGradeService；服务端销售域强制 + audit_log。
 */
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createCustomerSchema.parse(req.body);

    // 客户编号唯一校验（复用 Repository 约定：此处仅判重，写走服务）
    if (validated.customerCode) {
      const existing = await prisma.customer.findUnique({
        where: { customerCode: validated.customerCode },
      });
      if (existing) {
        return res.status(409).json({ code: 409, message: '客户编号已存在', data: null, traceId: req.traceId ?? null });
      }
    }

    // 国家标签：优先用传入值；外销客户尝试从联系人电话识别；否则留空待手动补全
    const detectedCountry =
      validated.country ||
      detectCountryFromPhones(validated.contacts?.map((c) => c.phone) ?? [])?.zh ||
      null;

    const result = await customerGradeService.createCustomerWithGrade(
      {
        companyName: validated.companyName,
        customerCode: validated.customerCode ?? null,
        industry: validated.industry ?? null,
        scale: validated.scale ?? null,
        address: validated.address ?? null,
        companyPhone: validated.companyPhone ?? null,
        website: validated.website ?? null,
        creditCode: validated.creditCode ?? null,
        dunsNumber: validated.dunsNumber ?? null,
        country: detectedCountry,
        status: validated.status,
        source: validated.source ?? null,
        salesOwnerId: validated.salesOwnerId ?? null,
        notes: validated.notes ?? null,
        taxTitle: validated.taxTitle ?? null,
        taxNumber: validated.taxNumber ?? null,
        invoiceType: validated.invoiceType ?? null,
        bankName: validated.bankName ?? null,
        bankAccount: validated.bankAccount ?? null,
        bankCode: validated.bankCode ?? null,
        contacts: validated.contacts ?? [],
        gradeSignals: validated.gradeSignals,
        customerGrade: validated.customerGrade ?? null,
        salesType: validated.salesType,
      },
      toServiceContext(req)
    );

    res.status(201).json(
      success(
        { ...result.customer, grade: result.grade, nextFollowupAt: result.nextFollowupAt, ratioAdjusted: result.ratioAdjusted },
        '创建成功',
        req.traceId ?? null
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateCustomerSchema.parse(req.body);

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Check permission
    if (req.user?.role === 'SALES' && existing.salesOwnerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(validated.companyName !== undefined && { companyName: validated.companyName }),
        ...(validated.customerCode !== undefined && { customerCode: validated.customerCode }),
        ...(validated.industry !== undefined && { industry: validated.industry }),
        ...(validated.scale !== undefined && { scale: validated.scale }),
        ...(validated.address !== undefined && { address: validated.address }),
        ...(validated.companyPhone !== undefined && { companyPhone: validated.companyPhone }),
        ...(validated.website !== undefined && { website: validated.website }),
        ...(validated.creditCode !== undefined && { creditCode: validated.creditCode }),
        ...(validated.dunsNumber !== undefined && { dunsNumber: validated.dunsNumber }),
        ...(validated.country !== undefined && { country: validated.country }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.source !== undefined && { source: validated.source }),
        ...(validated.salesOwnerId !== undefined && { salesOwnerId: validated.salesOwnerId }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(validated.taxTitle !== undefined && { taxTitle: validated.taxTitle }),
        ...(validated.taxNumber !== undefined && { taxNumber: validated.taxNumber }),
        ...(validated.invoiceType !== undefined && { invoiceType: validated.invoiceType }),
        ...(validated.bankName !== undefined && { bankName: validated.bankName }),
        ...(validated.bankAccount !== undefined && { bankAccount: validated.bankAccount }),
        ...(validated.bankCode !== undefined && { bankCode: validated.bankCode }),
      },
      include: {
        salesOwner: { select: { id: true, name: true } },
        contacts: true,
      },
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete customer
 */
export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { opportunities: true, contracts: true },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Check if customer has related records
    if (existing.opportunities.length > 0 || existing.contracts.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '客户有关联的销售机会或合同，无法删除',
        data: null,
      });
    }

    // Delete customer (cascade will delete contacts and followUps)
    await prisma.customer.delete({
      where: { id },
    });

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer contacts
 */
export const getCustomerContacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contacts = await prisma.contact.findMany({
      where: { customerId: id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add contact to customer
 */
export const addContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = addContactSchema.parse(req.body);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Create contact with creator ownership
    const contact = await prisma.contact.create({
      data: {
        customerId: id,
        name: validated.name,
        position: validated.position || null,
        title: validated.title || null,
        type: validated.type,
        phone: validated.phone || null,
        email: validated.email || null,
        wechat: validated.wechat || null,
        whatsapp: validated.whatsapp || null,
        dept: validated.dept || null,
        gender: validated.gender || null,
        remark: validated.remark || null,
        isKeyPerson: validated.isKeyPerson,
        createdById: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      code: 0,
      message: '添加成功',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact
 * 规则：仅创建者本人可修改；未记录创建者时默认允许当前用户修改（兼容旧数据），
 * 同时兼容 system-admin-0001 等系统迁移账号缺失 createdById 的情况。
 */
export const updateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.params;
    const validated = addContactSchema.partial().parse(req.body);

    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existing) {
      return res.status(404).json({ code: 404, message: '联系人不存在', data: null });
    }

    if (existing.createdById && existing.createdById !== req.user!.id) {
      return res.status(403).json({
        code: 403,
        message: '仅联系人创建者可修改该联系人信息',
        data: null,
      });
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.position !== undefined && { position: validated.position || null }),
        ...(validated.title !== undefined && { title: validated.title || null }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.phone !== undefined && { phone: validated.phone || null }),
        ...(validated.email !== undefined && { email: validated.email || null }),
        ...(validated.wechat !== undefined && { wechat: validated.wechat || null }),
        ...(validated.whatsapp !== undefined && { whatsapp: validated.whatsapp || null }),
        ...(validated.dept !== undefined && { dept: validated.dept || null }),
        ...(validated.gender !== undefined && { gender: validated.gender || null }),
        ...(validated.remark !== undefined && { remark: validated.remark || null }),
        ...(validated.isKeyPerson !== undefined && { isKeyPerson: validated.isKeyPerson }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contact
 * 规则：任何角色均禁止删除联系人记录（保留完整业务轨迹）。
 */
export const deleteContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(403).json({
      code: 403,
      message: '系统禁止删除联系人记录，请联系管理员',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer follow-ups
 */
export const getFollowUps = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const followUps = await prisma.followUp.findMany({
      where: { customerId: id },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add follow-up record
 */
export const addFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = addFollowUpSchema.parse(req.body);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // Create follow-up
    const followUp = await prisma.followUp.create({
      data: {
        customerId: id,
        userId: req.user!.id,
        method: validated.method,
        content: validated.content,
        nextFollowUpAt: validated.nextFollowUpAt ? new Date(validated.nextFollowUpAt) : null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      code: 0,
      message: '添加成功',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch update customer status
 */
export const batchUpdateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要更新的客户',
        data: null,
      });
    }

    // Update customers
    const result = await prisma.customer.updateMany({
      where: {
        id: { in: ids },
        ...(req.user?.role === 'SALES' ? { salesOwnerId: req.user.id } : {}),
      },
      data: { status },
    });

    res.json({
      code: 0,
      message: `成功更新${result.count}条记录`,
      data: { count: result.count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export customers to Excel
 */
export const exportCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all customers (with same filters as getCustomers)
    const { search = '', status = '', industry = '' } = req.query as any;

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contacts: { some: { name: { contains: search } } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (industry) {
      where.industry = industry;
    }

    if (req.user?.role === 'SALES') {
      where.salesOwnerId = req.user.id;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesOwner: { select: { name: true } },
        contacts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // TODO: Generate Excel file using excel.utils
    // For now, return JSON data
    res.json({
      code: 0,
      message: '导出成功',
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────────────────────────────────────────
// D2 客户公海：claim / return / 列表（服务端销售域强制）
// ───────────────────────────────────────────────────────────
export const claimCustomerPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await publicPoolService.claimCustomer(req.params.id, toServiceContext(req));
    res.json(success(updated, '认领成功', req.traceId ?? null));
  } catch (error) {
    next(error);
  }
};

export const returnCustomerPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await publicPoolService.returnCustomer(req.params.id, toServiceContext(req));
    res.json(success(updated, '已退回公海', req.traceId ?? null));
  } catch (error) {
    next(error);
  }
};

export const listPoolCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const result = await publicPoolService.listPoolCustomers(toServiceContext(req), {
      search: q.search,
      skip: q.page ? (parseInt(q.page) - 1) * (parseInt(q.pageSize) || 20) : 0,
      take: parseInt(q.pageSize) || 20,
    });
    res.json(paginated(result.list, parseInt(q.page) || 1, parseInt(q.pageSize) || 20, result.total, '获取成功', req.traceId ?? null));
  } catch (error) {
    next(error);
  }
};
