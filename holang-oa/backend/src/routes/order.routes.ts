import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceSalesTypeScope } from '../middleware/salesType';
import * as orderController from '../controllers/order.controller';

const router = Router();

// 订单接口统一挂载销售域隔离（D1 复用 salesType.ts）：服务端强制域内可见/可建。
router.get('/', authenticate, enforceSalesTypeScope, orderController.getOrders);
router.get('/:id', authenticate, enforceSalesTypeScope, orderController.getOrderById);
router.post('/', authenticate, enforceSalesTypeScope, orderController.createOrder);
router.put('/:id', authenticate, enforceSalesTypeScope, orderController.updateOrder);

export default router;
