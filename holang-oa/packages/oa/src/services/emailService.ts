// ============================================================
// 邮件归集 API 服务 —— 邮件自动归集进时间轴（Phase 1）
// 对应后端 /api/v1/email-bindings 与 /api/v1/emails、/customers/:id/emails
// ============================================================
import api, { type ApiResponse } from './api'

export interface EmailBinding {
  id: string
  email: string
  provider: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  authUser: string
  syncState?: string | null
  status: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface EmailMessage {
  id: string
  bindingId: string
  messageId: string
  customerId: string | null
  contactId: string | null
  direction: 'IN' | 'OUT'
  fromAddr: string
  fromName?: string | null
  toAddr: string
  toName?: string | null
  subject?: string | null
  snippet?: string | null
  bodyText?: string | null
  sentAt: string
  isRead: boolean
  hasAttachment: boolean
  openCount: number
  openIps?: string | null
  lastOpenedAt?: string | null
  createdAt?: string
  unreplied?: boolean
}

export interface CustomerEmailListResult {
  list: EmailMessage[]
  stats: { all: number; unread: number; outbound: number; unreplied: number }
}

export interface EmailReminderResult {
  count: number
  items: Array<{ id: string; subject?: string | null; toAddr: string; sentAt: string; snippet?: string | null }>
}

export interface BindEmailPayload {
  email: string
  authCode: string
  authUser?: string
  provider?: string
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
}

// 邮箱绑定列表
export async function getEmailBindings(): Promise<EmailBinding[]> {
  const res = await api.get<{ list?: EmailBinding[]; data?: EmailBinding[] }>('/email-bindings')
  if (res.code === 0 && res.data) {
    const d = res.data as any
    return Array.isArray(d) ? d : (d.list || [])
  }
  return []
}

// 绑定企业邮箱（授权码加密存储由后端处理）
export async function createEmailBinding(payload: BindEmailPayload): Promise<ApiResponse> {
  return api.post<ApiResponse>('/email-bindings', payload)
}

// 解绑
export async function deleteEmailBinding(id: string): Promise<ApiResponse> {
  return api.delete<ApiResponse>(`/email-bindings/${id}`)
}

// 手动同步
export async function syncEmailBinding(id: string): Promise<ApiResponse> {
  return api.post<ApiResponse>(`/email-bindings/${id}/sync`)
}

// 客户往来邮件列表（过滤 + 搜索）
export async function getCustomerEmails(
  customerId: string,
  filter: 'all' | 'unread' | 'outbound' | 'unreplied' = 'all',
  search = ''
): Promise<CustomerEmailListResult> {
  const res = await api.get<{ list: EmailMessage[]; stats: CustomerEmailListResult['stats'] }>(
    `/customers/${customerId}/emails`,
    { filter, search }
  )
  if (res.code === 0 && res.data) {
    return { list: res.data.list || [], stats: res.data.stats || { all: 0, unread: 0, outbound: 0, unreplied: 0 } }
  }
  return { list: [], stats: { all: 0, unread: 0, outbound: 0, unreplied: 0 } }
}

// 未回复提醒
export async function getEmailReminders(customerId: string): Promise<EmailReminderResult> {
  const res = await api.get<EmailReminderResult>(`/customers/${customerId}/email-reminders`)
  if (res.code === 0 && res.data) {
    return { count: res.data.count || 0, items: res.data.items || [] }
  }
  return { count: 0, items: [] }
}
