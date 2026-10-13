// ============================================================
// Opportunity Controller —— 批次1-A D3 (商机从0激活 · 分层)
// 仅接参 / 返响应；业务经 opportunity.service；写经 Repository（门禁规则1/2）。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { toServiceContext } from '../utils/ctx';
import * as oppService from '../services/opportunity.service';

const createOpportunitySchema = z.object({
  name: z.string().min(1, '机会名称不能为空'),
  customerId: z.string().min(1, '客户ID不能为空'),
  productId: z.string().optional(),
  productIntentIds: z.array(z.string()).optional(),
  expectedAmount: z.number().min(0, '预计金额不能为负数'),
  winProbability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  stage: z.string().default('INITIAL_CONTACT'),
  description: z.string().optional(),
  competitorInfo: z.string().max(4000, '竞品信息不能超过4000字').optional(),
  customerContactId: z.string().optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial();

export const getOpportunities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const ctx = toServiceContext(req);
    const result = await oppService.listOpportunities(
      {
        search: q.search,
        stage: q.stage,
        customerId: q.customerId,
        salesOwnerId: q.salesOwnerId,
        salesType: q.salesType,
        sortBy: q.sortBy || 'createdAt',
        sortOrder: (q.sortOrder as 'asc' | 'desc') || 'desc',
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

export const getOpportunityById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const opp = await oppService.getOpportunity(req.params.id, toServiceContext(req));
    res.json(success(opp, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const createOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createOpportunitySchema.parse(req.body);
    const opp = await oppService.createOpportunity(validated, toServiceContext(req));
    res.status(201).json(success(opp, '创建成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const updateOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateOpportunitySchema.parse(req.body);
    const updated = await oppService.updateOpportunity(req.params.id, validated, toServiceContext(req));
    res.json(success(updated, '更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const updateStage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.body;
    if (!stage) throw new z.ZodError([]);
    const updated = await oppService.updateOpportunity(req.params.id, { stage }, toServiceContext(req));
    res.json(success(updated, '阶段更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const deleteOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await oppService.deleteOpportunity(req.params.id, toServiceContext(req));
    res.json(success(result, '删除成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const getFunnelData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const data = await oppService.getFunnel(toServiceContext(req), q.salesOwnerId);
    res.json(success(data, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const getForecastData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const data = await oppService.getForecast(toServiceContext(req), q.salesOwnerId);
    res.json(success(data, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

// ── D2 公海 ──
export const listPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const result = await oppService.listPool(toServiceContext(req), {
      search: q.search,
      skip: q.page ? (parseInt(q.page) - 1) * (parseInt(q.pageSize) || 20) : 0,
      take: parseInt(q.pageSize) || 20,
    });
    res.json(paginated(result.list, parseInt(q.page) || 1, parseInt(q.pageSize) || 20, result.total, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const claimOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await oppService.claimOpportunityPool(req.params.id, toServiceContext(req));
    res.json(success(updated, '认领成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const returnOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await oppService.returnOpportunityPool(req.params.id, toServiceContext(req));
    res.json(success(updated, '已退回公海', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};
