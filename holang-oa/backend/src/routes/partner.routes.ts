import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as partnerController from '../controllers/partner.controller';

const router = Router();

router.get('/', authenticate, partnerController.getPartners);
router.get('/check-duplicate', authenticate, partnerController.checkPartnerDuplicate);
router.get('/:id', authenticate, partnerController.getPartnerById);
router.get('/:id/review-checks', authenticate, partnerController.getPartnerReviewChecks);
router.post('/', authenticate, partnerController.createPartner);
router.put('/:id', authenticate, partnerController.updatePartner);
router.put('/:id/review', authenticate, authorize(['ADMIN', 'INTERNAL_LEAD', 'EXTERNAL_LEAD', 'MANAGER']), partnerController.reviewPartner);
router.delete('/:id', authenticate, authorize(['ADMIN']), partnerController.deletePartner);

export default router;
