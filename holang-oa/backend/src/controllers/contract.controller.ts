// ============================================================
// Contract Controller —— 批次1-B D1/D3 (内销商务合同 · 分层)
// 仅接参 / 返响应；业务经 contract.service；写经 Repository（门禁规则1/2）。
// 去除了旧版 new PrismaClient() / as any；统一 zod 入参 + 统一响应(utils/response)。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { toServiceContext } from '../utils/ctx';
import * as contractService from '../services/contract.service';

const createContractSchema = z.object({
  contractNumber: z.string().min(1, '合同编号不能为空').optional(),
  customerId: z.string().min(1, '客户ID不能为空'),
  quoteRef: z.string().min(1, '必须关联报价单').optional(),
  opportunityRef: z.string().optional(),
  piRef: z.string().optional(),
  amount: z.number().min(0, '金额不能为负数').optional(),
  signedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.string().optional(),
  filePath: z.string().optional(),
  notes: z.string().optional(),
});

const updateContractSchema = z.object({
  amount: z.number().min(0).optional(),
  signedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.string().optional(),
  filePath: z.string().optional(),
  notes: z.string().optional(),
});

export const getContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const result = await contractService.listContracts(
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

export const getContractById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contract = await contractService.getContract(req.params.id, toServiceContext(req));
    res.json(success(contract, '获取成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const createContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createContractSchema.parse(req.body);
    const contract = await contractService.createContract(validated, toServiceContext(req));
    res.status(201).json(success(contract, '创建成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

/** 确认合同（签署）：DRAFT → CONFIRMED */
export const confirmContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contract = await contractService.confirmContract(req.params.id, toServiceContext(req));
    res.json(success(contract, '合同已确认', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const updateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateContractSchema.partial().parse(req.body);
    const contract = await contractService.updateContract(req.params.id, validated, toServiceContext(req));
    res.json(success(contract, '更新成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};

export const deleteContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await contractService.deleteContract(req.params.id, toServiceContext(req));
    res.json(success(result, '删除成功', req.traceId ?? null));
  } catch (err) {
    next(err);
  }
};
