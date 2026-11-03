// ============================================================
// 审批引擎常量 —— 支线4 OA-APPROVAL-FLOW (刘总 2026-11-02 拍板)
// 单据类型、所需审批角色映射、审批态、审批动作、域/角色校验辅助。
// ============================================================
import { Role, resolveRole, isLeadRole, deriveSalesType } from './roles';

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

// ============================================================
// 支线5 OA-APPROVAL-CONFIG：规则驱动的审批级模型
// 取代写死的 DOC_REQUIRED_ROLE，支持多级审批 + 多人会签 + 分域。
// ============================================================

/** 审批人类型（规则每级指定谁来批） */
export type ApproverType = 'MANAGER' | 'FINANCE' | 'ADMIN';

/** 审批级销售域范围（D3） */
export type SalesScope = 'INTERNAL' | 'EXTERNAL' | 'ALL' | null;

/** 会签模式（D4）：单人批 / 多人会签(全部签完才过) */
export type Countersign = 'SINGLE' | 'ALL';

/** 单级审批配置 */
export interface ApprovalLevel {
  order: number; // 顺序（0-based，建议与数组下标一致）
  approverType: ApproverType; // 谁批
  salesTypeScope: SalesScope; // 分域范围（null 视为 ALL：不额外限定，按单据域隔离）
  countersign: Countersign; // 单人批 / 会签
}

/** 校验单级配置结构的合法性（用于后端保存校验） */
export function isApprovalLevel(v: any): v is ApprovalLevel {
  if (!v || typeof v !== 'object') return false;
  const { approverType, salesTypeScope, countersign } = v as ApprovalLevel;
  if (!['MANAGER', 'FINANCE', 'ADMIN'].includes(approverType)) return false;
  if (!['SINGLE', 'ALL'].includes(countersign)) return false;
  if (!(salesTypeScope === null || salesTypeScope === 'INTERNAL' || salesTypeScope === 'EXTERNAL' || salesTypeScope === 'ALL')) return false;
  return true;
}

/**
 * 按审批级配置推导「该级在现有用户中的合格审批人」所需匹配的角色集合（不含 ADMIN 绕过）。
 * - MANAGER -> 任一销售域主管（INTERNAL_LEAD / EXTERNAL_LEAD）
 * - FINANCE -> FINANCE
 * - ADMIN   -> ADMIN
 * 返回的角色用于查询 User 表，不含 ADMIN 超级绕过（ADMIN 永远可审，但不作为某级的"成员"计入会签）。
 */
export function levelMatchedRoles(level: ApprovalLevel): Role[] {
  switch (level.approverType) {
    case 'MANAGER':
      return ['INTERNAL_LEAD', 'EXTERNAL_LEAD'];
    case 'FINANCE':
      return ['FINANCE'];
    case 'ADMIN':
      return ['ADMIN'];
  }
}

/**
 * 该审批人是否「有资格」在当前级审批本单据（角色闸门 + 文档域 + 审批人域隔离）。
 * ADMIN 始终放行（超级绕过）；其余须角色匹配 approverType，且：
 *   - 文档销售域须匹配级的限定 scope（scope=INTERNAL -> 单据须 INTERNAL；EXTERNAL 同理）；
 *   - scope 为 null/ALL 时，按「审批人销售域 vs 单据销售域」做域隔离。
 * 用于 approve/reject 的权限校验，以及 inbox/done 的可见性推导。
 */
export function canApproveByLevel(
  approverRole: string,
  approverSalesType: string | null | undefined,
  level: ApprovalLevel,
  docSalesType?: string | null
): boolean {
  const r = resolveRole(approverRole);

  // 1) 管理员绕过一切
  if (r === 'ADMIN') return true;

  // 2) 角色闸门
  const matched = levelMatchedRoles(level);
  if (!matched.includes(r)) return false;

  // 3) 文档域闸门：级的 scope 限定了该级"处理哪类单据"。
  //    scope=INTERNAL/EXTERNAL 时，单据销售域必须与之相等，否则该级不受理此单据（跨域拦截）。
  //    scope=null/ALL 时不限制单据域，退回按审批人域隔离。
  if (level.salesTypeScope === 'INTERNAL' && docSalesType !== 'INTERNAL') return false;
  if (level.salesTypeScope === 'EXTERNAL' && docSalesType !== 'EXTERNAL') return false;

  // 4) 审批人域隔离（仅在 scope=null/ALL 时生效，按单据域约束审批人）
  let constraint: 'INTERNAL' | 'EXTERNAL' | null = null;
  if (level.salesTypeScope === 'INTERNAL') constraint = 'INTERNAL';
  else if (level.salesTypeScope === 'EXTERNAL') constraint = 'EXTERNAL';
  else if (docSalesType === 'INTERNAL') constraint = 'INTERNAL';
  else if (docSalesType === 'EXTERNAL') constraint = 'EXTERNAL';

  if (constraint === null) return true; // 不限域
  const approverDomain = approverSalesType ?? deriveSalesType(r);
  if (approverDomain === 'ALL') return true; // 全域角色（FINANCE 等）放行
  return approverDomain === constraint;
}
