// ============================================================
// 审批引擎常量 —— 支线4 OA-APPROVAL-FLOW (刘总 2026-11-02 拍板)
// 单据类型、所需审批角色映射、审批态、审批动作、域/角色校验辅助。
// ============================================================
import { Role, resolveRole, isLeadRole } from './roles';

/** 支持审批的单据类型 */
export const ENTITY_TYPE = {
  CONTRACT: 'CONTRACT',
  PI: 'PI',
  ORDER: 'ORDER',
  INVOICE: 'INVOICE',
  DELIVERY: 'DELIVERY',
  DEALER_REPORT: 'DEALER_REPORT',
} as const;

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

/** 全部支持的单据类型（用于入参校验） */
export const ENTITY_TYPES: EntityType[] = Object.values(ENTITY_TYPE);

/** 审批态 */
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

/** 审批动作（写入 ApprovalStep.action） */
export const APPROVAL_ACTION = {
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RESUBMIT: 'RESUBMIT',
} as const;

export type ApprovalAction = (typeof APPROVAL_ACTION)[keyof typeof APPROVAL_ACTION];

/**
 * 审批所需角色。
 * - 'MANAGER' 为伪角色：语义上表示"任一销售域主管"（内销主管 / 外销主管，域由单据 salesType 决定）。
 *   角色模型中没有单一 'MANAGER' 权威角色（历史别名 MANAGER→INTERNAL_LEAD），故此处用伪角色表达"主管类"。
 * - 'FINANCE' 为权威角色，财务可审。
 * 注意：Role 联合类型不含 'MANAGER'，故这里用扩展类型 ApproverRole。
 */
export type ApproverRole = Role | 'MANAGER';

/**
 * 单据 -> 所需审批角色（刘总 2026-11-02 规则）：
 *   合同/PI/订单 -> 主管（内销/外销主管，按域）
 *   发票         -> 财务
 *   发货/经销商报备 -> 主管
 * 客户/商机/报价 不进审批流，不在本映射内。
 */
export const DOC_REQUIRED_ROLE: Record<EntityType, ApproverRole> = {
  [ENTITY_TYPE.CONTRACT]: 'MANAGER',
  [ENTITY_TYPE.PI]: 'MANAGER',
  [ENTITY_TYPE.ORDER]: 'MANAGER',
  [ENTITY_TYPE.INVOICE]: 'FINANCE',
  [ENTITY_TYPE.DELIVERY]: 'MANAGER',
  [ENTITY_TYPE.DEALER_REPORT]: 'MANAGER',
};

/**
 * 审批权校验（核心域隔离 + 角色闸门）。
 * @param approverRole     审批人原始角色（任意可能历史字符串，内部 resolveRole）
 * @param approverSalesType 审批人销售域（req.user.salesType：INTERNAL/EXTERNAL/ALL/NONE）
 * @param requiredRole     单据所需角色（来自 Approval.requiredRole：MANAGER / FINANCE）
 * @param docSalesType     单据销售域（Approval.salesType：INTERNAL/EXTERNAL，可空）
 * @returns 是否有权审批
 *
 * 规则：
 *   1) ADMIN 全域放行；
 *   2) requiredRole='MANAGER' -> 审批人须为任一主管(LEAD)；
 *      requiredRole='FINANCE' -> 审批人角色须为 FINANCE；
 *   3) 域隔离：审批人销售域为 ALL 看全部；否则须与单据销售域一致（单据域为空视为不限域，可见）。
 */
export function canApprove(
  approverRole: string,
  approverSalesType: string | null | undefined,
  requiredRole: string,
  docSalesType?: string | null
): boolean {
  const r = resolveRole(approverRole);

  // 1) 管理员绕过一切
  if (r === 'ADMIN') return true;

  // 2) 角色闸门
  if (requiredRole === 'MANAGER') {
    // 伪角色：任一销售域主管均可（内销主管审内销、外销主管审外销，由下方域规则进一步限定）
    if (!isLeadRole(r)) return false;
  } else if (r !== requiredRole) {
    return false;
  }

  // 3) 域隔离
  if (approverSalesType === 'ALL' || approverSalesType === 'NONE') {
    // NONE（职能角色）本不应有审批权，但上面角色闸门已拦截；此处仅对 ALL 放行
    return approverSalesType === 'ALL';
  }
  if (!docSalesType) return true; // 单据无销售域 -> 不限域，可见可审
  return approverSalesType === docSalesType;
}

/**
 * 计算审批人在"待审/已办"列表中可见的 requiredRole 集合（用于 inbox/done 查询）。
 * 返回 null 表示可见全部（ADMIN）；返回空数组表示该角色无任何审批权。
 */
export function visibleRequiredRoles(approverRole: string): string[] | null {
  const r = resolveRole(approverRole);
  if (r === 'ADMIN') return null; // 全部
  if (isLeadRole(r)) return ['MANAGER'];
  if (r === 'FINANCE') return ['FINANCE'];
  return []; // 销售/职能等其他角色无审批权
}
