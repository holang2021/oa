import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as feishuWikiController from '../controllers/feishuWiki.controller';

const router = Router();

// 连通性校验 + 设置：仅 ADMIN
router.post('/setup/verify', authenticate, authorize(['ADMIN']), feishuWikiController.verify);
router.get('/settings', authenticate, authorize(['ADMIN']), feishuWikiController.getSettings);
router.put('/settings', authenticate, authorize(['ADMIN']), feishuWikiController.updateSettings);

// 检索 + 正文调取：登录用户（沟通档案为团队复用资产）
router.get('/records', authenticate, feishuWikiController.getRecords);
router.get('/records/:id/content', authenticate, feishuWikiController.getRecordContent);

// 重推 + 批量：仅 ADMIN
router.post('/records/:oaRecordId/resync', authenticate, authorize(['ADMIN']), feishuWikiController.resync);
router.post('/batch-sync', authenticate, authorize(['ADMIN']), feishuWikiController.batchSync);

export default router;
