import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomerStatus, FollowMethod, ContactType } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { isSalesOnlyRole, Role } from '../constants/roles';
import { detectCountryFromPhones, DOMESTIC_COUNTRY } from '../utils/phoneCountry';

const prisma = new PrismaClient();

// Validation schemas
const createCustomerSchema = z.object({
  companyName: z.string().min(1, '公司名称不能为空'),
  customerCode: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  status: z.string().default('POTENTIAL'),
  source: z.string().optional(),
  salesOwnerId: z.string().optional(),
  notes: z.string().optional(),
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
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isKeyPerson: z.boolean().default(false),
});

const addFollowUpSchema = z.object({
  method: z.string(),
  content: z.string().min(1, '跟进内容不能为空'),
  nextFollowUpAt: z.string().datetime().optional(),
});

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
 * Create new customer
 */
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createCustomerSchema.parse(req.body);

    // Check if customer code already exists
    if (validated.customerCode) {
      const existing = await prisma.customer.findUnique({
        where: { customerCode: validated.customerCode },
      });
      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '客户编号已存在',
          data: null,
        });
      }
    }

    // 国家标签：优先用传入值；外销客户尝试从联系人电话识别；否则留空待手动补全
    const detectedCountry =
      validated.country ||
      detectCountryFromPhones(validated.contacts?.map((c) => c.phone))?.zh ||
      null;

    // Create customer with contacts
    const customer = await prisma.customer.create({
      data: {
        companyName: validated.companyName,
        customerCode: validated.customerCode,
        industry: validated.industry,
        address: validated.address,
        country: detectedCountry,
        status: validated.status,
        source: validated.source,
        salesOwnerId: validated.salesOwnerId || req.user?.id,
        createdBy: req.user?.id,
        notes: validated.notes,
        contacts: validated.contacts
          ? {
              create: validated.contacts.map((contact) => ({
                name: contact.name,
                position: contact.position,
                title: contact.title,
                type: contact.type,
                phone: contact.phone,
                email: contact.email || null,
                isKeyPerson: contact.isKeyPerson,
              })),
            }
          : undefined,
      },
      include: {
        salesOwner: { select: { id: true, name: true } },
        contacts: true,
      },
    });

    res.status(201).json({
      code: 0,
      message: '创建成功',
      data: customer,
    });
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
        ...(validated.address !== undefined && { address: validated.address }),
        ...(validated.country !== undefined && { country: validated.country }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.source !== undefined && { source: validated.source }),
        ...(validated.salesOwnerId !== undefined && { salesOwnerId: validated.salesOwnerId }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
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

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        customerId: id,
        name: validated.name,
        position: validated.position,
        title: validated.title,
        type: validated.type,
        phone: validated.phone,
        email: validated.email || null,
        isKeyPerson: validated.isKeyPerson,
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
 */
export const updateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.params;
    const validated = addContactSchema.partial().parse(req.body);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.position !== undefined && { position: validated.position }),
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.email !== undefined && { email: validated.email }),
        ...(validated.isKeyPerson !== undefined && { isKeyPerson: validated.isKeyPerson }),
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
 */
export const deleteContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.params;

    await prisma.contact.delete({
      where: { id: contactId },
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
