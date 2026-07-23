import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as piController from '../controllers/pi.controller';

const router = Router();

// 外销 PI 接口统一挂载销售域隔离（D2 复用 salesType.ts）：仅 EXTERNAL 域可见/可建。
router.get('/', authenticate, enforceSalesTypeScope, piController.getPis);
router.get('/:id', authenticate, enforceSalesTypeScope, piController.getPiById);
router.post('/', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'EXTERNAL_SALES', 'EXTERNAL_LEAD']), piController.createPi);
router.post('/:id/confirm', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'EXTERNAL_LEAD']), piController.confirmPi);
router.put('/:id', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'EXTERNAL_SALES', 'EXTERNAL_LEAD']), piController.updatePi);
router.delete('/:id', authenticate, enforceSalesTypeScope, authorize(['ADMIN']), piController.deletePi);

export default router;
