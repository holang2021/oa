import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import * as currencyController from '../controllers/currency.controller'

const router = Router()

// 币种与汇率的「增删改」属系统配置，仅 ADMIN 可操作。
// 「读取列表」对所有已登录用户开放：PI/报价/订单等业务表单要按系统汇率折算，
// 若维持 ADMIN 独占，销售开 PI 时 initCurrencies() 会 403 并静默回退到默认汇率，
// 造成「汇率没有写入」的假象（刘总 2026-11-08）。只读放行不含任何敏感配置写权限。
router.get('/', authenticate, currencyController.getCurrencies)
router.get('/:id', authenticate, authorize(['ADMIN']), currencyController.getCurrencyById)
router.post('/', authenticate, authorize(['ADMIN']), currencyController.createCurrency)
router.put('/:id', authenticate, authorize(['ADMIN']), currencyController.updateCurrency)
router.delete('/:id', authenticate, authorize(['ADMIN']), currencyController.deleteCurrency)

export default router
