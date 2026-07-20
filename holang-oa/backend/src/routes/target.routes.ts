import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as targetController from '../controllers/target.controller';

const router = Router();

router.get('/', authenticate, targetController.getTargets);
router.get('/:id', authenticate, targetController.getTargetById);
router.post('/', authenticate, targetController.createTarget);
router.put('/:id', authenticate, targetController.updateTarget);
router.delete('/:id', authenticate, targetController.deleteTarget);
router.get('/my/current', authenticate, targetController.getMyCurrentTarget);

export default router;
