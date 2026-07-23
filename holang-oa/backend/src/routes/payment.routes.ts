import express from 'express';
import { authenticate } from '../middleware/auth';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

// 回款接口统一挂载销售域隔离（D1 复用 salesType.ts）：服务端强制域内可见/可建。
router.get('/', authenticate, enforceSalesTypeScope, paymentController.getPayments);
router.get('/:id', authenticate, enforceSalesTypeScope, paymentController.getPaymentById);
router.post('/', authenticate, enforceSalesTypeScope, paymentController.createPayment);
router.put('/:id', authenticate, enforceSalesTypeScope, paymentController.updatePayment);

export default router;
