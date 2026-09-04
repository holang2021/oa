import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as codeRuleController from '../controllers/codeRule.controller'

const router = Router()

// 编码规则属系统配置，仅 ADMIN 可管理
router.get('/', authenticate, authorize(['ADMIN']), codeRuleController.getCodeRules)
router.get('/:id', authenticate, authorize(['ADMIN']), codeRuleController.getCodeRuleById)
router.post('/', authenticate, authorize(['ADMIN']), codeRuleController.createCodeRule)
router.put('/:id', authenticate, authorize(['ADMIN']), codeRuleController.updateCodeRule)
router.delete('/:id', authenticate, authorize(['ADMIN']), codeRuleController.deleteCodeRule)

export default router
