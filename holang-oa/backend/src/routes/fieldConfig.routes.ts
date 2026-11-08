import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as fieldConfigController from '../controllers/fieldConfig.controller'

const router = Router()

// 读取对所有登录用户开放：销售开 PI 时要按币种读到对应收款账户。
// 写 / 删仍仅 ADMIN（账户资料属系统配置，不能让业务侧改）。
router.get('/', authenticate, fieldConfigController.getConfigs)
router.put('/:module', authenticate, authorize(['ADMIN']), fieldConfigController.updateModule)
router.delete('/:module', authenticate, authorize(['ADMIN']), fieldConfigController.deleteModule)

export default router
