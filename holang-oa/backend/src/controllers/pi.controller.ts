// ============================================================
// Pi Controller —— 批次1-B D2 (外销 PI · 分层)
// 仅接参 / 返响应；业务经 pi.service；写经 Repository（门禁规则1/2）。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { toServiceContext } from '../utils/ctx';
import * as piService from '../services/pi.service';

const createPiSchema = z.object({
  piNo: z.string().min(1, 'PI 编号不能为空').optional(),
  customerId: z.string().min(1, '客户ID不能为空'),
  quoteRef: z.string().min(1, '必须关联报价单').optional(),
  amount: z.number().min(0, '金额不能为负数').optional(),
  currency: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  customerContactId: z.string().optional(),
});

const updatePiSchema = z.object({ status: z.string().min(1) });

export const getPis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const result = await piService.listPis(
      {
        search: q.search,
        status: q.status,
        customerId: q.customerId,
        quoteRef: q.quoteRef,
        salesType: q.salesType,
        skip: q.page ? (parseInt(q.page) - 1) * (parseInt(q.pageSize) || 20) : 0,
        take: parseInt(q.pageSize) || 20,
      },
      toServiceContext(req)
    );
    res.json(paginated(result.list, parseInt(q.page) || 1, parseInt(q.pageSize) || 20, result.total, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const getPiById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pi = await piService.getPi(req.params.id, toServiceContext(req));
    res.json(success(pi, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const createPi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createPiSchema.parse(req.body);
    const pi = await piService.createPi(validated, toServiceContext(req));
    res.status(201).json(success(pi, 'PI 生成成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

/** 确认 PI：DRAFT → CONFIRMED */
export const confirmPi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pi = await piService.confirmPi(req.params.id, toServiceContext(req));
    res.json(success(pi, 'PI 已确认', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const updatePi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updatePiSchema.parse(req.body);
    const pi = await piService.updatePi(req.params.id, validated.status, toServiceContext(req));
    res.json(success(pi, '更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const deletePi = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await piService.deletePi(req.params.id, toServiceContext(req));
    res.json(success(result, '删除成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};
