import express from 'express';
import { authenticate } from '../middleware/auth';
import * as invoiceController from '../controllers/invoice.controller';

const router = express.Router();

router.get('/', authenticate, invoiceController.getInvoices);
router.get('/:id', authenticate, invoiceController.getInvoiceById);
router.post('/', authenticate, invoiceController.createInvoice);
router.put('/:id', authenticate, invoiceController.updateInvoice);

export default router;
