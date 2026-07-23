// ============================================================
// CustomerGradeConfig Repository —— 批次1-A (D1)
// 客户等级配置（频次 + A 占比控 + 复审降级规则）。Repository 独占 Prisma 写。
// 种子数据由 migrations/batch1a_*/migration.sql 植入（幂等）。
// ============================================================
import { prisma } from '../config/database';

export interface GradeConfigRow {
  grade: string;
  label: string | null;
  followupMinDays: number;
  followupMaxDays: number;
  reviewDays: number;
  maxRatioPct: number;
  downgradeRule: string | null;
}

export async function listGradeConfig(): Promise<GradeConfigRow[]> {
  const rows = await prisma.customerGradeConfig.findMany({ orderBy: { grade: 'asc' } });
  return rows.map((r) => ({
    grade: r.grade,
    label: r.label,
    followupMinDays: r.followupMinDays,
    followupMaxDays: r.followupMaxDays,
    reviewDays: r.reviewDays,
    maxRatioPct: r.maxRatioPct,
    downgradeRule: r.downgradeRule,
  }));
}

export async function getGradeConfig(grade: string): Promise<GradeConfigRow | null> {
  const r = await prisma.customerGradeConfig.findUnique({ where: { grade } });
  if (!r) return null;
  return {
    grade: r.grade,
    label: r.label,
    followupMinDays: r.followupMinDays,
    followupMaxDays: r.followupMaxDays,
    reviewDays: r.reviewDays,
    maxRatioPct: r.maxRatioPct,
    downgradeRule: r.downgradeRule,
  };
}
