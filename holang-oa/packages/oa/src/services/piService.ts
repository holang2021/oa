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
// 商品明细行（Commercial Item）：设备/外购/配件/运杂/安装/服务统一一种行结构，
// 不为每种建字段；与打印模板 tpl-pi-print 的 tableFields 键一一对应。
export interface PiItem {
  productCode?: string  // 产品编号（型号/料号），打印在最左列 Item No.；未填时显示行号
  hsCode: string
  name: string
  qty: number
  unit: string
  price: number
  amount: number
}

export interface CreatePiInput {
  piNo?: string
  customerId: string
  quoteRef?: string          // 选填：报价单尚未在系统内完成时可直接建 PI（刘总 2026-11-08）
  amount?: number
  currency?: string
  issuedAt?: string
  expiresAt?: string
  notes?: string
  customerContactId?: string
  items?: PiItem[]           // 销售在表单直接录入的商品明细（刘总 2026-11-08）
}

export async function createPi(input: CreatePiInput) {
  const res = await api.post<any>('/pi', input)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || 'PI 生成失败')
}

// 更新 PI 内容（PUT /pi/:id）：状态 / 金额 / 币种 / 备注 / 商品明细。
// 复用既有端点，不新增 API；CONFIRMED 后明细与金额由后端冻结。
export interface UpdatePiInput {
  status?: string
  amount?: number
  currency?: string
  notes?: string
  items?: PiItem[]
}

export async function updatePiContent(id: string, input: UpdatePiInput) {
  const res = await api.put<any>(`/pi/${id}`, input)
  if (res.code === 0 && res.data) return res.data
  throw new Error(res.message || '更新失败')
}

// 兼容旧调用：仅改状态时仍可用
export async function updatePiStatus(id: string, status: string) {
  return updatePiContent(id, { status })
}
