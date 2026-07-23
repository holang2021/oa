// ============================================================
// 形式发票 (PI) API 服务（外销 EXTERNAL）
// 消费已有 GET /pi，按 customerId 过滤
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
