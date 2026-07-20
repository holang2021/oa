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
