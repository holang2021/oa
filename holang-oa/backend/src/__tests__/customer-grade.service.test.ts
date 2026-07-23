import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/database';
import * as gradeService from '../services/customer-grade.service';
import * as configRepo from '../repositories/customer-grade-config.repository';
import type { ServiceContext } from '../services/types';

const MARK = '批次1A_GRADE_UT';

function ctx(scope: 'INTERNAL' | 'EXTERNAL' | 'ALL', userId = 'ut-user-grade'): ServiceContext {
  return { userId, scope, role: scope === 'ALL' ? 'ADMIN' : scope === 'INTERNAL' ? 'INTERNAL_SALES' : 'EXTERNAL_SALES', traceId: 'ut-trace' };
}

beforeAll(async () => {
  // 种子配置（setup 已植入；兜底）
  const cfg = await configRepo.listGradeConfig();
  expect(cfg.length).toBe(3);
  // 测试用户（供 salesOwner/creator 关系 connect；仅作用于 DB 副本，不触真实库）
  await prisma.user.upsert({
    where: { id: 'ut-user-grade' },
    update: {},
    create: { id: 'ut-user-grade', name: 'UT Grade User', role: 'INTERNAL_SALES' },
  });
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { companyName: { contains: MARK } } });
  await prisma.$disconnect();
});

describe('D1 单元：4 选择题 → 等级映射', () => {
  it('高紧迫+预算就绪+决策人对接 => A', () => {
    expect(
      gradeService.mapAnswersToGrade({ urgency: 'HIGH', budget: 'READY', decision: 'CONTACTED', engagement: 'ACTIVE' })
    ).toBe('A');
  });
  it('低紧迫 => C', () => {
    expect(
      gradeService.mapAnswersToGrade({ urgency: 'LOW', budget: 'READY', decision: 'CONTACTED', engagement: 'ACTIVE' })
    ).toBe('C');
  });
  it('无预算 => C', () => {
    expect(
      gradeService.mapAnswersToGrade({ urgency: 'HIGH', budget: 'NONE', decision: 'CONTACTED', engagement: 'ACTIVE' })
    ).toBe('C');
  });
  it('中等信号 => B', () => {
    expect(
      gradeService.mapAnswersToGrade({ urgency: 'MEDIUM', budget: 'PENDING', decision: 'UNKNOWN', engagement: 'ONCE' })
    ).toBe('B');
  });
});

describe('D1 单元：下次跟进频次落在区间', () => {
  it('A 档 => 5~7 天', () => {
    const cfg = { grade: 'A', label: '', followupMinDays: 5, followupMaxDays: 7, reviewDays: 30, maxRatioPct: 30, downgradeRule: null };
    const base = new Date('2026-07-23T00:00:00Z');
    const next = gradeService.computeNextFollowupAt('A', cfg, base);
    const days = (next.getTime() - base.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThanOrEqual(7);
  });
  it('B 档 => 14~21 天', () => {
    const cfg = { grade: 'B', label: '', followupMinDays: 14, followupMaxDays: 21, reviewDays: 60, maxRatioPct: 0, downgradeRule: null };
    const base = new Date('2026-07-23T00:00:00Z');
    const next = gradeService.computeNextFollowupAt('B', cfg, base);
    const days = (next.getTime() - base.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThanOrEqual(21);
  });
  it('C 档 => 28~42 天', () => {
    const cfg = { grade: 'C', label: '', followupMinDays: 28, followupMaxDays: 42, reviewDays: 90, maxRatioPct: 0, downgradeRule: null };
    const base = new Date('2026-07-23T00:00:00Z');
    const next = gradeService.computeNextFollowupAt('C', cfg, base);
    const days = (next.getTime() - base.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(28);
    expect(days).toBeLessThanOrEqual(42);
  });
});

describe('D1 单元：新建客户含等级 + 频次 + 服务端域强制', () => {
  it('内销销售建客户：salesType 被强制为 INTERNAL（忽略传入 EXTERNAL）', async () => {
    const res = await gradeService.createCustomerWithGrade(
      { companyName: `${MARK}_强制域`, gradeSignals: { urgency: 'HIGH', budget: 'READY', decision: 'CONTACTED', engagement: 'ACTIVE' }, salesType: 'EXTERNAL' },
      ctx('INTERNAL')
    );
    expect(res.customer.salesType).toBe('INTERNAL');
    expect(res.grade).toBe('A');
    expect(res.customer.nextFollowupAt).not.toBeNull();
    expect(res.nextFollowupAt).not.toBeNull();
    expect(res.customer.gradeReviewAt).not.toBeNull();
  });

  it('ADMIN(全域) 可指定 EXTERNAL 域', async () => {
    const res = await gradeService.createCustomerWithGrade(
      { companyName: `${MARK}_admin外销`, salesType: 'EXTERNAL' },
      ctx('ALL')
    );
    expect(res.customer.salesType).toBe('EXTERNAL');
    expect(res.grade).toBe('B'); // 无 signals 默认 B
  });

  it('到期跟进扫描返回 nextFollowupAt<=now 的非公海客户', async () => {
    // 造一个已到期的跟进客户
    await prisma.customer.create({
      data: { companyName: `${MARK}_逾期`, salesType: 'INTERNAL', inPublicPool: false, ownerId: 'ut-user-grade', nextFollowupAt: new Date('2020-01-01') },
    });
    const due = await gradeService.getDueFollowups(new Date());
    expect(due.some((c) => c.companyName === `${MARK}_逾期`)).toBe(true);
  });
});
