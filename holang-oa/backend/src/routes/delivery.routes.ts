import express from 'express';
import { authenticate } from '../middleware/auth';
import * as deliveryController from '../controllers/delivery.controller';

const router = express.Router();

router.get('/', authenticate, deliveryController.getDeliveries);
router.get('/:id', authenticate, deliveryController.getDeliveryById);
router.post('/', authenticate, deliveryController.createDelivery);
router.put('/:id', authenticate, deliveryController.updateDelivery);

export default router;
