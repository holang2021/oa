import api, { type ApiResponse, type PaginatedData } from './api'

export interface Payment {
  id: string
  paymentCode?: string
  customerId: string
  orderId?: string
  amount: number
  type?: string
  status?: string
  plannedDate?: string
  receivedDate?: string
  paymentMethod?: string
  payerAccount?: string
  paymentRatio?: number
  customerAccount?: string
  confirmedFinance?: string
  confirmedFinanceDate?: string
  invoiceConfirm?: string
  applicantId?: string
  flowStatus?: string
  applyDate?: string
  voucher?: string
  remark?: string
  huobanId?: string
  createdAt?: string
  updatedAt?: string
  customer?: { id: string; companyName: string; businessLine?: string }
  order?: { id: string; orderCode: string; businessLine?: string }
}

export interface PaymentQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  businessLine?: string
  customerId?: string
  salesType?: string
}

export async function getPayments(params: PaymentQuery = {}): Promise<{ list: Payment[]; pagination: PaginatedData<Payment>['pagination'] }> {
  const res = await api.get<PaginatedData<Payment>>('/payments', {
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

export async function getPaymentById(id: string): Promise<Payment | null> {
  const res = await api.get<Payment>(`/payments/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}

export async function createPayment(data: Partial<Payment>) {
  return api.post<Payment>('/payments', data)
}

export async function updatePayment(id: string, data: Partial<Payment>) {
  return api.put<Payment>(`/payments/${id}`, data)
}
