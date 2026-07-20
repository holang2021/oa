import api, { type PaginatedData } from './api'

export interface Delivery {
  id: string
  code?: string
  orderId?: string
  customerId?: string
  flowStatus?: string
  productType?: string
  paidAsContract?: string
  expectedPaymentDate?: string
  overdueReason?: string
  orderType?: string
  endCustomerName?: string
  deliveryDate?: string
  receiver?: string
  receiverPhone?: string
  shippingAddress?: string
  detailAddress?: string
  specialReq?: string
  applicant?: string
  applyDate?: string
  remark?: string
  huobanId?: string
  createdAt?: string
  updatedAt?: string
  customer?: { id: string; companyName: string; businessLine?: string }
  order?: { id: string; orderCode: string; businessLine?: string }
}

export interface DeliveryQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  businessLine?: string
  customerId?: string
  salesType?: string
}

export async function getDeliveries(params: DeliveryQuery = {}): Promise<{ list: Delivery[]; pagination: PaginatedData<Delivery>['pagination'] }> {
  const res = await api.get<PaginatedData<Delivery>>('/deliveries', {
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    search: params.search,
    status: params.status,
    businessLine: params.businessLine,
    customerId: params.customerId,
    salesType: params.salesType,
  })
  if (res.code === 0 && res.data) {
    return { list: res.data.list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  const res = await api.get<Delivery>(`/deliveries/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}

export async function createDelivery(data: Partial<Delivery>) {
  return api.post<Delivery>('/deliveries', data)
}

export async function updateDelivery(id: string, data: Partial<Delivery>) {
  return api.put<Delivery>(`/deliveries/${id}`, data)
}
