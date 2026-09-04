import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as customerAiController from '../controllers/customerAi.controller';

const router = Router();

// 全部接口继承 authenticate（JWT）；客户可见性 RBAC 在控制器内校验
router.get('/:customerId/history', authenticate, customerAiController.getHistory);
router.post('/:customerId/chat', authenticate, customerAiController.chat);
router.post('/:customerId/summary', authenticate, customerAiController.summarize);
router.post('/:customerId/extract', authenticate, customerAiController.extract);

export default router;
