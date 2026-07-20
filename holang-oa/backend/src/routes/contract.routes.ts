import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as contractController from '../controllers/contract.controller';

const router = Router();

router.get('/', authenticate, contractController.getContracts);
router.get('/:id', authenticate, contractController.getContractById);
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), contractController.createContract);
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), contractController.updateContract);
router.delete('/:id', authenticate, authorize(['ADMIN']), contractController.deleteContract);

export default router;
