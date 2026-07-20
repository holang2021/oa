import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get all invoices with pagination, search and businessLine filter
 */
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        { invoiceNumber: { contains: search } },
        { title: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (status) {
      where.approvalStatus = status;
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

    const total = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
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
        list: invoices,
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
 * Get invoice by ID
 */
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true, businessLine: true } },
        order: { select: { id: true, orderCode: true, businessLine: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ code: 404, message: '开票记录不存在', data: null });
    }

    res.json({ code: 0, message: '获取成功', data: invoice });
  } catch (error) {
    next(error);
  }
};

const INVOICE_FIELDS = [
  'orderId', 'salesPerson', 'orderStatus', 'productType', 'invoiceType',
  'contractEntityId', 'title', 'creditCode', 'companyAddress', 'companyPhone',
  'bankName', 'bankAccount', 'bankCode', 'billingInfo', 'recipient', 'recipientPhone',
  'detailAddress', 'invoiceNumber', 'invoiceFile', 'invoiceScan', 'approvalStatus',
  'flowStatus', 'remark',
] as const;
const INVOICE_DATE = new Set(['applyDate']);
const INVOICE_NUM = new Set(['amount', 'ratio']);

const toDate = (v: any) => (v && v !== '' ? new Date(v) : null);
const toNum = (v: any, fallback: number | null) =>
  v === '' || v === undefined || v === null ? fallback : Number(v);

function buildInvoiceData(body: any, isUpdate: boolean) {
  const data: any = {};
  for (const f of INVOICE_FIELDS) {
    if (isUpdate && body[f] === undefined) continue;
    data[f] = body[f] ?? null;
  }
  for (const f of INVOICE_DATE) {
    if (isUpdate && body[f] === undefined) continue;
    data[f] = toDate(body[f]);
  }
  for (const f of INVOICE_NUM) {
    if (isUpdate && body[f] === undefined) continue;
    data[f] = toNum(body[f], null);
  }
  return data;
}

export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    if (!body.customerId) {
      return res.status(400).json({ code: 400, message: '客户ID不能为空', data: null });
    }
    const data: any = { customerId: body.customerId, ...buildInvoiceData(body, false) };
    const invoice = await prisma.invoice.create({
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.status(201).json({ code: 0, message: '创建成功', data: invoice });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ code: 404, message: '开票记录不存在', data: null });
    const data = buildInvoiceData(req.body || {}, true);
    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true } },
        order: { select: { id: true, orderCode: true } },
      },
    });
    res.json({ code: 0, message: '更新成功', data: invoice });
  } catch (error) {
    next(error);
  }
};
