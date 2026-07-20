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
