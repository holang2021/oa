// 批次1-A：从认证请求提取 ServiceContext（Service 不碰 req/res，仅消费此上下文）。
import type { AuthRequest } from '../middleware/auth';
import type { ServiceContext } from '../services/types';

export function toServiceContext(req: AuthRequest): ServiceContext {
  return {
    userId: req.user.id,
    scope: req.user.salesType, // 已由 auth 中间件派生：INTERNAL / EXTERNAL / ALL
    role: req.user.role,
    traceId: req.traceId ?? null,
  };
}
