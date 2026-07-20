import express from 'express';
import { authenticate } from '../middleware/auth';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

router.get('/', authenticate, paymentController.getPayments);
router.get('/:id', authenticate, paymentController.getPaymentById);
router.post('/', authenticate, paymentController.createPayment);
router.put('/:id', authenticate, paymentController.updatePayment);

export default router;
