// ============================================================
// 企微角色同步骨架 —— 批次0 地基 (对应 D1 / 3项拍板②)
// 权威源：企微自建应用 HOLANG管理（AgentID 1000081）。
// 角色从企微同步；OA 本地可自定义，并可给企微回流建议。
// 系统记录源(SoR) = OA（见 constants/sor.ts）：同步写入以 OA 为准，
// 仅当企微侧角色与 OA 冲突且 OA 未自定义时，才以企微覆盖 OA。
// 本文件不依赖真实企微凭证；提供：① 企微用户→15角色 映射逻辑
// ② 基于本地 WecomDepartment/User 的 dry-run 同步 ③ 向企微回流建议。
// ============================================================
import {
  Role,
  ROLES,
  resolveRole,
  listRolePermissions,
} from '../constants/roles';
import { SYSTEM_OF_RECORD } from '../constants/sor';
import { logger } from '../utils/logger';
import { findUsersBoundToWecom, updateUserRole } from '../repositories/user.repository';

/** 企微权威应用配置（读取自 .env，缺省为空 → 进入本地 dry-run 模式） */
export const WECOM_RBAC_SOURCE = {
  appName: 'HOLANG管理',
  agentId: 1000081,
  corpId: process.env.WECOM_RBAC_CORPID || '',
  secret: process.env.WECOM_RBAC_SECRET || '',
};

export function isWecomRbacConfigured(): boolean {
  return Boolean(WECOM_RBAC_SOURCE.corpId && WECOM_RBAC_SOURCE.secret);
}

/**
 * 部门名/职位 → 8 角色的映射规则（可后续接线的核心逻辑）。
 * 优先按职位关键字，其次按部门名关键字。
 */
const DEPARTMENT_ROLE_RULES: Array<{ test: RegExp; role: Role }> = [
  { test: /财务|finance/i, role: ROLES.FINANCE },
  { test: /内销主管|内销经理|国内销售主管/i, role: ROLES.INTERNAL_LEAD },
  { test: /外销主管|外销经理|海外销售主管/i, role: ROLES.EXTERNAL_LEAD },
  { test: /市场|marketing|运营|品牌/i, role: ROLES.MARKETING },
  { test: /技术|研发|technolog|r&d|rd\b|工程/i, role: ROLES.TECHNOLOGY },
  { test: /生产|制造|pmc|车间/i, role: ROLES.PRODUCTION },
  { test: /行政|人事|hr|总经办|管理部/i, role: ROLES.ADMINISTRATION },
  { test: /采购|供应链|supply|sourcing/i, role: ROLES.PROCUREMENT },
  { test: /内销|国内销售|industrial/i, role: ROLES.INTERNAL_SALES },
  { test: /外销|海外销售|export|retail/i, role: ROLES.EXTERNAL_SALES },
  { test: /售后|服务/i, role: ROLES.AFTER_SALES },
  { test: /审计|合规/i, role: ROLES.READONLY_AUDIT },
  { test: / admin|管理员|管理/i, role: ROLES.ADMIN },
];

const POSITION_ROLE_RULES: Array<{ test: RegExp; role: Role }> = [
  { test: /财务|finance/i, role: ROLES.FINANCE },
  // 外销主管优先于通用「主管」规则，避免误归内销域
  { test: /外销主管|海外销售主管/i, role: ROLES.EXTERNAL_LEAD },
  { test: /内销主管|国内销售主管/i, role: ROLES.INTERNAL_LEAD },
  { test: /市场|marketing|运营/i, role: ROLES.MARKETING },
  { test: /技术|研发|r&d|rd\b|工程/i, role: ROLES.TECHNOLOGY },
  { test: /生产|制造|pmc/i, role: ROLES.PRODUCTION },
  { test: /行政|人事|hr/i, role: ROLES.ADMINISTRATION },
  { test: /采购|供应链|sourcing/i, role: ROLES.PROCUREMENT },
  { test: /主管|经理|leader|manager/i, role: ROLES.INTERNAL_LEAD }, // 通用主管默认内销域
  { test: /售后|服务/i, role: ROLES.AFTER_SALES },
  { test: /审计|合规/i, role: ROLES.READONLY_AUDIT },
  { test: /admin|管理员/i, role: ROLES.ADMIN },
];

/**
 * 将企微用户（部门名数组 + 职位）映射为 8 角色之一。
 * 返回权威角色；无法识别时回退 INTERNAL_SALES（最小权限）。
 */
export function mapWecomUserToRole(
  deptNames: string[],
  position: string
): Role {
  const hayDept = (deptNames || []).join(' ');
  const hayPos = position || '';

  // 职位优先（主管/财务等明确职位）
  for (const rule of POSITION_ROLE_RULES) {
    if (rule.test.test(hayPos)) return rule.role;
  }
  // 部门名
  for (const rule of DEPARTMENT_ROLE_RULES) {
    if (rule.test.test(hayDept)) return rule.role;
  }
  return ROLES.INTERNAL_SALES;
}

export interface RoleSyncChange {
  userId: string;
  wecomUserId: string | null;
  name: string;
  deptNames: string[];
  position: string;
  currentRole: Role;
  wecomSuggestedRole: Role;
  /** 是否应用本次变更（OA 未自定义 且 与企微不一致） */
  apply: boolean;
  reason: string;
}

export interface RoleSyncResult {
  mode: 'LIVE' | 'DRY_RUN';
  source: { appName: string; agentId: number };
  systemOfRecord: string;
  total: number;
  changes: RoleSyncChange[];
  /** 向企微回流的建议（OA 自定义了角色，企微侧应跟随） */
  backflowSuggestions: Array<{ wecomUserId: string; role: Role; reason: string }>;
}

/**
 * 执行角色同步（骨架）。
 * 当配置了企微凭证 → 未来在此拉取真实通讯录；当前未配置 → 基于本地
 * WecomDepartment + User 做 dry-run，验证映射逻辑可跑通、可后续接线。
 * apply=true 时仅对「OA 未自定义」且「与企微不一致」的用户落库（SoR=OA 优先）。
 */
export async function syncRolesFromWecom(apply: boolean = false): Promise<RoleSyncResult> {
  const mode: 'LIVE' | 'DRY_RUN' = isWecomRbacConfigured() ? 'LIVE' : 'DRY_RUN';

  // 本地数据源：已绑定 wecomUserId 的 OA 用户 + 部门名
  const users = await findUsersBoundToWecom();

  const changes: RoleSyncChange[] = [];
  const backflowSuggestions: RoleSyncResult['backflowSuggestions'] = [];

  for (const u of users) {
    const deptNames = (u as any).departments ? JSON.parse((u as any).departments) : (u.department ? [u.department] : []);
    const suggested = mapWecomUserToRole(deptNames, u.department || '');
    const current = resolveRole(u.role);

    const oaCustomized = u.role !== resolveRole(u.role); // 若 DB 值非权威角色，视为自定义
    const differs = suggested !== current;

    if (differs) {
      if (!oaCustomized) {
        // OA 未自定义 → 以企微为准（仅 dry-run 预览或 apply 落库）
        changes.push({
          userId: u.id,
          wecomUserId: u.wecomUserId,
          name: u.name,
          deptNames,
          position: u.department || '',
          currentRole: current,
          wecomSuggestedRole: suggested,
          apply: apply && mode === 'LIVE', // 未配置企微凭证时即便 apply 也不写，避免误改
          reason: '企微角色与 OA 不一致，且 OA 未自定义，以企微为准',
        });
      } else {
        // OA 已自定义 → SoR=OA，给企微回流建议
        backflowSuggestions.push({
          wecomUserId: u.wecomUserId as string,
          role: current,
          reason: 'OA 已自定义角色，建议企微侧跟随 OA(SoR)',
        });
        changes.push({
          userId: u.id,
          wecomUserId: u.wecomUserId,
          name: u.name,
          deptNames,
          position: u.department || '',
          currentRole: current,
          wecomSuggestedRole: suggested,
          apply: false,
          reason: 'OA 已自定义角色，保留 OA(SoR)，不做覆盖',
        });
      }
    }
  }

  if (apply && mode === 'LIVE') {
    // 仅落库 apply=true 的变更（SoR=OA 原则下允许企微→OA 单向覆盖未自定义项）
    const toApply = changes.filter((c) => c.apply);
    for (const c of toApply) {
      await updateUserRole(c.userId, c.wecomSuggestedRole);
    }
    logger.info({ count: toApply.length }, 'rbac sync applied (wecom->oa)');
  }

  return {
    mode,
    source: { appName: WECOM_RBAC_SOURCE.appName, agentId: WECOM_RBAC_SOURCE.agentId },
    systemOfRecord: SYSTEM_OF_RECORD,
    total: users.length,
    changes,
    backflowSuggestions,
  };
}

/** 返回 8 角色权限矩阵（供同步端点/前端展示） */
export function getRoleMatrix() {
  return {
    systemOfRecord: SYSTEM_OF_RECORD,
    source: { appName: WECOM_RBAC_SOURCE.appName, agentId: WECOM_RBAC_SOURCE.agentId },
    roles: listRolePermissions(),
  };
}
