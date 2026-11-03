// ============================================================
// 审批规则配置路由 —— 支线5 OA-APPROVAL-CONFIG（ADMIN 专属）
// 全部挂 authenticate；ADMIN 鉴权在控制器内做（也可在此加 requireAdmin）。
// ============================================================
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as approvalRuleController from '../controllers/approvalRule.controller';

const router = Router();

router.get('/', authenticate, approvalRuleController.listRules);
router.put('/:entityType', authenticate, approvalRuleController.upsertRule);

export default router;
