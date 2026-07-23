// ============================================================
// Quote Controller —— 批次1-A D3 (报价从0激活 · 分层)
// 仅接参 / 返响应；业务经 quote.service；写经 Repository（门禁规则1/2）。
// 预览/PDF 的 HTML 渲染保留在控制器（视图层），数据取自 service。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { toServiceContext } from '../utils/ctx';
import * as quoteService from '../services/quote.service';

const createQuoteSchema = z.object({
  customerId: z.string().min(1, '客户ID不能为空'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, '产品ID不能为空'),
        quantity: z.number().min(1, '数量至少为1'),
        discount: z.number().min(0).max(100).default(0),
      })
    )
    .min(1, '至少添加一个产品'),
  discount: z.number().min(0).max(100).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(13),
});

export const getQuotes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const ctx = toServiceContext(req);
    const result = await quoteService.listQuotes(
      {
        search: q.search,
        status: q.status,
        customerId: q.customerId,
        salesType: q.salesType,
        createdById: q.createdById,
        skip: q.page ? (parseInt(q.page) - 1) * (parseInt(q.pageSize) || 20) : 0,
        take: parseInt(q.pageSize) || 20,
      },
      ctx
    );
    res.json(paginated(result.list, parseInt(q.page) || 1, parseInt(q.pageSize) || 20, result.total, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const getQuoteById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quote = await quoteService.getQuote(req.params.id, toServiceContext(req));
    res.json(success(quote, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const createQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createQuoteSchema.parse(req.body);
    const quote = await quoteService.createQuote(validated, toServiceContext(req));
    res.status(201).json(success(quote, '创建成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status || typeof status !== 'string') throw new z.ZodError([]);
    const updated = await quoteService.updateQuoteStatus(req.params.id, status, toServiceContext(req));
    res.json(success(updated, '状态更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

const updateQuoteSchema = z.object({
  discount: z.number().min(0).max(100).optional(),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export const updateQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateQuoteSchema.parse(req.body);
    const updated = await quoteService.updateQuote(req.params.id, validated, toServiceContext(req));
    res.json(success(updated, '更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const deleteQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await quoteService.deleteQuote(req.params.id, toServiceContext(req));
    res.json(success(result, '删除成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

/** 预览报价单 HTML（视图层；数据取自 service，域强制） */
export const previewQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quote = await quoteService.getQuote(req.params.id, toServiceContext(req));
    const isExport = (quote.salesType || '').toUpperCase() === 'EXTERNAL';
    const rate = quote.taxRate ?? 0;
    const taxExcluded =
      quote.amountWithoutTax ??
      (rate > 0 ? Math.round((quote.totalAmount / (1 + rate / 100)) * 100) / 100 : quote.totalAmount);
    const isTaxFree = isExport || rate === 0;

    const rows = (quote.items || [])
      .map(
        (item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product?.name ?? '-'}</td>
          <td>${item.product?.model || '-'}</td>
          <td>¥${Number(item.unitPrice).toFixed(2)}</td>
          <td>${item.quantity}</td>
          <td>${item.discount}</td>
          <td>¥${Number(item.subtotal).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const taxBlock = isTaxFree
      ? `<tr class="total-row"><td colspan="6" style="text-align:right;"><strong>未税金额：</strong></td><td><strong>¥${taxExcluded.toFixed(2)}</strong></td></tr>
         <tr><td colspan="7" style="text-align:right;color:#888;font-size:12px;">* 外销报价为未税价格</td></tr>`
      : `<tr class="total-row"><td colspan="6" style="text-align:right;"><strong>未税金额：</strong></td><td><strong>¥${taxExcluded.toFixed(2)}</strong></td></tr>
         <tr class="total-row"><td colspan="6" style="text-align:right;"><strong>含税金额（增值税 ${rate}%）：</strong></td><td><strong>¥${quote.totalAmount.toFixed(2)}</strong></td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>报价单 ${quote.quoteNumber}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px}.header{text-align:center;margin-bottom:40px}
      .company-name{font-size:24px;font-weight:bold}.quote-title{font-size:20px;margin-top:10px}
      table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:12px;text-align:left}
      th{background-color:#f5f5f5}.total-row{font-weight:bold;font-size:16px}
      .footer{margin-top:50px;text-align:center;color:#666}</style></head><body>
      <div class="header"><div class="company-name">HOLANG</div><div class="quote-title">报价单</div></div>
      <table><tr><td><strong>报价单号：</strong>${quote.quoteNumber}</td><td><strong>报价日期：</strong>${new Date(quote.createdAt).toLocaleDateString('zh-CN')}</td></tr>
      <tr><td><strong>客户名称：</strong>${quote.customer?.companyName ?? '-'}</td><td><strong>有效期至：</strong>${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('zh-CN') : '长期有效'}</td></tr></table>
      <table><thead><tr><th>序号</th><th>产品名称</th><th>型号</th><th>单价</th><th>数量</th><th>折扣(%)</th><th>小计</th></tr></thead><tbody>${rows}</tbody><tfoot>${taxBlock}</tfoot></table>
      ${quote.notes ? `<div style="margin-top:30px;"><strong>备注：</strong>${quote.notes}</div>` : ''}
      <div class="footer"><p>感谢您的信任与支持！</p></div></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
};

export const downloadPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await previewQuote(req, res, next);
  } catch (err) {
    next(err);
  }
};
