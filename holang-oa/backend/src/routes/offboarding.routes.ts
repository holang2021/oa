import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as offboardingController from '../controllers/offboarding.controller'

const router = Router()

/**
 * 离职交接（D-离职继承）：仅 ADMIN 可操作（配置层）。
 * 预览为只读统计；执行为写库（停用+转移/退公海+系统交接跟进）。
 */
router.get('/preview', authenticate, authorize(['ADMIN']), offboardingController.previewOffboarding)
router.post('/execute', authenticate, authorize(['ADMIN']), offboardingController.executeOffboarding)

export default router
