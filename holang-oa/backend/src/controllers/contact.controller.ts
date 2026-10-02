import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../repositories/audit-log.repository';

const prisma = new PrismaClient();

/**
 * Get all contacts with pagination, search and customerId filter
 */
export const getContacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '50',
      search = '',
      customerId = '',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { position: { contains: search } },
      ];
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const total = await prisma.contact.count({ where });

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: contacts,
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
 * Get contact by ID
 */
export const getContactById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!contact) {
      return res.status(404).json({ code: 404, message: '联系人不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: contact });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a contact for a customer (Phase 1: 一对多)
 */
export const createContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      customerId,
      name,
      position,
      title,
      phone,
      email,
      wechat,
      whatsapp,
      dept,
      type,
      isKeyPerson,
      gender,
      remark,
      extension,
    } = req.body as any;

    if (!customerId || !name) {
      return res.status(400).json({ code: 400, message: 'customerId 和 name 为必填', data: null });
    }

    // 设为 PRIMARY 时，先将该客户其它联系人降级为 SECONDARY（保证只有一个主联系人）
    if (type === 'PRIMARY') {
      await prisma.contact.updateMany({
        where: { customerId, type: 'PRIMARY' },
        data: { type: 'SECONDARY' },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        customerId,
        name,
        position: position ?? null,
        title: title ?? null,
        phone: phone ?? null,
        email: email ?? null,
        wechat: wechat ?? null,
        whatsapp: whatsapp ?? null,
        dept: dept ?? null,
        type: type === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
        isKeyPerson: Boolean(isKeyPerson),
        gender: gender ?? null,
        remark: remark ?? null,
        extension: extension ?? null,
        createdById: req.user?.id ?? null,
      },
    });

    res.json({ code: 0, message: '创建成功', data: contact });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a contact (Phase 1: 一对多)
 */
export const updateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as any;

    if (body.type === 'PRIMARY') {
      const existing = await prisma.contact.findUnique({ where: { id } });
      if (existing) {
        await prisma.contact.updateMany({
          where: { customerId: existing.customerId, type: 'PRIMARY', NOT: { id } },
          data: { type: 'SECONDARY' },
        });
      }
    }

    const data: any = {};
    for (const key of ['name', 'position', 'title', 'phone', 'email', 'wechat', 'whatsapp', 'dept', 'type', 'isKeyPerson', 'gender', 'remark', 'extension']) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const contact = await prisma.contact.update({ where: { id }, data });
    res.json({ code: 0, message: '更新成功', data: contact });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记联系人离职（治理铁律：原记录保留 + status=LEFT + 审计留痕，禁止删除）
 */
export const leaveContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { leftNote } = req.body as any;
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return res.status(404).json({ code: 404, message: '联系人不存在', data: null });
    if (contact.status === 'LEFT') return res.status(400).json({ code: 400, message: '该联系人已标记为离职', data: null });

    const updated = await prisma.contact.update({
      where: { id },
      data: { status: 'LEFT', leftAt: new Date(), leftNote: leftNote ?? null },
    });
    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'contacts',
      entityId: id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'leave_contact', note: leftNote ?? null, customerId: contact.customerId },
    });
    res.json({ code: 0, message: '已标记为离职', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * 迁移联系人到目标客户（治理铁律：原记录标 LEFT 保留，新建记录挂目标客户 + migratedFromId 血缘，写审计留痕）
 */
export const migrateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { targetCustomerId, note } = req.body as any;
    if (!targetCustomerId) return res.status(400).json({ code: 400, message: 'targetCustomerId 必填', data: null });
    const source = await prisma.contact.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ code: 404, message: '联系人不存在', data: null });
    if (source.customerId === targetCustomerId) return res.status(400).json({ code: 400, message: '目标客户不能是原客户', data: null });
    const target = await prisma.customer.findUnique({ where: { id: targetCustomerId } });
    if (!target) return res.status(404).json({ code: 404, message: '目标客户不存在', data: null });

    await prisma.contact.update({
      where: { id },
      data: {
        status: 'LEFT',
        leftAt: new Date(),
        leftNote: note ? `迁移至客户 ${target.companyName}：${note}` : `迁移至客户 ${target.companyName}`,
      },
    });
    const created = await prisma.contact.create({
      data: {
        customerId: targetCustomerId,
        name: source.name,
        position: source.position,
        title: source.title,
        phone: source.phone,
        email: source.email,
        wechat: source.wechat,
        whatsapp: source.whatsapp,
        dept: source.dept,
        type: 'SECONDARY',
        isKeyPerson: false,
        gender: source.gender,
        remark: source.remark,
        extension: source.extension,
        migratedFromId: source.id,
        createdById: req.user?.id ?? null,
      },
    });
    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'contacts',
      entityId: id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'leave_contact', reason: 'migrate', targetCustomerId, targetCustomerName: target.companyName, note: note ?? null },
    });
    await createAuditLog({
      userId: req.user?.id ?? null,
      action: 'WRITE',
      entity: 'contacts',
      entityId: created.id,
      salesType: (req.user as any)?.salesType ?? null,
      detail: { op: 'migrate_create_contact', fromContactId: source.id, fromCustomerId: source.customerId, targetCustomerId },
    });
    res.json({ code: 0, message: '已迁移至目标客户', data: created });
  } catch (error) {
    next(error);
  }
};
