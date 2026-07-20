import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get all deliveries with pagination, search and businessLine filter
 */
export const getDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      businessLine = '',
      customerId = '',
      salesType = '',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { endCustomerName: { contains: search } },
        { receiver: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (status) {
      where.flowStatus = status;
    }

    // Filter by businessLine via related order/customer
    if (businessLine) {
      where.OR = [
        { order: { businessLine } },
        { customer: { businessLine } },
      ];
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    // Filter by customerId
    if (customerId) {
      where.customerId = customerId;
    }

    const total = await prisma.delivery.count({ where });

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, businessLine: true } },
        order: { select: { id: true, orderCode: true, businessLine: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: deliveries,
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
 * Get delivery by ID
 */
export const getDeliveryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true, businessLine: true } },
        order: { select: { id: true, orderCode: true, businessLine: true } },
      },
    });

    if (!delivery) {
      return res.status(404).json({ code: 404, message: '发货记录不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: delivery });
  } catch (error) {
    next(error);
  }
};

const DELIVERY_FIELDS = [
  'code', 'orderId', 'flowStatus', 'productType', 'paidAsContract', 'overdueReason',
  'orderType', 'endCustomerName', 'receiver', 'receiverPhone', 'shippingAddress',
  'detailAddress', 'specialReq', 'applicant', 'remark',
] as const;
const DELIVERY_DATE = new Set(['expectedPaymentDate', 'deliveryDate', 'applyDate']);

const toDate = (v: any) => (v && v !== '' ? new Date(v) : null);

function buildDeliveryData(body: any, isUpdate: boolean) {
  const data: any = {};
  for (const f of DELIVERY_FIELDS) {
    if (isUpdate && body[f] === undefined) continue;
    data[f] = body[f] ?? null;
  }
  for (const f of DELIVERY_DATE) {
    if (isUpdate && body[f] === undefined) continue;
    data[f] = toDate(body[f]);
  }
  return data;
}

export const createDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    if (!body.customerId) {
      return res.status(400).json({ code: 400, message: '客户ID不能为空', data: null });
    }
    const data: any = { customerId: body.customerId, ...buildDeliveryData(body, false) };
    const delivery = await prisma.delivery.create({
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.status(201).json({ code: 0, message: '创建成功', data: delivery });
  } catch (error) {
    next(error);
  }
};

export const updateDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.delivery.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ code: 404, message: '发货记录不存在', data: null });
    const data = buildDeliveryData(req.body || {}, true);
    const delivery = await prisma.delivery.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.json({ code: 0, message: '更新成功', data: delivery });
  } catch (error) {
    next(error);
  }
};
