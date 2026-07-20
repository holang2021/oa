import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), userController.getUsers);
router.get('/:id', authenticate, userController.getUserById);
router.post('/', authenticate, authorize(['ADMIN']), userController.createUser);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, authorize(['ADMIN']), userController.deleteUser);
router.put('/:id/password', authenticate, userController.resetPassword);

export default router;
