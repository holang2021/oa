import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { assertContractConfirmed, assertPiConfirmed } from '../services/deal-flow.service';
import { createAuditLog } from '../repositories/audit-log.repository';

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
    } = req.query as Record<string, string>;

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
        customer: { select: { id: true, companyName: true, country: true } },
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
        customer: { select: { id: true, companyName: true, country: true } },
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
  'quotationId', 'opportunityId', 'contractId', 'piId',
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
    if (f === 'customerId') continue;
    const v = body[f];
    // 未提供的字段跳过：创建时由 DB 默认值/约束决定（避免对 status 等非空列写入 null）；更新时保持不变
    if (v === undefined) continue;
    if (ORDER_DATE.has(f)) data[f] = toDate(v);
    else if (ORDER_NUM.has(f)) data[f] = toNum(v, f === 'amount' ? 0 : null);
    else data[f] = v;
  }
  return data;
}

/** 取下一个订单号（OR + 年 + 6位序号，基于当前计数，与 quote/contract/customer 同构） */
async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  return `OR${year}${String(count + 1).padStart(6, '0')}`;
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

    // 闭环校验：合同/PI 确认后才可建订单（D1 状态机）
    if (data.salesType === 'INTERNAL') {
      if (!body.contractId) {
        throw new AppError('内销订单必须关联一份已确认的内销商务合同(contractId)', 400);
      }
      const contract = await prisma.contract.findUnique({ where: { id: body.contractId } });
      assertContractConfirmed(contract);
    } else if (data.salesType === 'EXTERNAL') {
      if (!body.piId) {
        throw new AppError('外销订单必须关联一份已确认的外销 PI(piId)', 400);
      }
      const pi = await prisma.pi.findUnique({ where: { id: body.piId } });
      assertPiConfirmed(pi);
    }

    // 订单编号后端统一生成：前端未传(留空)则自动编码 OR+year+6位；用户显式手填则保留
    if (!data.orderCode) {
      data.orderCode = await nextOrderNumber();
    }

    const order = await prisma.order.create({
      data,
      include: {
        customer: { select: { id: true, companyName: true, country: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });

    // P0-2 修复：商机→订单交接留痕（结构化关联已落库 order.opportunityId）
    // 仅当由商机转入（opportunityId 存在）时写审计+跟进；失败不阻断主流程
    if (order.opportunityId) {
      try {
        await createAuditLog({
          userId: req.user?.id ?? null,
          action: 'WRITE',
          entity: 'orders',
          entityId: order.id,
          salesType: order.salesType ?? null,
          result: 'SUCCESS',
          detail: {
            handoffFromOpportunity: true,
            opportunityId: order.opportunityId,
            customerId: order.customerId,
            orderCode: order.orderCode,
          },
          traceId: req.traceId ?? null,
        });
        const opp = await prisma.opportunity.findUnique({
          where: { id: order.opportunityId },
          select: { name: true },
        });
        await prisma.followUp.create({
          data: {
            customerId: order.customerId,
            userId: order.salesOwnerId ?? req.user?.id ?? null,
            method: 'SYSTEM',
            content: `【系统交接】订单「${order.orderCode}」由商机「${opp?.name || order.opportunityId}」转入。`,
            operator: req.user?.name ?? null,
            followedAt: new Date(),
          },
        });
      } catch (e) {
        console.warn('交接留痕失败(不阻断订单创建):', e);
      }
    }

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
        customer: { select: { id: true, companyName: true, country: true } },
        salesOwner: { select: { id: true, name: true } },
      },
    });
    res.json({ code: 0, message: '更新成功', data: order });
  } catch (error) {
    next(error);
  }
};
