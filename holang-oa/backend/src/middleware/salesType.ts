// ============================================================
// 销售域隔离中间件 —— 批次0 地基 (对应 D1/D4, 复用 Phase1 B1)
// 服务端强制域隔离：由 req.user.salesType 推导，非全域角色仅能访问其负责域。
// 约定：客户主数据 / 商机 / 公海 接口必须挂载本中间件。
// 本批次只立约定 + 鉴权透传，不实现三端 UI（D4）。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { deriveSalesType, resolveRole, SalesType } from '../constants/roles';

// 在 Express Request 上挂 scope，供下游控制器/服务读取
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 服务端推导的销售域范围：INTERNAL / EXTERNAL / ALL */
      scope?: { salesType: SalesType };
    }
  }
}

/**
 * 强制销售域隔离。
 * - 全域角色(ADMIN/FINANCE/AFTER_SALES/READONLY_AUDIT)：不限制。
 * - 内/外销角色：在 req.query.salesType 注入其域（下游已支持 salesType 过滤的
 *   控制器将自动只返回同域数据），并写入 req.scope 供服务层判断。
 */
export const enforceSalesTypeScope = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next();
  }

  const role = resolveRole(req.user.role);
  const salesType = deriveSalesType(role);
  req.scope = { salesType };

  // 服务端强制域：非全域用户，下游查询必须限定域
  if (salesType !== 'ALL' && !req.query.salesType) {
    req.query.salesType = salesType;
  }

  next();
};

/** 便捷：读取当前请求的域范围（无则返回 ALL） */
export function currentScope(req: Request): SalesType {
  return req.scope?.salesType ?? 'ALL';
}
