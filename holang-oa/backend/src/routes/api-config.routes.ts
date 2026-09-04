import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as apiConfigController from '../controllers/api-config.controller';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN']), apiConfigController.getConfigs);
router.put('/:provider', authenticate, authorize(['ADMIN']), apiConfigController.updateConfig);
router.post('/:provider/test', authenticate, authorize(['ADMIN']), apiConfigController.testConnection);

export default router;
