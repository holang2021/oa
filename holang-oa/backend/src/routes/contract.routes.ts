import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as contractController from '../controllers/contract.controller';

const router = Router();

// 合同接口统一挂载销售域隔离（D1/D3 复用 salesType.ts）：内销商务合同服务端强制 INTERNAL 域。
router.get('/', authenticate, enforceSalesTypeScope, contractController.getContracts);
router.get('/:id', authenticate, enforceSalesTypeScope, contractController.getContractById);
router.post('/', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'INTERNAL_SALES', 'INTERNAL_LEAD']), contractController.createContract);
router.post('/:id/confirm', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'INTERNAL_LEAD']), contractController.confirmContract);
router.put('/:id', authenticate, enforceSalesTypeScope, authorize(['ADMIN', 'MANAGER', 'INTERNAL_SALES', 'INTERNAL_LEAD']), contractController.updateContract);
router.delete('/:id', authenticate, enforceSalesTypeScope, authorize(['ADMIN']), contractController.deleteContract);

export default router;
