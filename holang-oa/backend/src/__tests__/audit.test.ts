import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import {
  createAuditLog,
  listAuditLogs,
} from '../repositories/audit-log.repository';
import { queryAuditLogs } from '../services/audit.service';

describe('D2 audit repository + service（Repository 层写，Service 仅读）', () => {
  beforeAll(async () => {
    // 清理本测试产生的审计行
    await prisma.auditLog.deleteMany({ where: { userId: 'unit-audit-user' } });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: 'unit-audit-user' } });
    await prisma.$disconnect();
  });

  it('createAuditLog 写入并序列化 detail 为 JSON 字符串', async () => {
    await createAuditLog({
      userId: 'unit-audit-user',
      action: 'WRITE',
      entity: 'customers',
      entityId: 'c-1',
      salesType: 'INTERNAL',
      result: 'SUCCESS',
      detail: { method: 'POST', path: '/api/v1/customers' },
      traceId: 'trace-xyz',
    });

    const rows = await prisma.auditLog.findMany({ where: { userId: 'unit-audit-user' } });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = rows[0];
    expect(row.action).toBe('WRITE');
    expect(row.entity).toBe('customers');
    expect(row.salesType).toBe('INTERNAL');
    expect(row.traceId).toBe('trace-xyz');
    expect(row.detail).toContain('POST'); // 已序列化为 JSON 字符串
  });

  it('listAuditLogs / queryAuditLogs 可按 action 过滤', async () => {
    const svc = await queryAuditLogs({ userId: 'unit-audit-user', action: 'WRITE' });
    expect(svc.total).toBeGreaterThanOrEqual(1);
    expect(svc.rows.every((r) => r.action === 'WRITE')).toBe(true);

    const repo = await listAuditLogs({ userId: 'unit-audit-user', action: 'EXPORT' });
    expect(repo.rows.every((r) => r.action === 'EXPORT')).toBe(true);
  });
});
