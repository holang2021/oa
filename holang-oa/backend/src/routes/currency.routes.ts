import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as currencyController from '../controllers/currency.controller'

const router = Router()

// 币种与汇率属系统配置，仅 ADMIN 可管理
router.get('/', authenticate, authorize(['ADMIN']), currencyController.getCurrencies)
router.get('/:id', authenticate, authorize(['ADMIN']), currencyController.getCurrencyById)
router.post('/', authenticate, authorize(['ADMIN']), currencyController.createCurrency)
router.put('/:id', authenticate, authorize(['ADMIN']), currencyController.updateCurrency)
router.delete('/:id', authenticate, authorize(['ADMIN']), currencyController.deleteCurrency)

export default router
