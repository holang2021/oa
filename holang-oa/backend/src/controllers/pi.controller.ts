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

// 商品明细行（Commercial Item）：一张 PI 可含设备/外购/配件/运杂/安装/服务，
// 不为每种建结构；每行统一表达 品名描述 / HS Code / 数量 / 单位 / 单价 / 金额（LOCKED 总纲第7条）。
const piItemSchema = z.object({
  hsCode: z.string().optional().default(''),
  name: z.string().optional().default(''),
  qty: z.number().min(0).optional().default(0),
  unit: z.string().optional().default(''),
  price: z.number().min(0).optional().default(0),
  amount: z.number().min(0).optional().default(0),
});

// zod 的 .default() 会让推断出的输入类型字段全为可选；显式归一化为业务层需要的完整行项，
// 同时兜底空值，避免脏数据写进 items_json。
type RawPiItem = { hsCode?: string; name?: string; qty?: number; unit?: string; price?: number; amount?: number };
function normalizeItems(items: RawPiItem[] | undefined) {
  if (items === undefined) return undefined;
  return items.map(it => ({
    hsCode: it.hsCode ?? '',
    name: it.name ?? '',
    qty: it.qty ?? 0,
    unit: it.unit ?? '',
    price: it.price ?? 0,
    amount: it.amount ?? 0,
  }));
}

const createPiSchema = z.object({
  piNo: z.string().min(1, 'PI 编号不能为空').optional(),
  customerId: z.string().min(1, '客户ID不能为空'),
  quoteRef: z.string().min(1, '关联报价单 ID 不能为空').optional(),
  amount: z.number().min(0, '金额不能为负数').optional(),
  currency: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  customerContactId: z.string().optional(),
  items: z.array(piItemSchema).max(100, '单张 PI 明细最多 100 行').optional(),
});

// 复用既有 PUT /pi/:id，不新增端点：状态、金额、币种、备注、明细都可更新。
const updatePiSchema = z.object({
  status: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(piItemSchema).max(100, '单张 PI 明细最多 100 行').optional(),
});

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
    const pi = await piService.createPi({ ...validated, items: normalizeItems(validated.items) }, toServiceContext(req));
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
    const pi = await piService.updatePi(req.params.id, { ...validated, items: normalizeItems(validated.items) }, toServiceContext(req));
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
