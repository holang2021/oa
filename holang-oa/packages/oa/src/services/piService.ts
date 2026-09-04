// ============================================================
// 形式发票 (PI) API 服务（外销 EXTERNAL）
// 消费 GET /pi（列表/详情）、POST /pi（创建）、PUT /pi/:id（状态更新）
// 后端约束：仅 EXTERNAL 外销域、客户须外销、须关联 ACCEPTED 外销报价
// ============================================================
import api, { PaginatedData } from './api'

// 后端 Prisma 返回的原始 PI 数据
export interface ProformaInvoiceRaw {
  id: string
  piNo?: string | null
  customerId?: string | null
  orderId?: string | null
  salesType?: string | null
  status?: string | null
  amount?: number | null
  issueDate?: string | null
  createdAt?: string
}

// 前端使用的 PI 模型
export interface ProformaInvoice {
  id: string
  piNo: string
  customerId: string | null
  orderId: string | null
  salesType: string
  status: string
  amount: number
  issueDate: string
  createdAt: string
}

// 将 Prisma 数据映射为前端兼容格式
export function mapProformaInvoice(raw: ProformaInvoiceRaw): ProformaInvoice {
  return {
    id: raw.id,
    piNo: raw.piNo || '',
    customerId: raw.customerId ?? null,
    orderId: raw.orderId ?? null,
    salesType: raw.salesType || '',
    status: raw.status || '',
    amount: raw.amount || 0,
    issueDate: raw.issueDate || '',
    createdAt: raw.createdAt || '',
  }
}

// 查询参数
export interface PiQuery {
  page?: number
  pageSize?: number
  search?: string
  customerId?: string
  salesType?: string
}

// 获取 PI 列表
export async function getPis(params: PiQuery = {}) {
  const res = await api.get<PaginatedData<ProformaInvoiceRaw>>('/pi', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    customerId: params.customerId,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapProformaInvoice),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

// 获取单个 PI 详情
export async function getPiById(id: string) {
  const res = await api.get<any>(`/pi/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}

// 创建 PI（POST /pi）
export interface CreatePiInput {
  piNo?: string
  customerId: string
  quoteRef: string
  amount?: number
  currency?: string
  issuedAt?: string
  expiresAt?: string
  notes?: string
  customerContactId?: string
}

export async function createPi(input: CreatePiInput) {
  const res = await api.post<any>('/pi', input)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || 'PI 生成失败')
}

// 更新 PI 状态（PUT /pi/:id，后端仅接收 status）
export async function updatePiStatus(id: string, status: string) {
  const res = await api.put<any>(`/pi/${id}`, { status })
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '更新失败')
}
