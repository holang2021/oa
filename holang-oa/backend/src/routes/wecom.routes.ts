import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as wecomController from '../controllers/wecom.controller';

const router = Router();

router.get('/departments', authenticate, wecomController.getDepartments);
router.post('/sync', authenticate, authorize(['ADMIN']), wecomController.syncDepartments);
router.get('/users', authenticate, wecomController.getWecomUsers);
router.get('/contacts', authenticate, wecomController.getContacts);

export default router;
