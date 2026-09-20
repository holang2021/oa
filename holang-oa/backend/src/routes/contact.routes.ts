import express from 'express';
import { authenticate } from '../middleware/auth';
import * as contactController from '../controllers/contact.controller';

const router = express.Router();

router.get('/', authenticate, contactController.getContacts);
router.get('/:id', authenticate, contactController.getContactById);
router.post('/', authenticate, contactController.createContact);
router.put('/:id', authenticate, contactController.updateContact);

export default router;
