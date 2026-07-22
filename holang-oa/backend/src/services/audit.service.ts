// ============================================================
// 审计查询服务 —— 批次0 地基
// 仅做查询，落库统一走 audit 中间件 / audit-log.repository。
// ============================================================
import { listAuditLogs } from '../repositories/audit-log.repository';

export function queryAuditLogs(opts: {
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}) {
  return listAuditLogs(opts);
}
