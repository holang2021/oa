// ============================================================
// 请求上下文中间件 —— 批次0 地基
// 为每个请求生成 traceId，贯穿 error / audit / 日志，便于链路追踪。
// 挂载于最早位置，保证所有请求(含未认证)都有 traceId。
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestContext = (req: Request, _res: Response, next: NextFunction) => {
  const incoming = req.headers['x-trace-id'];
  req.traceId =
    (typeof incoming === 'string' && incoming) || (Array.isArray(incoming) ? incoming[0] : randomUUID());
  next();
};
