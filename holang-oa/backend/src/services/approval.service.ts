// ============================================================
// 审批引擎服务 —— 支线5 OA-APPROVAL-CONFIG (刘总 2026-11-03 拍板)
// 规则驱动的提交/通过/驳回/重新提交 + 待审/已办/单据轨迹查询 + 审计落库。
// 取代写死的 DOC_REQUIRED_ROLE：审批级由 ApprovalRule.levels 决定，支持
//   ① 每种单据开关(enabled)  ② 多级顺序  ③ 每级 MANAGER/FINANCE/ADMIN
//   ④ 每级分域(INTERNAL/EXTERNAL/ALL)  ⑤ 每级 单人批(SINGLE)/多人会签(ALL)。
// 域隔离（销售域）+ 角色授权在服务内完成；单据审批态镜像到原表（见 syncDocStatus）。
// ═══ 仅新增 ApprovalRule + Approval.ruleId/currentLevel + ApprovalStep.level，不破坏既有 ═══
// ============================================================
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../repositories/audit-log.repository';
import { resolveRole, deriveSalesType } from '../constants/roles';
import {
  ENTITY_TYPE,
  ENTITY_TYPES,
  APPROVAL_STATUS,
  APPROVAL_ACTION,
  canApproveByLevel,
  levelMatchedRoles,
  isApprovalLevel,
  ApprovalLevel,
  ApproverType,
  EntityType,
} from '../constants/approval';

// ───────────────────────────────────────────────────────────
// 单据读取辅助：校验存在 + 取展示字段 / 销售域 / 编号 / 标题
// ───────────────────────────────────────────────────────────
interface DocInfo {
  salesType: string | null;
  entityCode: string | null;
  title: string | null;
}

async function getDoc(entityType: string, entityId: string): Promise<DocInfo | null> {
  switch (entityType) {
    case ENTITY_TYPE.CONTRACT: {
      const r = await prisma.contract.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: r.contractNumber ?? null, title: `合同 ${r.contractNumber ?? ''}` } : null;
    }
    case ENTITY_TYPE.PI: {
      const r = await prisma.pi.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: r.piNo ?? null, title: `PI ${r.piNo ?? ''}` } : null;
    }
    case ENTITY_TYPE.ORDER: {
      const r = await prisma.order.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: r.orderCode ?? null, title: `订单 ${r.orderCode ?? ''}` } : null;
    }
    case ENTITY_TYPE.INVOICE: {
      const r = await prisma.invoice.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: r.invoiceNumber ?? null, title: `发票 ${r.invoiceNumber ?? ''}` } : null;
    }
    case ENTITY_TYPE.DELIVERY: {
      const r = await prisma.delivery.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: r.code ?? null, title: `发货 ${r.code ?? ''}` } : null;
    }
    case ENTITY_TYPE.DEALER_REPORT: {
      const r = await prisma.dealerReport.findUnique({ where: { id: entityId } });
      return r ? { salesType: r.salesType ?? null, entityCode: null, title: `经销商报备 ${r.companyName ?? ''}` } : null;
    }
    default:
      return null;
  }
}

/**
 * 把审批态镜像到原单据。
 * 注意 schema 现状（红线禁止改动既有模型）：
 *   - approvalStatus 字段仅 Contract / Order / Invoice 存在 -> 直接镜像；
 *   - Pi / Delivery 既有模型无 approvalStatus -> 不写镜像（审批态以 approvals 表为准，前端经 GET /doc 读取）；
 *   - DealerReport 用其 status 字段承载审批态（但支线5 新引擎不接入经销商报备，见 submit 守卫）。
 */
async function syncDocStatus(
  tx: any,
  entityType: string,
  entityId: string,
  status: string
): Promise<void> {
  switch (entityType) {
    case ENTITY_TYPE.CONTRACT:
      await tx.contract.update({ where: { id: entityId }, data: { approvalStatus: status } });
      break;
    case ENTITY_TYPE.ORDER:
      await tx.order.update({ where: { id: entityId }, data: { approvalStatus: status } });
      break;
    case ENTITY_TYPE.INVOICE:
      await tx.invoice.update({ where: { id: entityId }, data: { approvalStatus: status } });
      break;
    case ENTITY_TYPE.DELIVERY:
      // Delivery 无 approvalStatus 字段（仅有 flowStatus），红线不改既有模型，跳过镜像。
      break;
    case ENTITY_TYPE.PI:
      // Pi 无 approvalStatus 字段，红线不改既有模型，跳过镜像。
      break;
    case ENTITY_TYPE.DEALER_REPORT:
      // 经销商报备走独立审核路径（PUT /dealer-reports/:id/review），新引擎不接入，此处不镜像。
      break;
    default:
      break;
  }
}

// ───────────────────────────────────────────────────────────
// 规则读取辅助
// ───────────────────────────────────────────────────────────

/** 取某单据类型的启用规则；不存在/禁用返回 null */
async function getEnabledRule(entityType: string) {
  const rule = await prisma.approvalRule.findUnique({ where: { entityType } });
  if (!rule || !rule.enabled) return null;
  return rule;
}

/** 解析规则 levels 为有序 ApprovalLevel[]（按 order 升序）。
 *  levels 在 SQLite 以下以 JSON 字符串存储，兼容字符串/数组两种输入。 */
function parseLevels(rule: { levels: any }): ApprovalLevel[] {
  let raw: any = rule.levels;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (!Array.isArray(raw)) raw = [];
  return (raw as any[])
    .filter(isApprovalLevel)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 推导某 Approval 当前级的配置：优先用关联规则；若无规则（历史残留单）则用 requiredRole 构造单级，保证可见性不丢失。
 */
function resolveCurrentLevel(a: {
  rule?: { levels: any } | null;
  requiredRole?: string;
  currentLevel: number;
}): ApprovalLevel | null {
  if (a.rule) {
    const levels = parseLevels(a.rule);
    return levels[a.currentLevel] ?? null;
  }
  // 历史兜底：requiredRole -> 单级 MANAGER/FINANCE（不限域、单人批）
  const approverType: ApproverType = a.requiredRole === 'FINANCE' ? 'FINANCE' : 'MANAGER';
  return { order: 0, approverType, salesTypeScope: null, countersign: 'SINGLE' };
}

/**
 * 取某级在「现有用户」中的合格审批人 id 列表（正常成员，不含 ADMIN 超级绕过）。
 * 用于：① 会签完成计数；② 收件箱/已办可见性；③ 保存时"无适用审批人"校验。
 * docSalesType 省略时按级的 salesTypeScope 判定（跳过单据域），用于保存校验。
 */
export async function getEligibleApproverIds(
  level: ApprovalLevel,
  docSalesType?: string | null
): Promise<string[]> {
  const matched = levelMatchedRoles(level);
  // 注意：User.role 可能存历史别名（如 'MANAGER'），须用 resolveRole 解析为权威角色后再比对，
  // 不能按字符串直接匹配（历史上 MANAGER 用户存的是 'MANAGER' 而非 'INTERNAL_LEAD'）。
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true },
  });

  // 域约束：级的 salesTypeScope 优先；scope 为 null/ALL 时按单据域隔离
  let constraint: 'INTERNAL' | 'EXTERNAL' | null = null;
  if (level.salesTypeScope === 'INTERNAL') constraint = 'INTERNAL';
  else if (level.salesTypeScope === 'EXTERNAL') constraint = 'EXTERNAL';
  else if (docSalesType === 'INTERNAL') constraint = 'INTERNAL';
  else if (docSalesType === 'EXTERNAL') constraint = 'EXTERNAL';

  return users
    .filter((u) => {
      const r = resolveRole(u.role);
      if (!matched.includes(r)) return false; // 角色闸门（按权威角色）
      if (constraint === null) return true;
      const domain = deriveSalesType(r);
      if (domain === 'ALL') return true;
      return domain === constraint;
    })
    .map((u) => u.id);
}

/**
 * 统计当前轮次（最近一次 SUBMIT/RESUBMIT 之后）内，某级已通过的不同审批人数量。
 * 会签(ALL)完成判定用：集齐该级全部合格审批人。
 */
async function countApprovalsAtLevel(
  approvalId: string,
  level: number
): Promise<Set<string>> {
  const steps = await prisma.approvalStep.findMany({
    where: { approvalId },
    orderBy: { createdAt: 'asc' },
    select: { action: true, actorId: true, level: true },
  });
  // 找到最近一次 SUBMIT/RESUBMIT 的下标，仅统计其后的 APPROVE
  let lastResetIdx = -1;
  steps.forEach((s, i) => {
    if (s.action === APPROVAL_ACTION.SUBMIT || s.action === APPROVAL_ACTION.RESUBMIT) {
      lastResetIdx = i;
    }
  });
  const ids = new Set<string>();
  steps.forEach((s, i) => {
    if (i <= lastResetIdx) return;
    if (s.action === APPROVAL_ACTION.APPROVE && s.level === level && s.actorId) {
      ids.add(s.actorId);
    }
  });
  return ids;
}

// ───────────────────────────────────────────────────────────
// 提交审批
// ───────────────────────────────────────────────────────────
export interface SubmitForApprovalInput {
  entityType: string;
  entityId: string;
  submitterId?: string | null;
  submitterName?: string | null;
  salesType?: string | null;
  entityCode?: string | null;
  title?: string | null;
}

export async function submitForApproval(input: SubmitForApprovalInput) {
  const entityType = input.entityType as EntityType;
  if (!ENTITY_TYPES.includes(entityType)) {
    throw new AppError(`不支持审批的单据类型: ${input.entityType}`, 400);
  }

  // 经销商报备保持独立审核路径（PUT /dealer-reports/:id/review），不通过新引擎，避免双审批
  if (entityType === ENTITY_TYPE.DEALER_REPORT) {
    throw new AppError('经销商报备走独立审核路径（PUT /dealer-reports/:id/review），不通过通用审批引擎', 409);
  }

  // 校验单据存在（避免脏数据），并取展示字段 / 销售域
  const doc = await getDoc(input.entityType, input.entityId);
  if (!doc) throw new AppError('审批单据不存在', 404);

  const salesType = input.salesType ?? doc.salesType ?? null;
  const entityCode = input.entityCode ?? doc.entityCode ?? null;
  const title = input.title ?? doc.title ?? null;

  // 按规则驱动：无启用规则（未配置 / 已关闭）-> 不创建审批，返回 null（表示无需审批）
  const rule = await getEnabledRule(input.entityType);
  if (!rule) return null;
  const levels = parseLevels(rule);
  if (levels.length === 0) return null; // 规则无有效级 -> 视作未启用审批

  // 防重复提交：已存在 待审/已通过 的同单据审批则拒绝
  const existing = await prisma.approval.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      status: { in: [APPROVAL_STATUS.PENDING, APPROVAL_STATUS.APPROVED] },
    },
  });
  if (existing) {
    throw new AppError('该单据已处于审批流程中或已通过，不能重复提交', 409);
  }

  const firstLevel = levels[0];

  const approval = await prisma.$transaction(async (tx) => {
    const created = await tx.approval.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        entityCode,
        title,
        submitterId: input.submitterId ?? null,
        submitterName: input.submitterName ?? null,
        status: APPROVAL_STATUS.PENDING,
        salesType,
        ruleId: rule.id,
        currentLevel: 0,
        requiredRole: firstLevel.approverType, // 兼容展示字段
      },
    });

    await tx.approvalStep.create({
      data: {
        approvalId: created.id,
        action: APPROVAL_ACTION.SUBMIT,
        actorId: input.submitterId ?? null,
        actorName: input.submitterName ?? null,
        actorRole: null,
        comment: null,
        level: null,
      },
    });

    await syncDocStatus(tx, input.entityType, input.entityId, APPROVAL_STATUS.PENDING);

    return created;
  });

  await createAuditLog({
    userId: input.submitterId ?? null,
    action: 'WRITE',
    entity: 'approvals',
    entityId: approval.id,
    salesType,
    result: 'SUCCESS',
    detail: {
      subAction: APPROVAL_ACTION.SUBMIT,
      entityType: input.entityType,
      entityId: input.entityId,
      ruleId: rule.id,
      levels: levels.length,
    },
  });

  return approval;
}

// ───────────────────────────────────────────────────────────
// 通过
// ───────────────────────────────────────────────────────────
export interface DecideInput {
  approvalId: string;
  approverId?: string | null;
  approverName?: string | null;
  approverRole: string;
  approverSalesType?: string | null;
}

export async function approve(input: DecideInput) {
  const approval = await prisma.approval.findUnique({ where: { id: input.approvalId } });
  if (!approval) throw new AppError('审批单不存在', 404);
  if (approval.status !== APPROVAL_STATUS.PENDING) {
    throw new AppError(`该审批单不处于待审状态（当前: ${approval.status}）`, 409);
  }

  // 规则驱动：取当前级配置
  const rule = approval.ruleId
    ? await prisma.approvalRule.findUnique({ where: { id: approval.ruleId } })
    : null;
  if (!rule || !rule.enabled) {
    throw new AppError('该审批单关联的规则已失效或关闭，无法审批', 409);
  }
  const levels = parseLevels(rule);
  const currentLevelIdx = approval.currentLevel;
  const level = levels[currentLevelIdx];
  if (!level) {
    throw new AppError('审批规则配置异常（当前级缺失），请联系管理员', 409);
  }

  if (!canApproveByLevel(input.approverRole, input.approverSalesType, level, approval.salesType)) {
    throw new AppError('无权审批该单据（角色或销售域不匹配）', 403);
  }

  // 会签(ALL)：若当前审批人在本轮回合已签过，视为幂等，直接返回当前单（不重复计/不重复落步）
  if (level.countersign === 'ALL') {
    const already = await countApprovalsAtLevel(approval.id, currentLevelIdx);
    if (input.approverId && already.has(input.approverId)) {
      return approval;
    }
  }

  const now = new Date();
  const isLast = currentLevelIdx >= levels.length - 1;
  const nextLevelIdx = currentLevelIdx + 1;

  // 判定是否推进 / 通过。newCurrentLevel 为审批后停留的级（默认当前级）。
  let finalApprove = false;
  let newCurrentLevel = currentLevelIdx;
  if (level.countersign === 'SINGLE') {
    // 单人批：一次即过（末级=通过，否则推进下一级）
    if (isLast) finalApprove = true;
    else newCurrentLevel = nextLevelIdx;
  } else {
    // 会签(ALL)：集齐该级全部合格审批人（正常成员，不含 ADMIN 绕过）才推进/通过；
    // 未集齐时停留当前级，仍 PENDING，绝不越级。
    const eligible = await getEligibleApproverIds(level, approval.salesType);
    if (eligible.length === 0) {
      throw new AppError('该审批级当前无可用审批人，请联系管理员检查审批规则配置', 409);
    }
    const signed = await countApprovalsAtLevel(approval.id, currentLevelIdx);
    if (input.approverId) signed.add(input.approverId);
    if (signed.size >= eligible.length) {
      if (isLast) finalApprove = true;
      else newCurrentLevel = nextLevelIdx;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.approvalStep.create({
      data: {
        approvalId: approval.id,
        action: APPROVAL_ACTION.APPROVE,
        actorId: input.approverId ?? null,
        actorName: input.approverName ?? null,
        actorRole: resolveRole(input.approverRole),
        comment: null,
        level: currentLevelIdx,
      },
    });

    if (finalApprove) {
      const a = await tx.approval.update({
        where: { id: approval.id },
        data: {
          status: APPROVAL_STATUS.APPROVED,
          approverId: input.approverId ?? null,
          approverName: input.approverName ?? null,
          decidedAt: now,
          rejectReason: null,
          currentLevel: currentLevelIdx,
        },
      });
      await syncDocStatus(tx, approval.entityType, approval.entityId, APPROVAL_STATUS.APPROVED);
      return a;
    }

    // 停留当前级或推进到下一级（仍 PENDING）
    const a = await tx.approval.update({
      where: { id: approval.id },
      data: { currentLevel: newCurrentLevel, status: APPROVAL_STATUS.PENDING },
    });
    return a;
  });

  await createAuditLog({
    userId: input.approverId ?? null,
    action: 'WRITE',
    entity: 'approvals',
    entityId: approval.id,
    salesType: approval.salesType,
    result: 'SUCCESS',
    detail: {
      subAction: APPROVAL_ACTION.APPROVE,
      entityType: approval.entityType,
      entityId: approval.entityId,
      level: currentLevelIdx,
      countersign: level.countersign,
      advancedTo: newCurrentLevel,
      finalApprove,
    },
  });

  return updated;
}

// ───────────────────────────────────────────────────────────
// 驳回（必须填原因）
// ───────────────────────────────────────────────────────────
export interface RejectInput extends DecideInput {
  rejectReason: string;
  comment?: string | null;
}

export async function reject(input: RejectInput) {
  if (!input.rejectReason || !input.rejectReason.trim()) {
    throw new AppError('驳回必须填写原因', 400);
  }

  const approval = await prisma.approval.findUnique({ where: { id: input.approvalId } });
  if (!approval) throw new AppError('审批单不存在', 404);
  if (approval.status !== APPROVAL_STATUS.PENDING) {
    throw new AppError(`该审批单不处于待审状态（当前: ${approval.status}）`, 409);
  }

  const rule = approval.ruleId
    ? await prisma.approvalRule.findUnique({ where: { id: approval.ruleId } })
    : null;
  if (!rule || !rule.enabled) {
    throw new AppError('该审批单关联的规则已失效或关闭，无法审批', 409);
  }
  const levels = parseLevels(rule);
  const level = levels[approval.currentLevel];
  if (!level) {
    throw new AppError('审批规则配置异常（当前级缺失），请联系管理员', 409);
  }

  if (!canApproveByLevel(input.approverRole, input.approverSalesType, level, approval.salesType)) {
    throw new AppError('无权审批该单据（角色或销售域不匹配）', 403);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: APPROVAL_STATUS.REJECTED,
        approverId: input.approverId ?? null,
        approverName: input.approverName ?? null,
        decidedAt: now,
        rejectReason: input.rejectReason,
        comment: input.comment ?? null,
      },
    });

    await tx.approvalStep.create({
      data: {
        approvalId: approval.id,
        action: APPROVAL_ACTION.REJECT,
        actorId: input.approverId ?? null,
        actorName: input.approverName ?? null,
        actorRole: resolveRole(input.approverRole),
        comment: input.rejectReason,
        level: approval.currentLevel,
      },
    });

    await syncDocStatus(tx, approval.entityType, approval.entityId, APPROVAL_STATUS.REJECTED);
    return a;
  });

  await createAuditLog({
    userId: input.approverId ?? null,
    action: 'WRITE',
    entity: 'approvals',
    entityId: approval.id,
    salesType: approval.salesType,
    result: 'SUCCESS',
    detail: {
      subAction: APPROVAL_ACTION.REJECT,
      entityType: approval.entityType,
      entityId: approval.entityId,
      rejectReason: input.rejectReason,
      level: approval.currentLevel,
    },
  });

  return updated;
}

// ───────────────────────────────────────────────────────────
// 重新提交（仅提交人或 ADMIN，且当前须为 REJECTED）
// ───────────────────────────────────────────────────────────
export interface ResubmitInput {
  approvalId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole: string;
}

export async function resubmit(input: ResubmitInput) {
  const approval = await prisma.approval.findUnique({ where: { id: input.approvalId } });
  if (!approval) throw new AppError('审批单不存在', 404);
  if (approval.status !== APPROVAL_STATUS.REJECTED) {
    throw new AppError(`仅被驳回的审批可重新提交（当前: ${approval.status}）`, 409);
  }

  const r = resolveRole(input.actorRole);
  if (r !== 'ADMIN' && input.actorId !== approval.submitterId) {
    throw new AppError('仅提交人或管理员可重新提交', 403);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: APPROVAL_STATUS.PENDING,
        approverId: null,
        approverName: null,
        decidedAt: null,
        rejectReason: null,
        comment: null,
        currentLevel: 0,
      },
    });

    await tx.approvalStep.create({
      data: {
        approvalId: approval.id,
        action: APPROVAL_ACTION.RESUBMIT,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorRole: r,
        comment: null,
        level: null,
      },
    });

    await syncDocStatus(tx, approval.entityType, approval.entityId, APPROVAL_STATUS.PENDING);
    return a;
  });

  await createAuditLog({
    userId: input.actorId ?? null,
    action: 'WRITE',
    entity: 'approvals',
    entityId: approval.id,
    salesType: approval.salesType,
    result: 'SUCCESS',
    detail: {
      subAction: APPROVAL_ACTION.RESUBMIT,
      entityType: approval.entityType,
      entityId: approval.entityId,
    },
  });

  return updated;
}

// ───────────────────────────────────────────────────────────
// 待审列表（收件箱）—— 由「规则 + 当前级」推导可见性
// ───────────────────────────────────────────────────────────
export interface ListInboxInput {
  approverRole: string;
  approverId?: string | null;
  approverSalesType?: string | null;
}

export async function listInbox(input: ListInboxInput) {
  const isAdmin = resolveRole(input.approverRole) === 'ADMIN';

  const list = await prisma.approval.findMany({
    where: { status: APPROVAL_STATUS.PENDING },
    orderBy: { createdAt: 'asc' },
    include: { rule: true },
  });

  const result: any[] = [];
  for (const a of list) {
    // ADMIN 全域可见；其余须为本单当前级的合格审批人（由规则推导）
    if (!isAdmin) {
      const level = resolveCurrentLevel(a);
      if (!level) continue;
      const eligible = await getEligibleApproverIds(level, a.salesType);
      if (!input.approverId || !eligible.includes(input.approverId)) continue;
    }
    result.push({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      entityCode: a.entityCode,
      title: a.title,
      submitterName: a.submitterName,
      salesType: a.salesType,
      requiredRole: a.requiredRole,
      status: a.status,
      currentLevel: a.currentLevel,
      createdAt: a.createdAt,
    });
  }

  return result;
}

// ───────────────────────────────────────────────────────────
// 已办列表（已通过 / 已驳回）—— 由「规则 + 参与/提交/合格」推导可见性
// ───────────────────────────────────────────────────────────
export async function listDone(input: ListInboxInput) {
  const isAdmin = resolveRole(input.approverRole) === 'ADMIN';

  const list = await prisma.approval.findMany({
    where: { status: { not: APPROVAL_STATUS.PENDING } },
    orderBy: { decidedAt: 'desc' },
    include: { rule: true, steps: { select: { actorId: true } } },
  });

  const result: any[] = [];
  for (const a of list) {
    if (isAdmin) {
      // 全部可见
    } else if (input.approverId && a.submitterId === input.approverId) {
      // 自己提交的
    } else if (input.approverId && a.steps.some((s: any) => s.actorId === input.approverId)) {
      // 自己参与过审批动作的
    } else if (input.approverId) {
      // 自己曾是该单任意级的合格审批人
      const levels = a.rule ? parseLevels(a.rule) : [resolveCurrentLevel(a)].filter(Boolean) as ApprovalLevel[];
      let eligibleSomewhere = false;
      for (const lv of levels) {
        const eligible = await getEligibleApproverIds(lv, a.salesType);
        if (eligible.includes(input.approverId)) { eligibleSomewhere = true; break; }
      }
      if (!eligibleSomewhere) continue;
    } else {
      continue;
    }

    result.push({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      entityCode: a.entityCode,
      title: a.title,
      submitterName: a.submitterName,
      salesType: a.salesType,
      requiredRole: a.requiredRole,
      status: a.status,
      approverName: a.approverName,
      decidedAt: a.decidedAt,
      rejectReason: a.rejectReason,
      currentLevel: a.currentLevel,
      createdAt: a.createdAt,
    });
  }

  return result;
}

// ───────────────────────────────────────────────────────────
// 单据审批详情（含轨迹，带 level）
// ───────────────────────────────────────────────────────────
export async function listByEntity(entityType: string, entityId: string) {
  if (!ENTITY_TYPES.includes(entityType as EntityType)) {
    throw new AppError(`不支持审批的单据类型: ${entityType}`, 400);
  }

  const approvals = await prisma.approval.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: {
      steps: { orderBy: { createdAt: 'asc' } },
    },
  });

  return approvals;
}
