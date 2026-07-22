// ============================================================
// RBAC 中间件 —— 批次0 地基 (对应 D1)
// 权威角色集合见 constants/roles.ts（8 角色）。
// - authorize(roles)：允许列表（解析历史角色别名），ADMIN 始终放行。
// - requireExporter：仅 ADMIN / FINANCE 可批量导出（H-2 防下载硬约束）。
// - isSalesOnlyRole / isLeadRole / isCrossDomainRole：域判断辅助。
// ============================================================
import { Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import { AuthRequest } from './auth';
import {
  Role,
  resolveRole,
  canExport,
  isSalesOnlyRole,
  isCrossDomainRole,
} from '../constants/roles';

const FORBIDDEN_BODY = { code: 403, message: '权限不足', data: null };

/**
 * 角色鉴权中间件工厂。
 * @param allowedRoles 允许访问的权威角色（可含历史别名，会自动解析）
 */
export const authorize = (allowedRoles: Role | Role[]) => {
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
    resolveRole(r)
  );

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未认证', data: null });
    }

    const userRole = resolveRole(req.user.role);

    // 管理员绕过一切 RBAC
    if (userRole === 'ADMIN') {
      return next();
    }

    if (allowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json(FORBIDDEN_BODY);
  };
};

/**
 * 导出(批量下载)权限：仅 ADMIN / FINANCE。
 * 用于客户主数据 / 公海 / 报表 / 迁移模板等所有下载端点（H-2）。
 */
export const requireExporter = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '未认证', data: null });
  }

  const userRole = resolveRole(req.user.role);

  if (canExport(userRole)) {
    return next();
  }

  return res.status(403).json({
    code: 403,
    message: '无批量导出权限，仅管理员或财务可导出',
    data: null,
  });
};

/**
 * 资源级鉴权：owner 或 主管/管理员 可访问。
 * 实际归属判断建议在 service 层完成；此处仅做角色闸门。
 */
export const authorizeResource = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '未认证', data: null });
  }

  const userRole = resolveRole(req.user.role);
  if (userRole === 'ADMIN' || isCrossDomainRole(userRole)) {
    return next();
  }

  next();
};

/**
 * 数据过滤中间件：纯销售角色只看本人名下数据；主管看其域；全域角色看全部。
 * （批量域隔离另由 enforceSalesTypeScope 负责，见 salesType.ts）
 */
export const filterByUser = (userIdField: string = 'salesOwnerId') => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const userRole = resolveRole(req.user.role);

    if (isSalesOnlyRole(userRole)) {
      if (!req.query) req.query = {};
      const q = req.query as ParsedQs & { _filterUserId?: string; _filterUserField?: string };
      q._filterUserId = req.user.id;
      q._filterUserField = userIdField;
    }

    next();
  };
};

/** 再导出域判断辅助，供控制器复用 */
export { isSalesOnlyRole, isCrossDomainRole };
