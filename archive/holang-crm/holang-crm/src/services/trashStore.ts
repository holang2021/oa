/** 回收站存储服务
 *  所有删除操作先移入回收站（软删除），支持恢复和彻底删除。
 *  保存周期：无限期（不清除，除非主动"彻底删除"）。
 */

export type TrashItemType =
  | 'role'
  | 'employee'
  | 'currency'
  | 'codeRule'
  | 'docTemplateType'
  | 'docTemplateVersion'
  | 'approvalConfig'
  | 'approvalStep'
  | 'approvalTemplate'

export interface TrashItem {
  id: string
  type: TrashItemType
  name: string
  data: any // 完整原始数据
  deletedAt: string
  storeKey: string // 原始 localStorage key，恢复时需要
  parentInfo?: string // 附加信息（如 "审批配置: 订单"）
}

const STORAGE_KEY = 'holang_crm_trash'

export const TRASH_TYPE_LABELS: Record<TrashItemType, string> = {
  role: '角色',
  employee: '员工',
  currency: '币种',
  codeRule: '编码规则',
  docTemplateType: '单证模板类型',
  docTemplateVersion: '单证模板版本',
  approvalConfig: '审批配置',
  approvalStep: '审批步骤',
  approvalTemplate: '审批模板',
}

// ============ 内部 helper ============

function loadAll(): TrashItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(items: TrashItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function uid(): string {
  return `trash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============ 公开 API ============

/** 将一条数据移入回收站 */
export function addTrashItem(item: Omit<TrashItem, 'id' | 'deletedAt'>): TrashItem {
  const all = loadAll()
  const newItem: TrashItem = {
    ...item,
    id: uid(),
    deletedAt: new Date().toISOString(),
  }
  all.push(newItem)
  saveAll(all)
  return newItem
}

/** 从回收站彻底删除一条记录 */
export function removeTrashItem(id: string): void {
  const all = loadAll().filter(t => t.id !== id)
  saveAll(all)
}

/** 恢复回收站中的一条记录：写回原始 store，并从回收站删除 */
export function restoreTrashItem(id: string): { storeKey: string; data: any } | null {
  const all = loadAll()
  const idx = all.findIndex(t => t.id === id)
  if (idx === -1) return null

  const item = all[idx]
  // 写回原始 store
  try {
    const raw = localStorage.getItem(item.storeKey)
    const list = raw ? JSON.parse(raw) : []
    list.push(item.data)
    localStorage.setItem(item.storeKey, JSON.stringify(list))
  } catch {
    // 恢复失败，保留在回收站
    return null
  }

  // 从回收站移除
  all.splice(idx, 1)
  saveAll(all)
  return { storeKey: item.storeKey, data: item.data }
}

/** 获取所有回收站记录（按删除时间倒序） */
export function getTrashItems(): TrashItem[] {
  return loadAll().sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  )
}

/** 按类型筛选回收站记录 */
export function getTrashItemsByType(type: TrashItemType): TrashItem[] {
  return getTrashItems().filter(t => t.type === type)
}

/** 清空整个回收站（彻底删除所有记录） */
export function clearAllTrash(): void {
  saveAll([])
}

/** 按类型清空回收站 */
export function clearTrashByType(type: TrashItemType): void {
  const all = loadAll().filter(t => t.type !== type)
  saveAll(all)
}

/** 获取回收站统计 */
export function getTrashStats(): { total: number; byType: Record<string, number> } {
  const all = loadAll()
  const byType: Record<string, number> = {}
  all.forEach(t => {
    byType[t.type] = (byType[t.type] || 0) + 1
  })
  return { total: all.length, byType }
}
