import api, { type PaginatedData } from './api'

export interface FollowUp {
  id: string
  customerId: string
  userId?: string
  method?: string
  content?: string
  channel?: string
  operator?: string
  nextFollowUpAt?: string
  huobanId?: string
  createdAt?: string
  customer?: { id: string; companyName: string }
  user?: { id: string; name: string }
}

export interface FollowUpQuery {
  page?: number
  pageSize?: number
  customerId?: string
}

export async function getFollowUps(params: FollowUpQuery = {}): Promise<{ list: FollowUp[]; pagination: PaginatedData<FollowUp>['pagination'] }> {
  const res = await api.get<PaginatedData<FollowUp>>('/follow-ups', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    customerId: params.customerId,
  })
  if (res.code === 0 && res.data) {
    return { list: res.data.list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

export async function createFollowUp(data: { customerId: string; method: string; content: string; contactId?: string }): Promise<FollowUp | null> {
  const res = await api.post<FollowUp>('/follow-ups', data)
  if (res.code === 0 && res.data) return res.data
  return null
}
