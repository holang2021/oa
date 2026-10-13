// ============================================================
// CustomerGrade Service —— 批次1-A D1 (P2 客户等级 A/B/C)
// 业务规则：4 选择题提示分级 + 按频次自动算下次跟进 + A 占比控 + 复审。
// Service 不触碰 req/res（门禁规则1），写经 Repository，落 audit_log（门禁规则5）。
// ============================================================
import { z } from 'zod';
import * as customerRepo from '../repositories/customer.repository';
import * as configRepo from '../repositories/customer-grade-config.repository';
import { createAuditLog } from '../repositories/audit-log.repository';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { CustomerGrade, GradeSignals, ServiceContext } from './types';

/** 4 选择题（提示分级）入参校验 */
export const gradeSignalsSchema = z.object({
  urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  budget: z.enum(['READY', 'PENDING', 'NONE']),
  decision: z.enum(['CONTACTED', 'UNKNOWN', 'BLOCKED']),
  engagement: z.enum(['ACTIVE', 'ONCE', 'PASSIVE']),
});

/**
 * 由 4 选择题推导客户等级（按需求紧迫度，非价值）。
 * 规则（确定性、可测试）：
 *   A：需求紧迫(HIGH) 且 预算就绪(READY) 且 决策人对接(CONTACTED)
 *   B：非 C 的中等信号（有采购意向、预算非无、互动非被动）
 *   C：其余（需求低/无预算/停滞/被动录入）
 */
export function mapAnswersToGrade(s: GradeSignals): CustomerGrade {
  if (s.urgency === 'HIGH' && s.budget === 'READY' && s.decision === 'CONTACTED') {
    return 'A';
  }
  const isLow =
    s.urgency === 'LOW' || s.budget === 'NONE' || s.decision === 'BLOCKED' || s.engagement === 'PASSIVE';
  if (isLow) return 'C';
  return 'B';
}

/**
 * 按等级频次算下次跟进时间。
 * 取频次区间中点（必然落在 [min,max] 内，满足 A+5~7 / B+14~21 / C+28~42）。
 */
export function computeNextFollowupAt(grade: CustomerGrade, config: configRepo.GradeConfigRow, now: Date = new Date()): Date {
  const days = config.followupMinDays + Math.round((config.followupMaxDays - config.followupMinDays) / 2);
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

/** 复审日期 = now + reviewDays */
export function computeGradeReviewAt(grade: CustomerGrade, config: configRepo.GradeConfigRow, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + config.reviewDays);
  return d;
}

/**
 * A 占比控制：若拟定为 A 且当前 A 占比已达上限，则降级为 B。
 * 返回最终等级 + 是否因占比触发调整。
 */
export async function enforceARatio(grade: CustomerGrade): Promise<{ grade: CustomerGrade; ratioAdjusted: boolean }> {
  if (grade !== 'A') return { grade, ratioAdjusted: false };
  const counts = await customerRepo.countByGrade();
  const total = counts.total || 0;
  const aCount = counts.A || 0;
  const maxRatio = (await configRepo.getGradeConfig('A'))?.maxRatioPct ?? 30;
  if (total > 0 && (aCount / total) * 100 >= maxRatio) {
    logger.warn({ aCount, total, maxRatio }, 'A 占比已达上限，新客户降级为 B');
    return { grade: 'B', ratioAdjusted: true };
  }
  return { grade, ratioAdjusted: false };
}

export interface CreateCustomerWithGradeInput {
  companyName: string;
  customerCode?: string | null;
  industry?: string | null;
  scale?: string | null;
  address?: string | null;
  companyPhone?: string | null;
  website?: string | null;
  creditCode?: string | null;
  dunsNumber?: string | null;
  country?: string | null;
  status?: string;
  source?: string | null;
  salesOwnerId?: string | null;
  notes?: string | null;
  taxTitle?: string | null;
  taxNumber?: string | null;
  invoiceType?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankCode?: string | null;
  contacts?: customerRepo.CustomerContactInput[];
  /** 4 选择题（可选；提供则推导 grade，否则用显式 grade 或默认 B） */
  gradeSignals?: GradeSignals;
  /** 显式等级（可选，覆盖推导） */
  customerGrade?: CustomerGrade | null;
  /** 期望销售域（ADMIN/全域可指定；非全域被服务端强制覆盖） */
  salesType?: string;
}

/**
 * 新建客户并落等级 + 自动算下次跟进（D1 核心）。
 * 服务端强制销售域（salesType 透传 + 域强制，门禁规则6）。
 */
export async function createCustomerWithGrade(
  input: CreateCustomerWithGradeInput,
  ctx: ServiceContext
) {
  // ── 服务端销售域强制 ──
  let salesType: string;
  if (ctx.scope === 'ALL') {
    salesType = (input.salesType ?? 'INTERNAL').toUpperCase();
  } else {
    // 非全域角色只能在自己域内建客户，忽略传入 salesType
    salesType = ctx.scope;
  }

  // ── 等级推导 + A 占比控 ──
  let grade: CustomerGrade | null =
    input.customerGrade ?? (input.gradeSignals ? mapAnswersToGrade(input.gradeSignals) : null) ?? 'B';
  const ratio = await enforceARatio(grade);
  grade = ratio.grade;

  // ── 频次计算 ──
  const cfg = (await configRepo.getGradeConfig(grade)) ?? (await configRepo.listGradeConfig()).find((c) => c.grade === grade);
  if (!cfg) {
    throw new AppError(`缺少等级 ${grade} 的配置`, 500);
  }
  const nextFollowupAt = computeNextFollowupAt(grade, cfg);
  const gradeReviewAt = computeGradeReviewAt(grade, cfg);

  // ── 落库 ──
  const customer = await customerRepo.createCustomer({
    companyName: input.companyName,
    // 客户编号：前端未传（或仅空白）时由后端统一原子编码，保证单一真相源、不重号
    customerCode:
      input.customerCode && input.customerCode.trim()
        ? input.customerCode
        : await customerRepo.nextCustomerCode(),
    industry: input.industry ?? null,
    scale: input.scale ?? null,
    address: input.address ?? null,
    companyPhone: input.companyPhone ?? null,
    website: input.website ?? null,
    creditCode: input.creditCode ?? null,
    dunsNumber: input.dunsNumber ?? null,
    country: input.country ?? null,
    status: input.status ?? 'POTENTIAL',
    source: input.source ?? null,
    salesOwnerId: input.salesOwnerId ?? ctx.userId,
    createdBy: ctx.userId,
    notes: input.notes ?? null,
    taxTitle: input.taxTitle ?? null,
    taxNumber: input.taxNumber ?? null,
    invoiceType: input.invoiceType ?? null,
    bankName: input.bankName ?? null,
    bankAccount: input.bankAccount ?? null,
    bankCode: input.bankCode ?? null,
    contacts: input.contacts ?? [],
    customerGrade: grade,
    nextFollowupAt,
    gradeReviewAt,
    salesType,
    inPublicPool: false,
    ownerId: ctx.userId,
  });

  // ── 审计：客户等级变更/新建写 ──
  await createAuditLog({
    userId: ctx.userId,
    action: 'WRITE',
    entity: 'customers',
    entityId: customer.id,
    salesType,
    result: 'SUCCESS',
    detail: { grade, ratioAdjusted: ratio.ratioAdjusted, salesType, source: 'createCustomerWithGrade' },
    traceId: ctx.traceId ?? null,
  });

  return { customer, grade, nextFollowupAt, gradeReviewAt, ratioAdjusted: ratio.ratioAdjusted };
}

/** 到期跟进客户（供 1-D 统一待办聚合） */
export async function getDueFollowups(now: Date = new Date()) {
  return customerRepo.findDueFollowups(now);
}
