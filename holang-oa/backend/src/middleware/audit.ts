// ============================================================
// 统一审计中间件 —— 批次0 地基 (对应 D2)
// 全局挂载：自动记录 写操作 / 导出 / 公海操作 / 客户主数据访问。
// 业务代码不散落打点；审计写在响应完成后异步落库（不阻塞请求）。
// AI/数字员工动作同样落 audit_log（H-3）。
// ============================================================
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { createAuditLog, AuditAction, AuditResult } from '../repositories/audit-log.repository';
import { resolveRole, deriveSalesType } from '../constants/roles';
import { logger } from '../utils/logger';

/** 由请求路径推导被操作的对象类型（entity） */
function deriveEntity(pathname: string): string | null {
  const m = pathname.match(/\/api\/v1\/([a-z-]+)/i);
  if (!m) return null;
  return m[1].replace(/-/g, '_');
}

/** 由 method + path 分类审计动作 */
function classifyAction(method: string, pathname: string): AuditAction | null {
  const p = pathname.toLowerCase();

  if (/\/export\b|\/excel\b|\/template\b|\/download\b|\.pdf$/.test(p)) {
    return 'EXPORT';
  }
  if (/\/pool\b/.test(p)) {
    return 'POOL_OP';
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    return 'WRITE';
  }
  if (/\/customers\b|\/customer\b/.test(p)) {
    return 'CUSTOMER_ACCESS';
  }
  if (method.toUpperCase() === 'GET') {
    return 'READONLY';
  }
  return null;
}

/**
 * 统一审计中间件。
 * 挂载于路由之前：仅登记「响应完成」回调，真正的用户/动作判断延后到
 * 此时——因为 authenticate 在路由内部运行，req.user 在 finish 时才确定。
 */
export const auditMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 非 API 路径不审计（健康检查/静态资源等）
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const action = classifyAction(req.method, req.originalUrl || req.path);
  if (!action) {
    return next();
  }

  // 登记响应完成回调，此时 req.user 已由路由内 authenticate 注入
  res.on('finish', () => {
    if (!req.user) return; // 未认证请求不审计

    const userId = req.user.id;
    const role = resolveRole(req.user.role);
    const salesType = deriveSalesType(role);
    const entity = deriveEntity(req.originalUrl || req.path);
    const traceId = req.traceId;
    const method = req.method;
    const path = req.originalUrl;
    const status = res.statusCode;
    const result: AuditResult = status === 403 ? 'DENIED' : status >= 400 ? 'FAIL' : 'SUCCESS';

    createAuditLog({
      userId,
      action,
      entity,
      entityId: undefined,
      salesType,
      result,
      detail: { method, path, status },
      traceId,
    }).catch((err) => {
      logger.error({ traceId, err: (err as Error).message }, 'audit_log write failed');
    });
  });

  next();
};
