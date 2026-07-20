import api, { type PaginatedData } from './api'

export interface Lead {
  id: string
  code?: string
  customerName?: string
  contactName?: string
  phone?: string
  email?: string
  wechat?: string
  company?: string
  industry?: string
  scale?: string
  source?: string
  region?: string
  status: string
  assignedTo?: string
  assignedAt?: string
  lastFollowAt?: string
  nextFollowAt?: string
  followOverdue?: boolean
  remark?: string
  invalidReason?: string
  huobanId?: string
  createdAt?: string
  updatedAt?: string
}

/** 安全解析 customerName：数据库可能存了 JSON 字符串如 [{"id":"3","name":"转客户"}] */
function parseCustomerName(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') {
    // 尝试解析 JSON 数组/对象
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr[0]?.name) return arr[0].name
        if (arr?.name) return arr.name
      } catch { /* 不是合法 JSON，返回原值 */ }
    }
    return raw
  }
  if (Array.isArray(raw)) return raw[0]?.name || String(raw)
  if (raw?.name) return raw.name
  return String(raw)
}

/** 后端返回的原始 Lead 行 */
interface LeadRaw extends Record<string, any> {}

function mapLead(r: LeadRaw): Lead {
  return {
    id: r.id,
    code: r.code,
    customerName: parseCustomerName(r.customerName),
    contactName: r.contactName,
    phone: r.phone,
    email: r.email,
    wechat: r.wechat,
    company: r.company,
    industry: r.industry,
    scale: r.scale,
    source: r.source,
    region: r.region,
    status: r.status || '',
    assignedTo: r.assignedTo,
    assignedAt: r.assignedAt,
    lastFollowAt: r.lastFollowAt,
    nextFollowAt: r.nextFollowAt,
    followOverdue: r.followOverdue ?? false,
    remark: r.remark,
    invalidReason: r.invalidReason,
    huobanId: r.huobanId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export interface LeadQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  salesType?: string
}

export async function getLeads(params: LeadQuery = {}): Promise<{ list: Lead[]; pagination: PaginatedData<Lead>['pagination'] }> {
  const res = await api.get<PaginatedData<Lead>>('/leads', {
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    search: params.search,
    status: params.status,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    const list = Array.isArray(res.data.list) ? res.data.list.map(mapLead) : []
    return { list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const res = await api.get<LeadRaw>(`/leads/${id}`)
  if (res.code === 0 && res.data) return mapLead(res.data)
  return null
}
