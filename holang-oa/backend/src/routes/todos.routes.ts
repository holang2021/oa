import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/rbac'
import { listTodosHandler, closeTodoHandler } from '../controllers/todos.controller'

const router = Router()

// 仅 ADMIN 可见/操作系统待办（离职交接待办）
router.get('/', authenticate, authorize(['ADMIN']), listTodosHandler)
router.post('/:id/close', authenticate, authorize(['ADMIN']), closeTodoHandler)

export default router
