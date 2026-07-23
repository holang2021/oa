// ============================================================
// 合同 API 服务（内销 INTERNAL）
// 消费已有 GET /contracts，按 customerId 过滤
// ============================================================
import api, { PaginatedData } from './api'

// 后端 Prisma 返回的原始合同数据
export interface ContractRaw {
  id: string
  contractNo?: string | null
  customerId?: string | null
  orderId?: string | null
  salesType?: string | null
  status?: string | null
  amount?: number | null
  signedDate?: string | null
  createdAt?: string
}

// 前端使用的合同模型
export interface Contract {
  id: string
  contractNo: string
  customerId: string | null
  orderId: string | null
  salesType: string
  status: string
  amount: number
  signedDate: string
  createdAt: string
}

// 将 Prisma 数据映射为前端兼容格式
export function mapContract(raw: ContractRaw): Contract {
  return {
    id: raw.id,
    contractNo: raw.contractNo || '',
    customerId: raw.customerId ?? null,
    orderId: raw.orderId ?? null,
    salesType: raw.salesType || '',
    status: raw.status || '',
    amount: raw.amount || 0,
    signedDate: raw.signedDate || '',
    createdAt: raw.createdAt || '',
  }
}

// 查询参数
export interface ContractQuery {
  page?: number
  pageSize?: number
  search?: string
  customerId?: string
  salesType?: string
}

// 获取合同列表
export async function getContracts(params: ContractQuery = {}) {
  const res = await api.get<PaginatedData<ContractRaw>>('/contracts', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    customerId: params.customerId,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapContract),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}
