import api, { type PaginatedData } from './api'

export interface Product {
  id: string
  name: string
  model?: string | null
  spec?: string | null
  category?: string | null
  unitPrice: number
}

// 获取产品列表（报价单明细选品用）
export async function getProducts(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const res = await api.get<PaginatedData<any>>('/products', {
    page: params.page || 1,
    pageSize: params.pageSize || 500,
    search: params.search,
  })
  if (res.code === 0 && res.data) {
    return { list: (res.data.list || []) as Product[], pagination: res.data.pagination }
  }
  return { list: [] as Product[], pagination: { page: 1, pageSize: 500, total: 0, totalPages: 0 } }
}
