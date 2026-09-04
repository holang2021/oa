import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as fieldConfigController from '../controllers/fieldConfig.controller'

const router = Router()

// 字段配置属系统配置，仅 ADMIN 可管理
router.get('/', authenticate, authorize(['ADMIN']), fieldConfigController.getConfigs)
router.put('/:module', authenticate, authorize(['ADMIN']), fieldConfigController.updateModule)
router.delete('/:module', authenticate, authorize(['ADMIN']), fieldConfigController.deleteModule)

export default router
