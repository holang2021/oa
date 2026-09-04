// ============================================================
// RBAC 控制器 —— 批次0 地基
// 只接参 / 返响应；业务委托 rbac-sync.service / audit.service。
// ============================================================
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getRoleMatrix,
  syncRolesFromWecom,
} from '../services/rbac-sync.service';
import { queryAuditLogs } from '../services/audit.service';
import { createAuditLog } from '../repositories/audit-log.repository';
import { resolveRole, deriveSalesType, listRolePermissions } from '../constants/roles';

/** GET /rbac/roles —— 8 角色权限矩阵 */
export const getRoles = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ code: 0, message: '获取成功', data: getRoleMatrix() });
  } catch (error) {
    return next(error);
  }
};

/** GET /rbac/me —— 当前用户角色 / 销售域 / 权限 */
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = resolveRole(req.user.role);
    const salesType = deriveSalesType(role);
    const permissions = listRolePermissions().find((r) => r.role === role);
    return res.json({
      code: 0,
      message: '获取成功',
      data: {
        id: req.user.id,
        name: req.user.name,
        role,
        salesType,
        permissions,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /rbac/sync —— 触发企微(1000081)角色同步骨架。
 * ADMIN 专用。apply=true 才落库未自定义项（SoR=OA 优先）。
 */
export const syncRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apply = req.query.apply === 'true' || req.body?.apply === true;
    const result = await syncRolesFromWecom(apply);
    return res.json({ code: 0, message: '同步完成', data: result });
  } catch (error) {
    return next(error);
  }
};

/** GET /rbac/audit —— 审计日志查询（ADMIN / 只读审计） */
export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 200);
    const offset = parseInt((req.query.offset as string) || '0', 10) || 0;
    const result = await queryAuditLogs({
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
      entity: req.query.entity as string | undefined,
      limit,
      offset,
    });
    return res.json({ code: 0, message: '获取成功', data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /rbac/view-mode —— 记录身份/视图模式切换（用户↔管理员）。
 * 仅 ADMIN 可调（路由层已 authorize([ADMIN])）。落审计日志，满足配置层切换可审计要求。
 */
export const recordViewMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mode = req.body?.mode; // 'user' | 'admin'
    if (mode !== 'user' && mode !== 'admin') {
      return res.status(400).json({ code: 400, message: '非法模式', data: null });
    }
    const role = resolveRole(req.user.role);
    await createAuditLog({
      userId: req.user.id,
      action: 'VIEW_SWITCH',
      entity: 'view_mode',
      entityId: req.user.id,
      salesType: deriveSalesType(role),
      result: 'SUCCESS',
      detail: { mode, from: req.body?.from || null },
      traceId: req.traceId,
    });
    return res.json({ code: 0, message: '已记录', data: { mode } });
  } catch (error) {
    return next(error);
  }
};
