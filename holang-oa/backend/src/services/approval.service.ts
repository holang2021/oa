// ============================================================
// 审批引擎服务 —— 支线4 OA-APPROVAL-FLOW (刘总 2026-11-02 拍板)
// 真实审批引擎：提交/通过/驳回/重新提交 + 待审/已办/单据轨迹查询 + 审计落库。
// 域隔离（销售域）+ 角色授权在服务内完成；单据审批态镜像到原表（见 syncDocStatus）。
// ═══ 不改动既有模型/字段；仅新增 Approval / ApprovalStep ═══
// ============================================================
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { createAuditLog } from '../repositories/audit-log.repository';
import { resolveRole } from '../constants/roles';
import {
  ENTITY_TYPE,
  ENTITY_TYPES,
  DOC_REQUIRED_ROLE,
  APPROVAL_STATUS,
  APPROVAL_ACTION,
  canApprove,
  visibleRequiredRoles,
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
 *   - DealerReport 用其 status 字段承载审批态。
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
      await tx.dealerReport.update({ where: { id: entityId }, data: { status } });
      break;
    default:
      break;
  }
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

  // 校验单据存在（避免脏数据），并取展示字段 / 销售域
  const doc = await getDoc(input.entityType, input.entityId);
  if (!doc) throw new AppError('审批单据不存在', 404);

  const salesType = input.salesType ?? doc.salesType ?? null;
  const entityCode = input.entityCode ?? doc.entityCode ?? null;
  const title = input.title ?? doc.title ?? null;

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

  const requiredRole = DOC_REQUIRED_ROLE[entityType];

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
        requiredRole,
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
  if (!canApprove(input.approverRole, input.approverSalesType, approval.requiredRole, approval.salesType)) {
    throw new AppError('无权审批该单据（角色或销售域不匹配）', 403);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: APPROVAL_STATUS.APPROVED,
        approverId: input.approverId ?? null,
        approverName: input.approverName ?? null,
        decidedAt: now,
        rejectReason: null,
      },
    });

    await tx.approvalStep.create({
      data: {
        approvalId: approval.id,
        action: APPROVAL_ACTION.APPROVE,
        actorId: input.approverId ?? null,
        actorName: input.approverName ?? null,
        actorRole: resolveRole(input.approverRole),
        comment: null,
      },
    });

    await syncDocStatus(tx, approval.entityType, approval.entityId, APPROVAL_STATUS.APPROVED);
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
      approverName: input.approverName ?? null,
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
  if (!canApprove(input.approverRole, input.approverSalesType, approval.requiredRole, approval.salesType)) {
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
// 待审列表（收件箱）
// ───────────────────────────────────────────────────────────
export interface ListInboxInput {
  approverRole: string;
  approverSalesType?: string | null;
}

export async function listInbox(input: ListInboxInput) {
  const requiredRoles = visibleRequiredRoles(input.approverRole);
  if (requiredRoles !== null && requiredRoles.length === 0) {
    return []; // 该角色无任何审批权
  }

  const where: any = { status: APPROVAL_STATUS.PENDING };
  if (requiredRoles !== null) {
    where.requiredRole = { in: requiredRoles };
  }

  // 域隔离：非 ALL 域仅看本域（单据域为空视为不限域，一并可见）
  const scope = input.approverSalesType;
  if (scope && scope !== 'ALL') {
    where.OR = [{ salesType: scope }, { salesType: null }];
  }

  const list = await prisma.approval.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      entityCode: true,
      title: true,
      submitterName: true,
      salesType: true,
      requiredRole: true,
      status: true,
      createdAt: true,
    },
  });

  return list;
}

// ───────────────────────────────────────────────────────────
// 已办列表（已通过 / 已驳回）
// ───────────────────────────────────────────────────────────
export async function listDone(input: ListInboxInput) {
  const requiredRoles = visibleRequiredRoles(input.approverRole);
  if (requiredRoles !== null && requiredRoles.length === 0) {
    return [];
  }

  const where: any = { status: { not: APPROVAL_STATUS.PENDING } };
  if (requiredRoles !== null) {
    where.requiredRole = { in: requiredRoles };
  }

  const scope = input.approverSalesType;
  if (scope && scope !== 'ALL') {
    where.OR = [{ salesType: scope }, { salesType: null }];
  }

  const list = await prisma.approval.findMany({
    where,
    orderBy: { decidedAt: 'desc' },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      entityCode: true,
      title: true,
      submitterName: true,
      salesType: true,
      requiredRole: true,
      status: true,
      approverName: true,
      decidedAt: true,
      rejectReason: true,
      createdAt: true,
    },
  });

  return list;
}

// ───────────────────────────────────────────────────────────
// 单据审批详情（含轨迹）
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
