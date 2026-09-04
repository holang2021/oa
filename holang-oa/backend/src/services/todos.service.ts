// ============================================================
// 系统待办服务（当前用于「离职交接待办」）
// 说明：todos 表由部署脚本以原生 SQL 幂等创建（避免重新生成 Prisma 客户端），
// 此处同样用原生 SQL 读写（prisma.$queryRawUnsafe / $executeRawUnsafe），
// 与线上客户端解耦，零风险。
// 规则：
//   - 待办由后端在离职交接成功后自动写入（assigneeRole=ADMIN）
//   - 仅 ADMIN 角色可见、可标记完成
//   - 标记完成仅改 status，不删记录（留痕可追溯）
// ============================================================
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

interface RawTodo {
  id: string
  type: string
  title: string
  content: string
  status: string
  relatedUserId: string | null
  relatedUserName: string | null
  meta: string | null
  assigneeRole: string
  createdById: string | null
  createdByName: string | null
  doneById: string | null
  doneByName: string | null
  doneAt: any
  createdAt: any
  updatedAt: any
}

function norm(d: any): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : String(d)
}

const SELECT_COLS =
  'id, type, title, content, status, "relatedUserId", "relatedUserName", meta, ' +
  '"assigneeRole", "createdById", "createdByName", "doneById", "doneByName", ' +
  '"doneAt", "createdAt", "updatedAt"'

function mapRow(r: RawTodo) {
  return {
    id: r.id, type: r.type, title: r.title, content: r.content, status: r.status,
    relatedUserId: r.relatedUserId, relatedUserName: r.relatedUserName, meta: r.meta,
    assigneeRole: r.assigneeRole, createdById: r.createdById, createdByName: r.createdByName,
    doneById: r.doneById, doneByName: r.doneByName,
    doneAt: norm(r.doneAt), createdAt: norm(r.createdAt), updatedAt: norm(r.updatedAt),
  }
}

/** 列出当前角色可见的系统待办（仅 ADMIN 看离职交接待办） */
export async function listTodos(role: string): Promise<any[]> {
  if (role !== 'ADMIN') return []
  const rows = await prisma.$queryRawUnsafe<RawTodo[]>(
    `SELECT ${SELECT_COLS} FROM todos WHERE "assigneeRole" = $1 ORDER BY status ASC, "createdAt" DESC`,
    'ADMIN'
  )
  return (rows || []).map(mapRow)
}

/** 标记待办完成（仅 ADMIN） */
export async function closeTodo(id: string, operatorId: string | null, operatorName: string): Promise<any> {
  const existing = await prisma.$queryRawUnsafe<RawTodo[]>(`SELECT ${SELECT_COLS} FROM todos WHERE id = $1`, id)
  if (!existing || existing.length === 0) throw new AppError('待办不存在', 404)
  if (existing[0].status === 'DONE') return mapRow(existing[0])
  await prisma.$executeRawUnsafe(
    `UPDATE todos SET status='DONE', "doneById"=$1, "doneByName"=$2, "doneAt"=CURRENT_TIMESTAMP, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$3`,
    operatorId, operatorName, id
  )
  const updated = await prisma.$queryRawUnsafe<RawTodo[]>(`SELECT ${SELECT_COLS} FROM todos WHERE id = $1`, id)
  return mapRow(updated[0])
}
