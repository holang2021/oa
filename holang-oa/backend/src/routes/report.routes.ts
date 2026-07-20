import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as reportController from '../controllers/report.controller';

const router = Router();

router.get('/', authenticate, reportController.getReports);
router.get('/:id', authenticate, reportController.getReportById);
router.post('/generate', authenticate, reportController.generateReport);
router.put('/:id', authenticate, reportController.updateReport);
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), reportController.deleteReport);
router.get('/export/:id', authenticate, reportController.exportReport);

export default router;
