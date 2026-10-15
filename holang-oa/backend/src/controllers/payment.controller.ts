import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { assertOrderConfirmed } from '../services/deal-flow.service';

const prisma = new PrismaClient();

/**
 * Get all payments with pagination, search and businessLine filter
 */
export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      businessLine = '',
      customerId = '',
      salesType = '',
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { paymentCode: { contains: search } },
        { customer: { companyName: { contains: search } } },
        { payerAccount: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Filter by businessLine via related order (内销 INDUSTRIAL / 外销 RETAIL)
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

    const total = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
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
        list: payments,
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
 * Get payment by ID
 */
export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true, businessLine: true } },
        order: { select: { id: true, orderCode: true, businessLine: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ code: 404, message: '回款记录不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: payment });
  } catch (error) {
    next(error);
  }
};

const PAYMENT_FIELDS = [
  'paymentCode', 'orderId', 'type', 'status', 'paymentMethod', 'payerAccount',
  'customerAccount', 'confirmedFinance', 'invoiceConfirm', 'applicantId',
  'flowStatus', 'voucher', 'remark',
] as const;
const PAYMENT_DATE = new Set(['plannedDate', 'receivedDate', 'confirmedFinanceDate', 'applyDate']);
const PAYMENT_NUM = new Set(['amount', 'paymentRatio']);

const toDate = (v: any) => (v && v !== '' ? new Date(v) : null);
const toNum = (v: any, fallback: number | null) =>
  v === '' || v === undefined || v === null ? fallback : Number(v);

function buildPaymentData(body: any, isUpdate: boolean) {
  const data: any = {};
  // 未提供的字段跳过：创建时由 DB 默认值/约束决定（避免对 status 等非空列写入 null）；更新时保持不变
  for (const f of PAYMENT_FIELDS) {
    if (body[f] === undefined) continue;
    data[f] = body[f];
  }
  for (const f of PAYMENT_DATE) {
    if (body[f] === undefined) continue;
    data[f] = toDate(body[f]);
  }
  for (const f of PAYMENT_NUM) {
    if (body[f] === undefined) continue;
    data[f] = toNum(body[f], f === 'amount' ? 0 : null);
  }
  return data;
}

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    if (!body.customerId) {
      return res.status(400).json({ code: 400, message: '客户ID不能为空', data: null });
    }
    const data: any = { customerId: body.customerId, ...buildPaymentData(body, false) };

    // 闭环校验：订单确认后处于有效履约状态才可登记回款（D1 状态机）
    if (!body.orderId) {
      throw new AppError('登记回款必须关联一份订单(orderId)', 400);
    }
    const _order = await prisma.order.findUnique({ where: { id: body.orderId } });
    assertOrderConfirmed(_order);

    const payment = await prisma.payment.create({
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.status(201).json({ code: 0, message: '创建成功', data: payment });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ code: 404, message: '回款记录不存在', data: null });
    const data = buildPaymentData(req.body || {}, true);
    const payment = await prisma.payment.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.json({ code: 0, message: '更新成功', data: payment });
  } catch (error) {
    next(error);
  }
};
