// ============================================================
// 企业邮箱绑定路由 —— 邮件归集 Phase 1
// POST   /email-bindings          绑定（加密授权码 + 触发首同步）
// GET    /email-bindings          列表
// DELETE /email-bindings/:id      解绑
// POST   /email-bindings/:id/sync 手动同步
// ============================================================
import express from 'express';
import { authenticate } from '../middleware/auth';
import * as emailBindingsController from '../controllers/emailBindings.controller';

const router = express.Router();

router.get('/', authenticate, emailBindingsController.listBindings);
router.post('/', authenticate, emailBindingsController.createBinding);
router.delete('/:id', authenticate, emailBindingsController.deleteBinding);
router.post('/:id/sync', authenticate, emailBindingsController.triggerSync);

export default router;
