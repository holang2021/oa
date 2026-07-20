import api, { type PaginatedData } from './api'

export interface Opportunity {
  id: string
  code?: string
  name: string
  customerId?: string
  expectedAmount?: number
  stage?: string
  status?: string
  expectedCloseDate?: string
  salesOwnerId?: string
  winProbability?: number
  description?: string
  huobanId?: string
  createdAt?: string
  updatedAt?: string
  customer?: { id: string; companyName: string }
  salesOwner?: { id: string; name: string }
}

export interface OpportunityQuery {
  page?: number
  pageSize?: number
  search?: string
  stage?: string
  customerId?: string
  salesType?: string
}

export async function getOpportunities(params: OpportunityQuery = {}): Promise<{ list: Opportunity[]; pagination: PaginatedData<Opportunity>['pagination'] }> {
  const res = await api.get<PaginatedData<Opportunity>>('/opportunities', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    stage: params.stage,
    customerId: params.customerId,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    return { list: res.data.list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const res = await api.get<Opportunity>(`/opportunities/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}
