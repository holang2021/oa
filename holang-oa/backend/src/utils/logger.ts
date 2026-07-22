// ============================================================
// 结构化日志 (pino) —— 批次0 地基
// 全局统一使用本 logger，禁止散落 console.log/console.error。
// 生产环境按级别输出 JSON；本地开发可读格式。
// ============================================================
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'info' : 'warn'),
  // 结构化 JSON 输出（生产/本地一致，便于采集与 grep）
  // 始终附带服务标识，便于在集中日志中区分来源
  base: { service: 'holang-oa-backend' },
});

/**
 * 业务审计/错误日志的统一入口。
 * 自动携带 traceId（若请求上下文中存在），便于跨服务串联。
 */
export function logWithTrace(
  level: 'info' | 'warn' | 'error' | 'debug',
  traceId: string | undefined,
  msg: string,
  extra?: Record<string, unknown>
): void {
  logger[level]({ traceId, ...extra }, msg);
}
