import express from 'express';
import { authenticate } from '../middleware/auth';
import * as leadController from '../controllers/lead.controller';

const router = express.Router();

router.get('/', authenticate, leadController.getLeads);
router.get('/:id', authenticate, leadController.getLeadById);

export default router;
