import type { LucideIcon } from 'lucide-react'

export type PaperSize = 'A4' | 'A5' | 'custom'
export type Orientation = 'portrait' | 'landscape'

export interface PrintField {
  type: 'text' | 'field' | 'table' | 'line' | 'image' | 'qrcode' | 'barcode' | 'footer' | 'header' | 'spacer'
  label?: string
  key?: string                // data field key to render
  content?: string            // static text content
  fontSize?: number           // px
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  columns?: PrintField[]      // for table header row
  tableFields?: PrintField[]  // for table body columns
  style?: Record<string, string | number>
}

export interface PrintTemplate {
  id: string
  name: string
  category: string            // e.g. '订单', '合同', '报价', 'PI', '标签'
  paperSize: PaperSize
  orientation: Orientation
  width: number               // mm
  height: number              // mm
  enabled: boolean
  fields: PrintField[]
  createdAt: string
  updatedAt: string
}

export const PAPER_SPECS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  custom: { width: 210, height: 297 },
}

// Pre-built templates matching Huoban screenshot
export const BUILTIN_TEMPLATES: PrintTemplate[] = [
  {
    id: 'tpl-order-print',
    name: '订单打印模板',
    category: '订单',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG 订单确认单', fontSize: 20, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: '订单编号', key: 'orderNo' },
      { type: 'field', label: '客户名称', key: 'customerName' },
      { type: 'field', label: '下单日期', key: 'orderDate' },
      { type: 'field', label: '交货日期', key: 'deliveryDate' },
      { type: 'spacer' },
      { type: 'table', label: '产品明细', key: 'items', columns: [
        { type: 'text', content: '序号', align: 'center' },
        { type: 'text', content: '产品名称', align: 'left' },
        { type: 'text', content: '规格', align: 'left' },
        { type: 'text', content: '数量', align: 'right' },
        { type: 'text', content: '单价', align: 'right' },
        { type: 'text', content: '金额', align: 'right' },
      ]},
      { type: 'spacer' },
      { type: 'field', label: '订单金额', key: 'totalAmount', align: 'right' },
      { type: 'spacer' },
      { type: 'footer', content: '--- HOLANG All In One 管理系统 ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'tpl-contract-print',
    name: '合同打印模板',
    category: '合同',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG 销售合同', fontSize: 20, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: '合同编号', key: 'contractNo' },
      { type: 'field', label: '甲方（买方）', key: 'customerName' },
      { type: 'field', label: '乙方（卖方）', key: 'companyName' },
      { type: 'field', label: '签订日期', key: 'signDate' },
      { type: 'spacer' },
      { type: 'table', label: '合同明细', key: 'items', columns: [
        { type: 'text', content: '序号', align: 'center' },
        { type: 'text', content: '产品名称', align: 'left' },
        { type: 'text', content: '规格型号', align: 'left' },
        { type: 'text', content: '数量', align: 'right' },
        { type: 'text', content: '单价', align: 'right' },
        { type: 'text', content: '金额', align: 'right' },
      ]},
      { type: 'spacer' },
      { type: 'field', label: '合同金额', key: 'totalAmount', align: 'right' },
      { type: 'spacer' },
      { type: 'footer', content: '--- 盖章有效 ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'tpl-quotation-print',
    name: '报价单打印模板',
    category: '报价',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG 报价单', fontSize: 20, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: '报价编号', key: 'quotationNo' },
      { type: 'field', label: '客户名称', key: 'customerName' },
      { type: 'field', label: '报价日期', key: 'quotationDate' },
      { type: 'field', label: '有效期至', key: 'validUntil' },
      { type: 'spacer' },
      { type: 'table', label: '报价明细', key: 'items', columns: [
        { type: 'text', content: '序号', align: 'center' },
        { type: 'text', content: '产品名称', align: 'left' },
        { type: 'text', content: '规格', align: 'left' },
        { type: 'text', content: '数量', align: 'right' },
        { type: 'text', content: '单价', align: 'right' },
        { type: 'text', content: '金额', align: 'right' },
      ]},
      { type: 'spacer' },
      { type: 'field', label: '报价总额', key: 'totalAmount', align: 'right' },
      { type: 'spacer' },
      { type: 'footer', content: '--- 本报价有效期30天 ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'tpl-pi-print',
    name: 'PI打印模板',
    category: 'PI',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG PROFORMA INVOICE', fontSize: 18, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: 'PI No.', key: 'piNo' },
      { type: 'field', label: 'Date', key: 'piDate' },
      { type: 'field', label: 'To', key: 'customerName' },
      { type: 'spacer' },
      { type: 'table', label: 'Item Details', key: 'items', columns: [
        { type: 'text', content: 'No.', align: 'center' },
        { type: 'text', content: 'Description', align: 'left' },
        { type: 'text', content: 'Quantity', align: 'right' },
        { type: 'text', content: 'Unit Price', align: 'right' },
        { type: 'text', content: 'Amount', align: 'right' },
      ]},
      { type: 'spacer' },
      { type: 'field', label: 'Total Amount', key: 'totalAmount', align: 'right' },
      { type: 'spacer' },
      { type: 'footer', content: '--- HOLANG All In One Management System ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'tpl-product-label-landscape',
    name: '产品码标签（横向）',
    category: '标签',
    paperSize: 'A5',
    orientation: 'landscape',
    width: 210,
    height: 148,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG 产品标签', fontSize: 16, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'qrcode', key: 'productCode', align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: '产品名称', key: 'productName', align: 'center' },
      { type: 'field', label: '产品编号', key: 'productCode', align: 'center' },
      { type: 'field', label: '规格', key: 'specification', align: 'center' },
      { type: 'field', label: '生产日期', key: 'produceDate', align: 'center' },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'tpl-product-label-portrait',
    name: '产品码标签（纵向）',
    category: '标签',
    paperSize: 'A5',
    orientation: 'portrait',
    width: 148,
    height: 210,
    enabled: true,
    fields: [
      { type: 'header', content: 'HOLANG', fontSize: 14, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'qrcode', key: 'productCode', align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: '产品', key: 'productName', align: 'center', fontSize: 12 },
      { type: 'field', label: '编号', key: 'productCode', align: 'center', fontSize: 10 },
      { type: 'field', label: '日期', key: 'produceDate', align: 'center', fontSize: 10 },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
]

export const PRINT_TEMPLATE_STORAGE_KEY = 'holang_print_templates'

export function loadPrintTemplates(): PrintTemplate[] {
  try {
    const raw = localStorage.getItem(PRINT_TEMPLATE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [...BUILTIN_TEMPLATES]
}

export function savePrintTemplates(templates: PrintTemplate[]) {
  localStorage.setItem(PRINT_TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

export function getTemplateById(id: string): PrintTemplate | undefined {
  return loadPrintTemplates().find(t => t.id === id)
}

export function getEnabledTemplatesByCategory(category: string): PrintTemplate[] {
  return loadPrintTemplates().filter(t => t.category === category && t.enabled)
}

export function getAllCategories(): string[] {
  const cats = new Set(loadPrintTemplates().map(t => t.category))
  return Array.from(cats)
}

export function getPaperSizeLabel(p: PaperSize, o: Orientation): string {
  const size = PAPER_SPECS[p]
  const w = o === 'portrait' ? size.width : size.height
  const h = o === 'portrait' ? size.height : size.width
  return `${p} ${o === 'portrait' ? '纵向' : '横向'} ${w} × ${h} mm`
}
