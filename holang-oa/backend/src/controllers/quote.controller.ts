import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { QuoteStatus } from '../constants/enums';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createQuoteSchema = z.object({
  customerId: z.string().min(1, '客户ID不能为空'),
  items: z.array(z.object({
    productId: z.string().min(1, '产品ID不能为空'),
    quantity: z.number().min(1, '数量至少为1'),
    discount: z.number().min(0).max(100).default(0),
  })).min(1, '至少添加一个产品'),
  discount: z.number().min(0).max(100).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(13),
});

/**
 * Get all quotes
 */
export const getQuotes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      search = '',
      status = '',
      customerId = '',
      salesType = '',
    } = req.query as any;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { customer: { companyName: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    // Filter by salesType (内销 INTERNAL / 外销 EXTERNAL)
    if (salesType) {
      where.salesType = salesType.toUpperCase();
    }

    // Sales can only see their own quotes
    if (req.user?.role === 'SALES') {
      where.createdById = req.user.id;
    }

    const total = await prisma.quote.count({ where });

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: quotes,
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
 * Get quote by ID
 */
export const getQuoteById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({
        code: 404,
        message: '报价单不存在',
        data: null,
      });
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new quote
 */
export const createQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createQuoteSchema.parse(req.body);

    // Generate quote number
    const quoteCount = await prisma.quote.count();
    const quoteNumber = `QT${new Date().getFullYear()}${String(quoteCount + 1).padStart(6, '0')}`;

    // Get product prices and calculate totals
    const itemsData = await Promise.all(
      validated.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`产品不存在: ${item.productId}`);
        }

        const unitPrice = product.unitPrice;
        const itemDiscount = item.discount || 0;
        const subtotal = unitPrice * item.quantity * (1 - itemDiscount / 100);

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discount: itemDiscount,
          subtotal,
        };
      })
    );

    const totalAmount = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const finalAmount = totalAmount * (1 - validated.discount / 100);

    // 取客户以确定内/外销
    const _cust = await prisma.customer.findUnique({ where: { id: validated.customerId } })

    // 计税方式：外销(EXTERNAL)统一未税(taxRate=0)；内销取传入税率，默认 13%
    const rate = _cust && (_cust.salesType || '').toUpperCase() === 'EXTERNAL' ? 0 : (validated.taxRate ?? 13)
    const amountWithoutTax = rate > 0
      ? Math.round((finalAmount / (1 + rate / 100)) * 100) / 100
      : finalAmount

    // Create quote with items
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: validated.customerId,
        salesType: _cust?.salesType ?? 'INTERNAL',
        totalAmount: finalAmount,
        amountWithoutTax,
        taxRate: rate,
        discount: validated.discount,
        validUntil: validated.validUntil ? new Date(validated.validUntil) : undefined,
        notes: validated.notes,
        createdById: req.user!.id,
        items: {
          create: itemsData,
        },
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
      },
    });

    res.status(201).json({
      code: 0,
      message: '创建成功',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quote
 */
export const updateQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { items, discount, validUntil, notes } = req.body;

    const existing = await prisma.quote.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '报价单不存在',
        data: null,
      });
    }

    if (existing.status !== QuoteStatus.DRAFT) {
      return res.status(400).json({
        code: 400,
        message: '只能编辑草稿状态的报价单',
        data: null,
      });
    }

    // TODO: Update items and recalculate total
    // For simplicity, delete old items and create new ones

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(discount !== undefined && { discount }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        items: { include: { product: true } },
      },
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quote
 */
export const deleteQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.quote.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '报价单不存在',
        data: null,
      });
    }

    if (existing.status !== QuoteStatus.DRAFT) {
      return res.status(400).json({
        code: 400,
        message: '只能删除草稿状态的报价单',
        data: null,
      });
    }

    await prisma.quote.delete({
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
 * Update quote status
 */
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const quote = await prisma.quote.update({
      where: { id },
      data: { status },
      include: {
        customer: { select: { id: true, companyName: true } },
        items: { include: { product: true } },
      },
    });

    res.json({
      code: 0,
      message: '状态更新成功',
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview quote (HTML)
 */
export const previewQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({
        code: 404,
        message: '报价单不存在',
        data: null,
      });
    }

    // 计税信息
    const isExport = (quote.salesType || '').toUpperCase() === 'EXTERNAL'
    const rate = quote.taxRate ?? 0
    const taxExcluded = quote.amountWithoutTax
      ?? (rate > 0 ? Math.round((quote.totalAmount / (1 + rate / 100)) * 100) / 100 : quote.totalAmount)
    const isTaxFree = isExport || rate === 0

    // Generate HTML preview
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>报价单 ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; }
        .quote-title { font-size: 20px; margin-top: 10px; }
        .info-table { width: 100%; margin-bottom: 30px; }
        .info-table td { padding: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        .total-row { font-weight: bold; font-size: 16px; }
        .footer { margin-top: 50px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">HOLANG</div>
        <div class="quote-title">报价单</div>
      </div>
      
      <table class="info-table">
        <tr>
          <td><strong>报价单号：</strong>${quote.quoteNumber}</td>
          <td><strong>报价日期：</strong>${new Date(quote.createdAt).toLocaleDateString('zh-CN')}</td>
        </tr>
        <tr>
          <td><strong>客户名称：</strong>${quote.customer.companyName}</td>
          <td><strong>有效期至：</strong>${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('zh-CN') : '长期有效'}</td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>产品名称</th>
            <th>型号</th>
            <th>单价</th>
            <th>数量</th>
            <th>折扣(%)</th>
            <th>小计</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map((item: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.product.name}</td>
              <td>${item.product.model || '-'}</td>
              <td>¥${item.unitPrice.toFixed(2)}</td>
              <td>${item.quantity}</td>
              <td>${item.discount}</td>
              <td>¥${item.subtotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          ${isTaxFree ? `
          <tr class="total-row">
            <td colspan="6" style="text-align: right;"><strong>未税金额：</strong></td>
            <td><strong>¥${taxExcluded.toFixed(2)}</strong></td>
          </tr>
          <tr>
            <td colspan="7" style="text-align:right;color:#888;font-size:12px;">* 外销报价为未税价格</td>
          </tr>
          ` : `
          <tr class="total-row">
            <td colspan="6" style="text-align: right;"><strong>未税金额：</strong></td>
            <td><strong>¥${taxExcluded.toFixed(2)}</strong></td>
          </tr>
          <tr class="total-row">
            <td colspan="6" style="text-align: right;"><strong>含税金额（增值税 ${rate}%）：</strong></td>
            <td><strong>¥${quote.totalAmount.toFixed(2)}</strong></td>
          </tr>
          `}
        </tfoot>
      </table>

      ${quote.notes ? `<div style="margin-top: 30px;"><strong>备注：</strong>${quote.notes}</div>` : ''}

      <div class="footer">
        <p>感谢您的信任与支持！</p>
        <p>联系电话：XXX-XXXXXXXX | 邮箱：XXX@holang.com</p>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * Download quote as PDF
 */
export const downloadPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // TODO: Generate PDF using puppeteer
    // For now, return HTML preview
    await previewQuote(req, res, next);
  } catch (error) {
    next(error);
  }
};
