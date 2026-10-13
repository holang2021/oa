// ============================================================
// 企业微信通讯录 API 服务
// ============================================================
import api from './api'

export interface WecomContact {
  userid: string
  name: string
  departmentIds: number[]
  department: string[]
  mainDepartment: string
  position: string
  mobile: string | null
  email: string | null
  telephone: string | null
  englishName: string | null
  alias: string | null
  avatar: string | null
  status: number
  enable: number
}

export interface WecomContactsResp {
  list: WecomContact[]
  departments: { id: number; name: string }[]
}

export async function getWecomContacts(): Promise<WecomContactsResp> {
  const res = await api.get<WecomContactsResp>('/wecom/contacts')
  return res.data
}

/**
 * 触发后端把企微通讯录成员同步为 OA 账号（POST /wecom/sync）。
 * 后端逻辑：未建账号的员工自动创建（初始密码=企微 userid、角色按部门映射），
 * 已存在账号同步姓名/部门/启用状态，并补录缺失密码。返回统计 { created, updated, disabled, passwordReset }。
 * 注意：仅 ADMIN 可调用（后端 authorize(['ADMIN'])）。
 */
export async function syncWecomUsers() {
  const res = await api.post('/wecom/sync')
  return res
}
