import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as wecomController from '../controllers/wecom.controller';

const router = Router();

router.get('/departments', authenticate, authorize(['ADMIN']), wecomController.getDepartments);
router.post('/sync', authenticate, authorize(['ADMIN']), wecomController.syncDepartments);
router.get('/users', authenticate, authorize(['ADMIN']), wecomController.getWecomUsers);
router.get('/contacts', authenticate, wecomController.getContacts);
router.post('/test-connection', authenticate, authorize(['ADMIN']), wecomController.testConnection);

export default router;
