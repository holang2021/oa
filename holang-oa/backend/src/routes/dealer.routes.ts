import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as dealerController from '../controllers/dealer.controller';

const router = Router();

router.get('/', authenticate, dealerController.getDealerReports);
router.get('/:id', authenticate, dealerController.getDealerReportById);
router.post('/submit', authenticate, dealerController.submitDealerReport);
router.put('/:id/review', authenticate, authorize(['ADMIN', 'MANAGER']), dealerController.reviewDealerReport);
router.delete('/:id', authenticate, authorize(['ADMIN']), dealerController.deleteDealerReport);

export default router;
