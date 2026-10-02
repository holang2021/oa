// ============================================================
// 字段元数据配置类型
// 管理员可通过系统设置页面修改字段的必填/显示/排序/默认值
// 无需改前端代码
// ============================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'email'
  | 'phone'
  | 'url'
  | 'switch'
  | 'boolean'
  | 'currency'

export interface SelectOption {
  label: string
  value: string
}

export interface FieldValidation {
  pattern?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  requiredMessage?: string
  patternMessage?: string
}

export interface FieldMeta {
  id: string // 唯一标识，如 'customer.name'
  module: ModuleName
  fieldName: string // 表单数据字段名
  label: string // 显示标签
  labelEn: string // 英文标签
  fieldType: FieldType
  required: boolean // 是否必填
  visible: boolean // 是否显示
  order: number // 排序序号（越小越靠前）
  defaultValue?: any
  options?: SelectOption[] // select 类型的选项
  validation?: FieldValidation
  group: string // 分组: 'basic' | 'contact' | 'address' | 'invoice' | 'extra'
  placeholder?: string
  placeholderEn?: string
  helpText?: string
  readOnly?: boolean
}

export type ModuleName =
  | 'customer'
  | 'quotation'
  | 'order'
  | 'payment'
  | 'agent'
  | 'lead'
  | 'product'
  | 'invoice'
  | 'delivery'
  | 'aftersales'
  | 'device'
  | 'contact'

export const MODULE_LABELS: Record<ModuleName, string> = {
  customer: '客户',
  quotation: '报价',
  order: '订单',
  payment: '回款',
  agent: '代理商',
  lead: '线索',
  product: '产品',
  invoice: '开票',
  delivery: '发货',
  aftersales: '售后',
  device: '设备档案',
  contact: '联系人',
}

export const FIELD_GROUP_LABELS: Record<string, string> = {
  basic: '基本信息',
  contact: '联系信息',
  address: '地址信息',
  invoice: '开票信息',
  detail: '明细信息',
  extra: '扩展信息',
}
