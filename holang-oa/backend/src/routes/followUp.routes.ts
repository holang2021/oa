import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as followUpController from '../controllers/followUp.controller';

const router = Router();

router.get('/', authenticate, followUpController.getFollowUps);
router.get('/:id', authenticate, followUpController.getFollowUpById);
router.post('/', authenticate, followUpController.createFollowUp);
router.put('/:id', authenticate, followUpController.updateFollowUp);
router.delete('/:id', authenticate, followUpController.deleteFollowUp);
router.get('/my/today', authenticate, followUpController.getMyTodayFollowUps);

export default router;
