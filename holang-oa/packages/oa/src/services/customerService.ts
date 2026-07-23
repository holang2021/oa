// ============================================================
// 客户 API 服务
// ============================================================
import api, { PaginatedData } from './api'

// 后端 Prisma 返回的原始客户数据结构
export interface CustomerRaw {
  id: string
  customerCode: string | null
  companyName: string
  industry: string | null
  industryOther: string | null
  scale: string | null
  address: string | null
  addressDetail: string | null
  companyPhone: string | null
  website: string | null
  creditCode: string | null
  dunsNumber: string | null
  status: string
  source: string | null
  businessLine: string
  salesType: string
  country: string | null
  salesOwnerId: string | null
  inPublicPool?: boolean
  salesPerson: string | null
  salesDept: string | null
  followStage: string | null
  level: string | null
  taxTitle: string | null
  taxNumber: string | null
  invoiceType: string | null
  bankName: string | null
  bankAccount: string | null
  bankCode: string | null
  dealAmount: number
  dealCount: number
  paidAmount: number
  unpaidAmount: number
  assignedAt: string | null
  lastFollowAt: string | null
  nextFollowAt: string | null
  overdueFollow: boolean
  transactedAt: string | null
  remark: string | null
  attachments: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  createdById: string | null

  // include 关系
  salesOwner?: { id: string; name: string } | null
  contacts?: Array<{
    id: string
    name: string
    position: string | null
    title: string | null
    phone: string | null
    email: string | null
    wechat: string | null
    whatsapp: string | null
    type: string
    isKeyPerson: boolean
    gender: string | null
    remark: string | null
  }>
  _count?: {
    opportunities: number
    followUps: number
  }
}

// 前端使用的客户数据模型（兼容原有代码）
export interface Customer {
  id: string
  name: string          // companyName
  code: string          // customerCode
  industry: string
  scale: string
  level: string
  address: string
  website: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactWechat: string
  contactWhatsapp: string
  contactDept: string
  contactTitle: string
  taxTitle: string
  taxNumber: string
  bankName: string
  bankAccount: string
  salesPerson: string
  salesDept: string
  source: string
  followStage: string
  createdAt: string
  businessLine: string
  salesType: string
  country: string
  creditCode: string
  dunsNumber: string
  companyPhone: string
  remark: string
  invoiceType: string
  bankCode: string
  assignedAt: string
  lastFollowAt: string
  nextFollowAt: string
  overdueFollow: boolean
  transactedAt: string
  contractFile: string
  status: string
  inPublicPool?: boolean
  salesOwnerId?: string | null
}

// 将 Prisma 数据映射为前端兼容格式
export function mapCustomer(raw: CustomerRaw): Customer {
  const primaryContact = raw.contacts?.[0]
  return {
    id: raw.id,
    name: raw.companyName || '',
    code: raw.customerCode || '',
    industry: raw.industry || '',
    scale: raw.scale || '',
    level: raw.level || '',
    address: raw.address || '',
    website: raw.website || '',
    contactName: primaryContact?.name || '',
    contactPhone: primaryContact?.phone || '',
    contactEmail: primaryContact?.email || '',
    contactWechat: primaryContact?.wechat || '',
    contactWhatsapp: primaryContact?.whatsapp || '',
    contactDept: primaryContact?.position || '',
    contactTitle: primaryContact?.title || '',
    taxTitle: raw.taxTitle || '',
    taxNumber: raw.taxNumber || '',
    bankName: raw.bankName || '',
    bankAccount: raw.bankAccount || '',
    salesPerson: raw.salesPerson || raw.salesOwner?.name || '',
    salesDept: raw.salesDept || '',
    source: raw.source || '',
    followStage: raw.followStage || '',
    createdAt: raw.createdAt || '',
    businessLine: raw.businessLine || '',
    salesType: raw.salesType || '',
    country: raw.country || '',
    creditCode: raw.creditCode || '',
    dunsNumber: raw.dunsNumber || '',
    companyPhone: raw.companyPhone || '',
    remark: raw.remark || '',
    invoiceType: raw.invoiceType || '',
    bankCode: raw.bankCode || '',
    assignedAt: raw.assignedAt || '',
    lastFollowAt: raw.lastFollowAt || '',
    nextFollowAt: raw.nextFollowAt || '',
    overdueFollow: raw.overdueFollow || false,
    transactedAt: raw.transactedAt || '',
    contractFile: raw.attachments || '',
    status: raw.status || '',
    inPublicPool: raw.inPublicPool ?? false,
    salesOwnerId: raw.salesOwnerId ?? null,
  }
}

// 查询参数
export interface CustomerQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  industry?: string
  salesOwnerId?: string
  salesType?: string
  sortBy?: string
  sortOrder?: string
}

// 获取客户列表
export async function getCustomers(params: CustomerQuery = {}) {
  const res = await api.get<PaginatedData<CustomerRaw>>('/customers', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    status: params.status,
    industry: params.industry,
    salesOwnerId: params.salesOwnerId,
    salesType: params.salesType,
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapCustomer),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

// 获取单个客户
export async function getCustomerById(id: string) {
  const res = await api.get<CustomerRaw>(`/customers/${id}`)
  if (res.code === 0 && res.data) {
    return mapCustomer(res.data)
  }
  return null
}

// 创建客户
export async function createCustomer(data: Partial<CustomerRaw>) {
  return api.post<CustomerRaw>('/customers', data)
}

// 更新客户
export async function updateCustomer(id: string, data: Partial<CustomerRaw>) {
  return api.put<CustomerRaw>(`/customers/${id}`, data)
}

// 获取公海客户列表（服务端按 salesType 域强制隔离）
export async function getPoolCustomers(params: CustomerQuery = {}) {
  const res = await api.get<PaginatedData<CustomerRaw>>('/customers/pool', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    salesType: params.salesType,
    search: params.search,
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapCustomer),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

// 认领客户
export async function claimCustomer(id: string) {
  return api.post(`/customers/${id}/claim`)
}

// 退回客户到公海
export async function returnCustomer(id: string) {
  return api.post(`/customers/${id}/return`)
}
