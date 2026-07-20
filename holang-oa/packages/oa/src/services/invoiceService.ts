import api, { type PaginatedData } from './api'

export interface Invoice {
  id: string
  orderId?: string
  customerId?: string
  salesPerson?: string
  amount: number
  ratio?: number
  orderStatus?: string
  productType?: string
  invoiceType?: string
  contractEntityId?: string
  title?: string
  creditCode?: string
  companyAddress?: string
  companyPhone?: string
  bankName?: string
  bankAccount?: string
  bankCode?: string
  billingInfo?: string
  recipient?: string
  recipientPhone?: string
  detailAddress?: string
  invoiceNumber?: string
  invoiceFile?: string
  invoiceScan?: string
  approvalStatus?: string
  flowStatus?: string
  applyDate?: string
  remark?: string
  huobanId?: string
  createdAt?: string
  updatedAt?: string
  customer?: { id: string; companyName: string; businessLine?: string }
  order?: { id: string; orderCode: string; businessLine?: string }
}

export interface InvoiceQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  businessLine?: string
  customerId?: string
}

export async function getInvoices(params: InvoiceQuery = {}): Promise<{ list: Invoice[]; pagination: PaginatedData<Invoice>['pagination'] }> {
  const res = await api.get<PaginatedData<Invoice>>('/invoices', {
    page: params.page || 1,
    pageSize: params.pageSize || 20,
    search: params.search,
    status: params.status,
    businessLine: params.businessLine,
    customerId: params.customerId,
  })
  if (res.code === 0 && res.data) {
    return { list: res.data.list, pagination: res.data.pagination }
  }
  return { list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const res = await api.get<Invoice>(`/invoices/${id}`)
  if (res.code === 0 && res.data) return res.data
  return null
}

export async function createInvoice(data: Partial<Invoice>) {
  return api.post<Invoice>('/invoices', data)
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return api.put<Invoice>(`/invoices/${id}`, data)
}
