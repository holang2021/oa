import { Request, Response, NextFunction } from 'express'
import { listTodos, closeTodo } from '../services/todos.service'
import { AuthRequest } from '../middleware/auth'

export async function listTodosHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const role = (req.user as any)?.role ?? 'UNKNOWN'
    const todos = await listTodos(role)
    res.json({ data: todos, total: todos.length })
  } catch (err) {
    next(err)
  }
}

export async function closeTodoHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id
    const operatorId = (req.user as any)?.userId ?? null
    const operatorName = (req.user as any)?.name ?? '管理员'
    const todo = await closeTodo(id, operatorId, operatorName)
    res.json({ data: todo })
  } catch (err) {
    next(err)
  }
}
