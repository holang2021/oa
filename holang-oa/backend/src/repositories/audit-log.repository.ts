// ============================================================
// AuditLog Repository —— 批次0 地基 (对应 D2)
// 唯一允许写 audit_logs 表的地方（Repository 层）。
// 规则：所有写经本 Repository；批量写用 $transaction 包裹。
// ============================================================
import { prisma } from '../config/database';

export type AuditAction =
  | 'WRITE' // 写操作(增删改)
  | 'EXPORT' // 批量导出/下载
  | 'CUSTOMER_ACCESS' // 客户主数据访问(读)
  | 'POOL_OP' // 公海操作
  | 'LOGIN' // 登录
  | 'SYNC' // 企微/伙伴云同步
  | 'READONLY'; // 其他只读访问

export type AuditResult = 'SUCCESS' | 'DENIED' | 'FAIL';

export interface CreateAuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entity?: string | null;
  entityId?: string | null;
  salesType?: string | null;
  result?: AuditResult;
  detail?: Record<string, unknown> | null;
  traceId?: string | null;
}

/**
 * 单条写入审计日志。
 * Repository 层独占写权限；调用方不碰 Prisma。
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const detailJson = input.detail ? JSON.stringify(input.detail) : null;
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      salesType: input.salesType ?? null,
      result: input.result ?? 'SUCCESS',
      detail: detailJson,
      traceId: input.traceId ?? null,
    },
  });
}

/**
 * 批量写入（事务保证原子性）。
 * 用于一次请求触发多条审计（如同步批量角色变更）。
 */
export async function createAuditLogsBatch(inputs: CreateAuditLogInput[]): Promise<void> {
  if (inputs.length === 0) return;
  await prisma.$transaction(
    inputs.map((input) =>
      prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity ?? null,
          entityId: input.entityId ?? null,
          salesType: input.salesType ?? null,
          result: input.result ?? 'SUCCESS',
          detail: input.detail ? JSON.stringify(input.detail) : null,
          traceId: input.traceId ?? null,
        },
      })
    )
  );
}

/** 查询审计日志（供审计只读角色查看） */
export async function listAuditLogs(opts: {
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.action) where.action = opts.action;
  if (opts.entity) where.entity = opts.entity;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}
