// ============================================================
// RBAC 路由 —— 批次0 地基
// 角色矩阵 / 当前身份 / 企微同步 / 审计日志。
// 导出(批量下载)硬约束见 D1；本路由不含导出端点。
// ============================================================
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { ROLES } from '../constants/roles';
import * as rbacController from '../controllers/rbac.controller';

const router = Router();

// 8 角色权限矩阵（配置层：仅 ADMIN 可读）
router.get('/roles', authenticate, authorize([ROLES.ADMIN]), rbacController.getRoles);

// 当前用户角色/销售域/权限
router.get('/me', authenticate, rbacController.getMe);

// 身份/视图模式切换审计（配置层：仅 ADMIN 可记录，普通用户无此入口）
router.post('/view-mode', authenticate, authorize([ROLES.ADMIN]), rbacController.recordViewMode);

// 触发企微(1000081)角色同步骨架（仅 ADMIN）
router.post('/sync', authenticate, authorize([ROLES.ADMIN]), rbacController.syncRoles);

// 审计日志查询（仅 ADMIN / 只读审计）
router.get(
  '/audit',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.READONLY_AUDIT]),
  rbacController.getAuditLogs
);

export default router;
