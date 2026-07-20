// ============================================================
// 单证模板管理类型定义
// PI/CI/PL 等外贸单证模板可后台配置，支持版本迭代
// ============================================================

/** 模板类型（PI/CI/PL 等，可动态扩展） */
export interface DocTemplateType {
  id: string
  name: string           // 英文标识，如 "PI", "CI", "PL"
  nameCn: string         // 中文名称，如 "形式发票"
  description: string    // 用途说明
  sortOrder: number      // 排序
  createdAt: string
}

/** 字段数据类型 */
export type FieldDataType = 'text' | 'number' | 'date' | 'select' | 'currency' | 'textarea' | 'boolean'

/** 模板字段定义 */
export interface TemplateField {
  id: string
  label: string          // 中文标签
  labelEn: string        // 英文标签
  type: FieldDataType
  required: boolean
  options?: string[]     // select 类型的选项
  defaultValue?: string
  sortOrder: number      // 排列顺序
  width?: string         // 列宽提示，如 "120px"
}

/** 模板版本 */
export interface DocTemplate {
  id: string
  typeId: string         // 关联的模板类型
  version: number        // 版本号（自动递增）
  name: string           // 版本名称
  fields: TemplateField[]
  isActive: boolean      // 同一类型只有一个激活版本
  createdBy: string
  createdAt: string
  updatedAt: string
  archivedAt?: string    // 归档时间
}

/** 解析上传文件得到的预览字段 */
export interface ParsedField {
  label: string
  labelEn: string
  type: FieldDataType
  required: boolean
}

// 字段数据类型的标签映射
export const FIELD_TYPE_LABELS: Record<FieldDataType, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '下拉选择',
  currency: '金额',
  textarea: '长文本',
  boolean: '是/否',
}

// 字段类型颜色
export const FIELD_TYPE_COLORS: Record<FieldDataType, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  date: 'bg-cyan-100 text-cyan-700',
  select: 'bg-amber-100 text-amber-700',
  currency: 'bg-green-100 text-green-700',
  textarea: 'bg-indigo-100 text-indigo-700',
  boolean: 'bg-pink-100 text-pink-700',
}

// 预置模板类型
export const DEFAULT_TEMPLATE_TYPES: DocTemplateType[] = [
  {
    id: 'PI',
    name: 'PI',
    nameCn: '形式发票',
    description: 'Proforma Invoice，外贸报价确认后的合同前置文件，客户回签后生效',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'CI',
    name: 'CI',
    nameCn: '商业发票',
    description: 'Commercial Invoice，发货时生成的正式发票，用于报关和结算',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'PL',
    name: 'PL',
    nameCn: '装箱单',
    description: 'Packing List，随货文件，记录每箱货物的明细',
    sortOrder: 3,
    createdAt: new Date().toISOString(),
  },
]

// PI 默认字段模板
export const DEFAULT_PI_FIELDS: TemplateField[] = [
  { id: 'f_pi_no', label: 'PI 编号', labelEn: 'PI No.', type: 'text', required: true, sortOrder: 1, width: '120px' },
  { id: 'f_pi_date', label: 'PI 日期', labelEn: 'Date', type: 'date', required: true, sortOrder: 2, width: '110px' },
  { id: 'f_seller', label: '卖方', labelEn: 'Seller', type: 'text', required: true, sortOrder: 3, width: '200px' },
  { id: 'f_buyer', label: '买方', labelEn: 'Buyer', type: 'text', required: true, sortOrder: 4, width: '200px' },
  { id: 'f_product_code', label: '产品编号', labelEn: 'Product Code', type: 'text', required: true, sortOrder: 5, width: '120px' },
  { id: 'f_description', label: '品名描述', labelEn: 'Description', type: 'textarea', required: true, sortOrder: 6, width: '200px' },
  { id: 'f_quantity', label: '数量', labelEn: 'Quantity', type: 'number', required: true, sortOrder: 7, width: '80px' },
  { id: 'f_unit', label: '单位', labelEn: 'Unit', type: 'select', required: true, options: ['SET', 'PCS', 'KG', 'M'], sortOrder: 8, width: '70px' },
  { id: 'f_unit_price', label: '单价', labelEn: 'Unit Price', type: 'currency', required: true, sortOrder: 9, width: '100px' },
  { id: 'f_amount', label: '金额', labelEn: 'Amount', type: 'currency', required: true, sortOrder: 10, width: '100px' },
  { id: 'f_currency', label: '币种', labelEn: 'Currency', type: 'select', required: true, options: ['USD', 'EUR', 'CNY', 'GBP'], sortOrder: 11, width: '80px' },
  { id: 'f_total', label: '总金额', labelEn: 'Total Amount', type: 'currency', required: true, sortOrder: 12, width: '120px' },
  { id: 'f_payment_terms', label: '付款条款', labelEn: 'Payment Terms', type: 'textarea', required: true, sortOrder: 13, width: '200px' },
  { id: 'f_delivery_terms', label: '贸易术语', labelEn: 'Delivery Terms', type: 'select', required: true, options: ['FOB', 'CIF', 'CFR', 'EXW', 'DDP'], sortOrder: 14, width: '100px' },
  { id: 'f_delivery_date', label: '交货日期', labelEn: 'Delivery Date', type: 'date', required: true, sortOrder: 15, width: '110px' },
  { id: 'f_port_loading', label: '装运港', labelEn: 'Port of Loading', type: 'text', required: true, sortOrder: 16, width: '120px' },
  { id: 'f_port_destination', label: '目的港', labelEn: 'Port of Destination', type: 'text', required: true, sortOrder: 17, width: '120px' },
  { id: 'f_validity', label: '有效期（天）', labelEn: 'Validity (days)', type: 'number', required: false, defaultValue: '30', sortOrder: 18, width: '100px' },
  { id: 'f_bank_info', label: '银行信息', labelEn: 'Bank Info', type: 'textarea', required: false, sortOrder: 19, width: '200px' },
  { id: 'f_remarks', label: '备注', labelEn: 'Remarks', type: 'textarea', required: false, sortOrder: 20, width: '150px' },
]

// CI 默认字段模板（与 PI 类似但无 validity、有发货信息）
export const DEFAULT_CI_FIELDS: TemplateField[] = [
  { id: 'f_ci_no', label: 'CI 编号', labelEn: 'CI No.', type: 'text', required: true, sortOrder: 1 },
  { id: 'f_ci_date', label: 'CI 日期', labelEn: 'Date', type: 'date', required: true, sortOrder: 2 },
  { id: 'f_pi_no', label: '对应 PI 编号', labelEn: 'PI No.', type: 'text', required: true, sortOrder: 3 },
  { id: 'f_seller', label: '卖方', labelEn: 'Seller', type: 'text', required: true, sortOrder: 4 },
  { id: 'f_buyer', label: '买方', labelEn: 'Buyer', type: 'text', required: true, sortOrder: 5 },
  { id: 'f_product_code', label: '产品编号', labelEn: 'Product Code', type: 'text', required: true, sortOrder: 6 },
  { id: 'f_description', label: '品名描述', labelEn: 'Description', type: 'textarea', required: true, sortOrder: 7 },
  { id: 'f_quantity', label: '数量', labelEn: 'Quantity', type: 'number', required: true, sortOrder: 8 },
  { id: 'f_unit', label: '单位', labelEn: 'Unit', type: 'select', required: true, options: ['SET', 'PCS', 'KG', 'M'], sortOrder: 9 },
  { id: 'f_unit_price', label: '单价', labelEn: 'Unit Price', type: 'currency', required: true, sortOrder: 10 },
  { id: 'f_amount', label: '金额', labelEn: 'Amount', type: 'currency', required: true, sortOrder: 11 },
  { id: 'f_total', label: '总金额', labelEn: 'Total Amount', type: 'currency', required: true, sortOrder: 12 },
  { id: 'f_hs_code', label: 'HS 编码', labelEn: 'HS Code', type: 'text', required: true, sortOrder: 13 },
  { id: 'f_origin', label: '原产地', labelEn: 'Country of Origin', type: 'text', required: true, defaultValue: 'China', sortOrder: 14 },
  { id: 'f_net_weight', label: '净重(KG)', labelEn: 'Net Weight (KG)', type: 'number', required: true, sortOrder: 15 },
  { id: 'f_gross_weight', label: '毛重(KG)', labelEn: 'Gross Weight (KG)', type: 'number', required: true, sortOrder: 16 },
  { id: 'f_packages', label: '件数', labelEn: 'No. of Packages', type: 'number', required: true, sortOrder: 17 },
  { id: 'f_remarks', label: '备注', labelEn: 'Remarks', type: 'textarea', required: false, sortOrder: 18 },
]

// PL 默认字段模板
export const DEFAULT_PL_FIELDS: TemplateField[] = [
  { id: 'f_pl_no', label: 'PL 编号', labelEn: 'PL No.', type: 'text', required: true, sortOrder: 1 },
  { id: 'f_pl_date', label: 'PL 日期', labelEn: 'Date', type: 'date', required: true, sortOrder: 2 },
  { id: 'f_ci_no', label: '对应 CI 编号', labelEn: 'CI No.', type: 'text', required: true, sortOrder: 3 },
  { id: 'f_seller', label: '卖方', labelEn: 'Seller', type: 'text', required: true, sortOrder: 4 },
  { id: 'f_buyer', label: '买方', labelEn: 'Buyer', type: 'text', required: true, sortOrder: 5 },
  { id: 'f_package_no', label: '箱号', labelEn: 'Package No.', type: 'text', required: true, sortOrder: 6 },
  { id: 'f_description', label: '品名描述', labelEn: 'Description', type: 'textarea', required: true, sortOrder: 7 },
  { id: 'f_quantity', label: '数量', labelEn: 'Quantity', type: 'number', required: true, sortOrder: 8 },
  { id: 'f_net_weight', label: '净重(KG)', labelEn: 'Net Weight (KG)', type: 'number', required: true, sortOrder: 9 },
  { id: 'f_gross_weight', label: '毛重(KG)', labelEn: 'Gross Weight (KG)', type: 'number', required: true, sortOrder: 10 },
  { id: 'f_dimensions', label: '尺寸(CM)', labelEn: 'Dimensions (CM)', type: 'text', required: true, sortOrder: 11 },
  { id: 'f_total_packages', label: '总件数', labelEn: 'Total Packages', type: 'number', required: true, sortOrder: 12 },
  { id: 'f_total_gross', label: '总毛重(KG)', labelEn: 'Total Gross (KG)', type: 'number', required: true, sortOrder: 13 },
  { id: 'f_total_net', label: '总净重(KG)', labelEn: 'Total Net (KG)', type: 'number', required: true, sortOrder: 14 },
  { id: 'f_total_volume', label: '总体积(CBM)', labelEn: 'Total Volume (CBM)', type: 'number', required: true, sortOrder: 15 },
  { id: 'f_marks', label: '唛头', labelEn: 'Shipping Marks', type: 'textarea', required: false, sortOrder: 16 },
  { id: 'f_remarks', label: '备注', labelEn: 'Remarks', type: 'textarea', required: false, sortOrder: 17 },
]
