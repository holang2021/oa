import express from 'express';
import { authenticate } from '../middleware/auth';
import * as contactController from '../controllers/contact.controller';

const router = express.Router();

router.get('/', authenticate, contactController.getContacts);
router.get('/:id', authenticate, contactController.getContactById);
router.post('/', authenticate, contactController.createContact);
router.put('/:id', authenticate, contactController.updateContact);
router.post('/:id/leave', authenticate, contactController.leaveContact);
router.post('/:id/migrate', authenticate, contactController.migrateContact);

// 治理铁律：联系人禁止删除（界面无按钮 + API 无 DELETE）。显式拒绝并说明原因。
router.delete('/:id', authenticate, (req, res) => {
  res.status(403).json({ code: 403, message: '联系人禁止删除：离职请标记离职/迁移，记录将永久保留', data: null });
});

export default router;
