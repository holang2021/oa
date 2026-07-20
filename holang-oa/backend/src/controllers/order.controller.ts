import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get all orders with pagination and search
 */
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        { orderCode: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Filter by businessLine (内销 INDUSTRIAL / 外销 RETAIL)
    if (businessLine) {
      where.businessLine = businessLine;
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    // Filter by customerId
    if (customerId) {
      where.customerId = customerId;
    }

    const total = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        salesOwner: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: orders,
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
 * Get order by ID
 */
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true } },
        salesOwner: { select: { id: true, name: true } },
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: order });
  } catch (error) {
    next(error);
  }
};

const ORDER_FIELDS = [
  'orderCode', 'customerId', 'orderDate', 'status', 'businessLine', 'salesPerson', 'salesOwnerId',
  'salesMode', 'contractEntity', 'productType', 'endUser', 'amount', 'amountOriginal', 'amountWithoutTax',
  'totalCost', 'discount', 'discountRate', 'taxRate', 'collectedAmount', 'invoicedAmount', 'grossMargin',
  'unpaidAmount', 'expectedDeliveryDate', 'deliveryDate', 'receiver', 'receiverPhone', 'receiverAddress',
  'approvalStatus', 'flowStatus', 'paymentMethod', 'notes', 'specialReq', 'techAgreement', 'contractFile',
  'quotationId', 'opportunityId',
] as const;
const ORDER_DATE = new Set(['orderDate', 'expectedDeliveryDate', 'deliveryDate']);
const ORDER_NUM = new Set([
  'amount', 'amountOriginal', 'amountWithoutTax', 'totalCost', 'discount', 'discountRate',
  'taxRate', 'collectedAmount', 'invoicedAmount', 'grossMargin', 'unpaidAmount',
]);
const toDate = (v: any) => (v && v !== '' ? new Date(v) : null);
const toNum = (v: any, fallback: number | null) =>
  v === '' || v === undefined || v === null ? fallback : Number(v);

function buildOrderData(body: any, isUpdate: boolean) {
  const data: any = {};
  for (const f of ORDER_FIELDS) {
    if (isUpdate && body[f] === undefined) continue;
    if (f === 'customerId') continue;
    const v = body[f];
    if (ORDER_DATE.has(f)) data[f] = toDate(v);
    else if (ORDER_NUM.has(f)) data[f] = toNum(v, f === 'amount' ? 0 : null);
    else data[f] = v ?? null;
  }
  return data;
}

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    if (!body.customerId) {
      return res.status(400).json({ code: 400, message: '客户ID不能为空', data: null });
    }
    const data: any = { customerId: body.customerId, ...buildOrderData(body, false) };
    const _cust = await prisma.customer.findUnique({ where: { id: body.customerId } });
    data.salesType = _cust?.salesType ?? 'INTERNAL';
    const order = await prisma.order.create({
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ code: 0, message: '创建成功', data: order });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ code: 404, message: '订单不存在', data: null });
    }
    const data = buildOrderData(body, true);
    const _cust = await prisma.customer.findUnique({ where: { id: existing.customerId } });
    data.salesType = _cust?.salesType ?? existing.salesType ?? 'INTERNAL';
    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });
    res.json({ code: 0, message: '更新成功', data: order });
  } catch (error) {
    next(error);
  }
};
