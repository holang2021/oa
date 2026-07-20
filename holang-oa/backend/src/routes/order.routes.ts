import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as orderController from '../controllers/order.controller';

const router = Router();

router.get('/', authenticate, orderController.getOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.post('/', authenticate, orderController.createOrder);
router.put('/:id', authenticate, orderController.updateOrder);

export default router;
