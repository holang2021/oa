// ============================================================
// 订单 API 服务
// ============================================================
import api, { PaginatedData } from './api'

// 后端 Prisma 返回的原始订单数据
export interface OrderRaw {
  id: string
  orderCode: string | null
  customerId: string
  orderDate: string | null
  status: string
  businessLine: string
  salesPerson: string | null
  salesOwnerId: string | null
  salesMode: string | null      // 直销/间销
  salesType: string | null      // INTERNAL/EXTERNAL 内外销
  contractEntity: string | null
  productType: string | null
  endUser: string | null
  amount: number
  amountOriginal: number | null
  amountWithoutTax: number | null
  totalCost: number | null
  discount: number
  discountRate: number | null
  taxRate: number | null
  collectedAmount: number
  invoicedAmount: number
  grossMargin: number | null
  unpaidAmount: number
  expectedDeliveryDate: string | null
  deliveryDate: string | null
  receiver: string | null
  receiverPhone: string | null
  receiverAddress: string | null
  approvalStatus: string | null
  flowStatus: string | null
  paymentMethod: string | null
  notes: string | null
  specialReq: string | null
  remark: string | null
  attachments: string | null
  quotationId: string | null
  contractId?: string | null
  piId?: string | null
  createdAt: string
  updatedAt: string
  createdById: string | null

  // include 关系
  customer?: { id: string; companyName: string } | null
  salesOwner?: { id: string; name: string } | null
  items?: Array<{
    id: string
    productId: string | null
    productName: string
    productNameEn: string | null
    spec: string | null
    quantity: number
    unit: string | null
    unitPrice: number
    taxRate: number | null
    subtotal: number
    amount: number
  }>
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productNameEn: string
  spec: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  subtotal: number
}

export interface Order {
  id: string
  customerId: string
  quotationId: string
  code: string
  amount: number
  amountWithoutTax: number
  status: string
  salesPerson: string
  createdAt: string
  deliveryDate: string
  businessLine: string
  approvalStatus: string
  flowStatus: string
  expectedDeliveryDate: string
  contractEntity: string
  salesMode: string
  salesType: string
  endUser: string
  productType: string
  paymentMethod: string
  receiver: string
  receiverPhone: string
  receiverAddress: string
  contractFile: string
  techAgreement: string
  specialReq: string
  collectedAmount: number
  invoicedAmount: number
  taxRate: number
  discount: number
  items: OrderItem[]
  customerName?: string
  contractId?: string | null
  piId?: string | null
}

// 将 Prisma 数据映射为前端兼容格式
export function mapOrder(raw: OrderRaw): Order {
  return {
    id: raw.id,
    customerId: raw.customerId || '',
    quotationId: raw.quotationId || '',
    code: raw.orderCode || '',
    amount: raw.amount || 0,
    amountWithoutTax: raw.amountWithoutTax || 0,
    status: raw.status || '',
    salesPerson: raw.salesPerson || raw.salesOwner?.name || '',
    createdAt: raw.createdAt || '',
    deliveryDate: raw.deliveryDate || '',
    businessLine: raw.businessLine || '',
    approvalStatus: raw.approvalStatus || '',
    flowStatus: raw.flowStatus || '',
    expectedDeliveryDate: raw.expectedDeliveryDate || '',
    contractEntity: raw.contractEntity || '',
    salesMode: raw.salesMode || '',
    salesType: raw.salesType || '',
    endUser: raw.endUser || '',
    productType: raw.productType || '',
    paymentMethod: raw.paymentMethod || '',
    receiver: raw.receiver || '',
    receiverPhone: raw.receiverPhone || '',
    receiverAddress: raw.receiverAddress || '',
    contractFile: raw.attachments || '',
    techAgreement: '',
    specialReq: raw.specialReq || '',
    collectedAmount: raw.collectedAmount || 0,
    invoicedAmount: raw.invoicedAmount || 0,
    taxRate: raw.taxRate || 0,
    discount: raw.discount || 0,
    items: (raw.items || []).map(item => ({
      id: item.id,
      productId: item.productId || '',
      productName: item.productName || '',
      productNameEn: item.productNameEn || '',
      spec: item.spec || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      unitPrice: item.unitPrice || 0,
      taxRate: item.taxRate || 0,
      subtotal: item.subtotal || 0,
    })),
    customerName: raw.customer?.companyName || '',
    contractId: raw.contractId ?? null,
    piId: raw.piId ?? null,
  }
}

// 查询参数
export interface OrderQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  salesOwnerId?: string
  customerId?: string
  salesType?: string
  sortBy?: string
  sortOrder?: string
}

// 获取订单列表
export async function getOrders(params: OrderQuery = {}) {
  const res = await api.get<PaginatedData<OrderRaw>>('/orders', {
    page: params.page || 1,
    pageSize: params.pageSize || 50,
    search: params.search,
    status: params.status,
    salesOwnerId: params.salesOwnerId,
    customerId: params.customerId,
    salesType: params.salesType,
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
  })
  if (res.code === 0 && res.data) {
    return {
      list: res.data.list.map(mapOrder),
      pagination: res.data.pagination,
    }
  }
  return { list: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }
}

// 获取单个订单
export async function getOrderById(id: string) {
  const res = await api.get<OrderRaw>(`/orders/${id}`)
  if (res.code === 0 && res.data) {
    return mapOrder(res.data)
  }
  return null
}

// 创建订单
export async function createOrder(data: Partial<OrderRaw>) {
  return api.post<OrderRaw>('/orders', data)
}

// 更新订单
export async function updateOrder(id: string, data: Partial<OrderRaw>) {
  return api.put<OrderRaw>(`/orders/${id}`, data)
}
