import api, { type PaginatedData } from './api'

// 后端 Prisma 返回的原始报价单数据
export interface QuoteRaw {
  id: string
  quoteNumber: string | null
  customerId: string
  salesType: string | null      // INTERNAL/EXTERNAL 内外销
  totalAmount: number
  amountWithoutTax: number | null
  taxRate: number | null
  discount: number
  validUntil: string | null
  status: string
  notes: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
  customer?: { id: string; companyName: string } | null
  creator?: { id: string; name: string } | null
  items?: Array<{
    id: string
    productId: string
    product?: { id: string; name: string; model?: string | null } | null
    quantity: number
    unitPrice: number
    discount: number
    subtotal: number
  }>
}

// 前端使用的报价单模型
export interface Quote {
  id: string
  code: string                // quoteNumber
  customerId: string
  customerName: string
  salesType: string
  amount: number              // totalAmount
  amountWithoutTax: number    // 未税金额
  taxRate: number             // 增值税税率(%)：13/6/0(未税)；外销=0
  discount: number
  validUntil: string
  status: string
  notes: string
  createdAt: string
  creatorName: string
  items: QuoteRaw['items']
}

// 将 Prisma 数据映射为前端兼容格式
export function mapQuote(raw: QuoteRaw): Quote {
  return {
    id: raw.id,
    code: raw.quoteNumber || '',
    customerId: raw.customerId || '',
    customerName: raw.customer?.companyName || '',
    salesType: raw.salesType || '',
    amount: raw.totalAmount || 0,
    amountWithoutTax: raw.amountWithoutTax || 0,
    taxRate: raw.taxRate ?? 13,
    discount: raw.discount || 0,
    validUntil: raw.validUntil || '',
    status: raw.status || '',
    notes: raw.notes || '',
    createdAt: raw.createdAt || '',
    creatorName: raw.creator?.name || '',
    items: raw.items,
  }
}

// 查询参数
export interface QuoteQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  customerId?: string
  salesType?: string
}

// 获取报价单列表
export async function getQuotes(params: QuoteQuery = {}) {
  const res = await api.get<PaginatedData<QuoteRaw>>('/quotes', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    status: params.status,
    customerId: params.customerId,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapQuote),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

// 获取单个报价单
export async function getQuoteById(id: string) {
  const res = await api.get<QuoteRaw>(`/quotes/${id}`)
  if (res.code === 0 && res.data) {
    return mapQuote(res.data)
  }
  return null
}

// 创建报价单
export async function createQuoteApi(payload: any) {
  const res = await api.post<QuoteRaw>('/quotes', payload)
  if (res.code === 0 && res.data) return mapQuote(res.data)
  throw new Error(res.message || '创建失败')
}

// 更新报价单（草稿状态可编辑）
export async function updateQuoteApi(id: string, payload: any) {
  const res = await api.put<QuoteRaw>(`/quotes/${id}`, payload)
  if (res.code === 0 && res.data) return mapQuote(res.data)
  throw new Error(res.message || '更新失败')
}
