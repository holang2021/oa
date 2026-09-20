import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

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
    for (const key of ['name', 'position', 'title', 'phone', 'email', 'wechat', 'whatsapp', 'dept', 'type', 'isKeyPerson', 'gender', 'remark']) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const contact = await prisma.contact.update({ where: { id }, data });
    res.json({ code: 0, message: '更新成功', data: contact });
  } catch (error) {
    next(error);
  }
};
