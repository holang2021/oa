import api, { type PaginatedData } from './api'

export interface Contact {
  id: string
  customerId: string
  name: string
  position?: string
  title?: string
  type?: string
  phone?: string
  email?: string
  wechat?: string
  whatsapp?: string
  dept?: string
  isKeyPerson?: boolean
  gender?: string
  contactType?: string
  remark?: string
  huobanId?: string
  createdById?: string
  createdAt?: string
  updatedAt?: string
  // 治理字段（2026-09 铁律）
  status?: string // ACTIVE | LEFT
  leftAt?: string
  leftNote?: string
  migratedFromId?: string
  extension?: string | null // 软信息(JSON 字符串)：生日/故乡/兴趣爱好/家庭情况/教育背景/性格标签/饮食禁忌/宗教文化禁忌
  customer?: { id: string; companyName: string }
  createdBy?: { id: string; name: string } | null
}

export interface ContactQuery {
  page?: number
  pageSize?: number
  search?: string
  customerId?: string
}

export async function getContacts(params: ContactQuery = {}): Promise<{ list: Contact[]; pagination: PaginatedData<Contact>['pagination'] }> {
  const res = await api.get<PaginatedData<Contact>>('/contacts', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    customerId: params.customerId,
  })
  if (res.code === 0 && res.data) {
    return { list: res.data.list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const res = await api.get<Contact>(`/contacts/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}

// Phase 1: 指向真实后端路由 POST /contacts（body 含 customerId）
export async function createContact(customerId: string, data: Partial<Contact>): Promise<Contact | null> {
  const res = await api.post<Contact>('/contacts', { ...data, customerId })
  if (res.code === 0 && res.data) return res.data
  return null
}

// Phase 1: 指向真实后端路由 PUT /contacts/:id
export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact | null> {
  const res = await api.put<Contact>(`/contacts/${id}`, data)
  if (res.code === 0 && res.data) return res.data
  return null
}

// 联系人删除在后端被统一禁止（治理铁律：禁删）；前端不再调用
export async function deleteContact(_id: string, _customerId: string): Promise<boolean> {
  return false
}

// 标记联系人离职（原记录保留 + status=LEFT + 审计留痕）
export async function leaveContact(id: string, leftNote?: string): Promise<Contact | null> {
  const res = await api.post<Contact>(`/contacts/${id}/leave`, { leftNote })
  if (res.code === 0 && res.data) return res.data
  return null
}

// 迁移联系人到目标客户（原记录标 LEFT 保留，新建记录挂目标客户 + 血缘 + 审计）
export async function migrateContact(id: string, targetCustomerId: string, note?: string): Promise<Contact | null> {
  const res = await api.post<Contact>(`/contacts/${id}/migrate`, { targetCustomerId, note })
  if (res.code === 0 && res.data) return res.data
  return null
}
