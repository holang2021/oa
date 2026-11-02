// ============================================================
// 审批引擎路由 —— 支线4 OA-APPROVAL-FLOW
// 全部挂 authenticate；审批权的角色/域校验在服务内完成。
// ═══ 注意：/doc 为精确 GET 路径，不与 /:id/* 冲突 ═══
// ============================================================
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as approvalController from '../controllers/approval.controller';

const router = Router();

router.post('/submit', authenticate, approvalController.submit);
router.post('/:id/approve', authenticate, approvalController.approve);
router.post('/:id/reject', authenticate, approvalController.reject);
router.post('/:id/resubmit', authenticate, approvalController.resubmit);
router.get('/inbox', authenticate, approvalController.inbox);
router.get('/done', authenticate, approvalController.done);
router.get('/doc', authenticate, approvalController.doc);

export default router;
