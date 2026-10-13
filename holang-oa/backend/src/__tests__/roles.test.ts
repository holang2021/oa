import { describe, it, expect } from 'vitest';
import {
  ROLES,
  resolveRole,
  deriveSalesType,
  canExport,
  isSalesOnlyRole,
  isCrossDomainRole,
  isLeadRole,
  listRolePermissions,
} from '../constants/roles';
import { mapWecomUserToRole } from '../services/rbac-sync.service';

describe('roles: resolveRole (含历史角色向后兼容)', () => {
  it('权威角色原样返回', () => {
    expect(resolveRole('ADMIN')).toBe('ADMIN');
    expect(resolveRole('FINANCE')).toBe('FINANCE');
    expect(resolveRole('INTERNAL_SALES')).toBe('INTERNAL_SALES');
    expect(resolveRole('READONLY_AUDIT')).toBe('READONLY_AUDIT');
  });

  it('历史角色按最小权限映射', () => {
    expect(resolveRole('SALES')).toBe('INTERNAL_SALES');
    expect(resolveRole('MANAGER')).toBe('INTERNAL_LEAD');
    expect(resolveRole('VIEWER')).toBe('READONLY_AUDIT');
  });

  it('未知/空角色回退最小权限 INTERNAL_SALES', () => {
    expect(resolveRole('UNKNOWN')).toBe('INTERNAL_SALES');
    expect(resolveRole(null)).toBe('INTERNAL_SALES');
    expect(resolveRole(undefined)).toBe('INTERNAL_SALES');
    expect(resolveRole('')).toBe('INTERNAL_SALES');
  });
});

describe('roles: deriveSalesType 销售域隔离', () => {
  it('内销角色 => INTERNAL', () => {
    expect(deriveSalesType(ROLES.INTERNAL_SALES)).toBe('INTERNAL');
    expect(deriveSalesType(ROLES.INTERNAL_LEAD)).toBe('INTERNAL');
  });
  it('外销角色 => EXTERNAL', () => {
    expect(deriveSalesType(ROLES.EXTERNAL_SALES)).toBe('EXTERNAL');
    expect(deriveSalesType(ROLES.EXTERNAL_LEAD)).toBe('EXTERNAL');
  });
  it('全域角色 => ALL', () => {
    expect(deriveSalesType(ROLES.ADMIN)).toBe('ALL');
    expect(deriveSalesType(ROLES.FINANCE)).toBe('ALL');
    expect(deriveSalesType(ROLES.AFTER_SALES)).toBe('ALL');
    expect(deriveSalesType(ROLES.READONLY_AUDIT)).toBe('ALL');
  });
});

describe('roles: 导出权限（H-2 防下载硬约束）', () => {
  it('仅 ADMIN / FINANCE 可导出', () => {
    expect(canExport(ROLES.ADMIN)).toBe(true);
    expect(canExport(ROLES.FINANCE)).toBe(true);
    expect(canExport(ROLES.INTERNAL_SALES)).toBe(false);
    expect(canExport(ROLES.EXTERNAL_SALES)).toBe(false);
    expect(canExport(ROLES.INTERNAL_LEAD)).toBe(false);
    expect(canExport(ROLES.EXTERNAL_LEAD)).toBe(false);
    expect(canExport(ROLES.AFTER_SALES)).toBe(false);
    expect(canExport(ROLES.READONLY_AUDIT)).toBe(false);
  });
});

describe('roles: 角色分类辅助', () => {
  it('isSalesOnlyRole', () => {
    expect(isSalesOnlyRole(ROLES.INTERNAL_SALES)).toBe(true);
    expect(isSalesOnlyRole(ROLES.EXTERNAL_SALES)).toBe(true);
    expect(isSalesOnlyRole(ROLES.INTERNAL_LEAD)).toBe(false);
    expect(isSalesOnlyRole(ROLES.ADMIN)).toBe(false);
  });
  it('isLeadRole', () => {
    expect(isLeadRole(ROLES.INTERNAL_LEAD)).toBe(true);
    expect(isLeadRole(ROLES.EXTERNAL_LEAD)).toBe(true);
    expect(isLeadRole(ROLES.INTERNAL_SALES)).toBe(false);
  });
  it('isCrossDomainRole', () => {
    expect(isCrossDomainRole(ROLES.ADMIN)).toBe(true);
    expect(isCrossDomainRole(ROLES.FINANCE)).toBe(true);
    expect(isCrossDomainRole(ROLES.AFTER_SALES)).toBe(true);
    expect(isCrossDomainRole(ROLES.READONLY_AUDIT)).toBe(true);
    expect(isCrossDomainRole(ROLES.INTERNAL_SALES)).toBe(false);
    expect(isCrossDomainRole(ROLES.INTERNAL_LEAD)).toBe(false);
  });
});

describe('roles: 权限矩阵', () => {
  it('恰好 15 个权威角色', () => {
    expect(listRolePermissions()).toHaveLength(15);
  });
});

describe('rbac-sync: mapWecomUserToRole 映射逻辑', () => {
  it('按部门名映射', () => {
    expect(mapWecomUserToRole(['财务部'], '')).toBe('FINANCE');
    expect(mapWecomUserToRole(['内销部'], '')).toBe('INTERNAL_SALES');
    expect(mapWecomUserToRole(['外销部'], '')).toBe('EXTERNAL_SALES');
    expect(mapWecomUserToRole(['售后服务中心'], '')).toBe('AFTER_SALES');
    expect(mapWecomUserToRole(['审计合规部'], '')).toBe('READONLY_AUDIT');
  });
  it('按职位映射优先', () => {
    expect(mapWecomUserToRole([], '内销主管')).toBe('INTERNAL_LEAD');
    expect(mapWecomUserToRole([], '外销主管')).toBe('EXTERNAL_LEAD');
    expect(mapWecomUserToRole([], '财务专员')).toBe('FINANCE');
  });
  it('无法识别回退最小权限', () => {
    expect(mapWecomUserToRole(['未知部门'], '打杂')).toBe('INTERNAL_SALES');
  });
});
