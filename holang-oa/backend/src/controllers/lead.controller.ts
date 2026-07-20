import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get all leads with pagination and search
 */
export const getLeads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      salesType = '',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    const total = await prisma.lead.count({ where });

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: leads,
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
 * Get lead by ID
 */
export const getLeadById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({ code: 404, message: '线索不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: lead });
  } catch (error) {
    next(error);
  }
};
