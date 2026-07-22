// ============================================================
// HOLANG OA 统一角色模型（批次0 地基）
// 权威角色集合：8 角色。所有 RBAC / 鉴权 / 企微同步 以此为唯一来源。
// 设计原则：
//   1. 角色是字符串常量（SQLite 兼容，User.role 为 String）。
//   2. 保留对历史角色(SALES/MANAGER/VIEWER)的向后兼容映射，避免存量数据登录失败。
//   3. 8 角色映射为销售域隔离(salesType)：内销域 / 外销域 / 全域。
//   4. 导出（批量下载）权限仅 ADMIN / FINANCE（H-2 防下载硬约束）。
// ============================================================
import { z } from 'zod';

/** 8 个权威角色 */
export const ROLES = {
  ADMIN: 'ADMIN', // 管理员
  FINANCE: 'FINANCE', // 财务
  INTERNAL_SALES: 'INTERNAL_SALES', // 内销销售
  EXTERNAL_SALES: 'EXTERNAL_SALES', // 外销销售
  INTERNAL_LEAD: 'INTERNAL_LEAD', // 内销主管
  EXTERNAL_LEAD: 'EXTERNAL_LEAD', // 外销主管
  AFTER_SALES: 'AFTER_SALES', // 售后
  READONLY_AUDIT: 'READONLY_AUDIT', // 只读审计
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** zod 入参校验：角色必须是 8 个权威角色之一 */
export const RoleSchema = z.enum([
  ROLES.ADMIN,
  ROLES.FINANCE,
  ROLES.INTERNAL_SALES,
  ROLES.EXTERNAL_SALES,
  ROLES.INTERNAL_LEAD,
  ROLES.EXTERNAL_LEAD,
  ROLES.AFTER_SALES,
  ROLES.READONLY_AUDIT,
]);

/** 销售域：内销 / 外销 / 全域(跨域可见) */
export type SalesType = 'INTERNAL' | 'EXTERNAL' | 'ALL';

/**
 * 历史角色 -> 权威角色 的向后兼容映射。
 * 存量数据若仍使用 SALES/MANAGER/VIEWER，按最小权限原则映射，避免鉴权失效。
 */
const ROLE_ALIASES: Record<string, Role> = {
  ADMIN: ROLES.ADMIN,
  FINANCE: ROLES.FINANCE,
  SALES: ROLES.INTERNAL_SALES, // 历史销售 -> 内销销售
  INTERNAL_SALES: ROLES.INTERNAL_SALES,
  EXTERNAL_SALES: ROLES.EXTERNAL_SALES,
  MANAGER: ROLES.INTERNAL_LEAD, // 历史主管 -> 内销主管
  INTERNAL_LEAD: ROLES.INTERNAL_LEAD,
  EXTERNAL_LEAD: ROLES.EXTERNAL_LEAD,
  AFTER_SALES: ROLES.AFTER_SALES,
  VIEWER: ROLES.READONLY_AUDIT, // 历史只读 -> 只读审计
  READONLY_AUDIT: ROLES.READONLY_AUDIT,
};

/**
 * 将任意(可能历史)角色字符串解析为权威 8 角色。
 * 未知/空角色按最小权限回退为 INTERNAL_SALES。
 */
export function resolveRole(raw: string | null | undefined): Role {
  if (!raw) return ROLES.INTERNAL_SALES;
  const canonical = ROLE_ALIASES[raw];
  return canonical ?? ROLES.INTERNAL_SALES;
}

export function isCanonicalRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role);
}

/**
 * 由角色派生销售域隔离标签(salesType)。
 * 主管(LEAD)跟随其负责域；全域角色(ADMIN/FINANCE/AFTER_SALES/READONLY_AUDIT)可见全部。
 */
export function deriveSalesType(role: Role): SalesType {
  switch (role) {
    case ROLES.INTERNAL_SALES:
    case ROLES.INTERNAL_LEAD:
      return 'INTERNAL';
    case ROLES.EXTERNAL_SALES:
    case ROLES.EXTERNAL_LEAD:
      return 'EXTERNAL';
    default:
      return 'ALL';
  }
}

/** 是否纯销售角色（仅看自己名下数据，不可跨域不可看全量） */
export function isSalesOnlyRole(role: Role): boolean {
  return role === ROLES.INTERNAL_SALES || role === ROLES.EXTERNAL_SALES;
}

/** 是否主管角色（看其负责域全量） */
export function isLeadRole(role: Role): boolean {
  return role === ROLES.INTERNAL_LEAD || role === ROLES.EXTERNAL_LEAD;
}

/** 是否具备全域权限（跨内外销可见） */
export function isCrossDomainRole(role: Role): boolean {
  return deriveSalesType(role) === 'ALL';
}

// ───────────────────────────────────────────────────────────
// 导出(批量下载)权限：仅 ADMIN / FINANCE（H-2 防下载硬约束）
// ───────────────────────────────────────────────────────────
export const EXPORT_ALLOWED_ROLES: Role[] = [ROLES.ADMIN, ROLES.FINANCE];

export function canExport(role: Role): boolean {
  return EXPORT_ALLOWED_ROLES.includes(role);
}

// ───────────────────────────────────────────────────────────
// 角色权限矩阵（用于 /rbac/roles 端点与文档）
// ───────────────────────────────────────────────────────────
export interface RolePermission {
  role: Role;
  label: string;
  description: string;
  salesType: SalesType; // 默认可见销售域
  canExport: boolean; // 可批量导出
  isSuperAdmin: boolean; // 绕过一切 RBAC
}

export const ROLE_PERMISSIONS: Record<Role, RolePermission> = {
  [ROLES.ADMIN]: {
    role: ROLES.ADMIN,
    label: '管理员',
    description: '系统最高权限，可跨域、可导出、可配置角色与同步',
    salesType: 'ALL',
    canExport: true,
    isSuperAdmin: true,
  },
  [ROLES.FINANCE]: {
    role: ROLES.FINANCE,
    label: '财务',
    description: '财务数据权限，可导出订单/回款/开票，跨域可见',
    salesType: 'ALL',
    canExport: true,
    isSuperAdmin: false,
  },
  [ROLES.INTERNAL_SALES]: {
    role: ROLES.INTERNAL_SALES,
    label: '内销销售',
    description: '仅负责内销客户/订单，仅看本人名下数据',
    salesType: 'INTERNAL',
    canExport: false,
    isSuperAdmin: false,
  },
  [ROLES.EXTERNAL_SALES]: {
    role: ROLES.EXTERNAL_SALES,
    label: '外销销售',
    description: '仅负责外销客户/订单，仅看本人名下数据',
    salesType: 'EXTERNAL',
    canExport: false,
    isSuperAdmin: false,
  },
  [ROLES.INTERNAL_LEAD]: {
    role: ROLES.INTERNAL_LEAD,
    label: '内销主管',
    description: '内销域负责人，可见内销全量数据，不可导出',
    salesType: 'INTERNAL',
    canExport: false,
    isSuperAdmin: false,
  },
  [ROLES.EXTERNAL_LEAD]: {
    role: ROLES.EXTERNAL_LEAD,
    label: '外销主管',
    description: '外销域负责人，可见外销全量数据，不可导出',
    salesType: 'EXTERNAL',
    canExport: false,
    isSuperAdmin: false,
  },
  [ROLES.AFTER_SALES]: {
    role: ROLES.AFTER_SALES,
    label: '售后',
    description: '售后处理权限，跨域可见但不可导出',
    salesType: 'ALL',
    canExport: false,
    isSuperAdmin: false,
  },
  [ROLES.READONLY_AUDIT]: {
    role: ROLES.READONLY_AUDIT,
    label: '只读审计',
    description: '审计只读，跨域可见全部，不可写不可导出',
    salesType: 'ALL',
    canExport: false,
    isSuperAdmin: false,
  },
};

/** 返回 8 角色权限矩阵（供前端/企微展示） */
export function listRolePermissions(): RolePermission[] {
  return Object.values(ROLE_PERMISSIONS);
}
