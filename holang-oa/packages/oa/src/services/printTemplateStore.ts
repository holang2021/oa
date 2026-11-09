import type { LucideIcon } from 'lucide-react'
import { PRINT_FONT_SIZES, PRINT_LOGO } from './printDesignTokens'

export type PaperSize = 'A4' | 'A5' | 'custom'
export type Orientation = 'portrait' | 'landscape'

export interface PrintField {
  type: 'text' | 'field' | 'table' | 'line' | 'image' | 'qrcode' | 'barcode' | 'footer' | 'header' | 'spacer' | 'twoColumn'
  label?: string
  labelKey?: string         // 动态标签：从 data[labelKey] 取（如外币/人民币银行块切换中英文标签）
  key?: string                // data field key to render
  content?: string            // static text content
  fontSize?: number           // px，取 printDesignTokens.PRINT_FONT_SIZES
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  columns?: PrintField[]      // for table header row
  tableFields?: PrintField[]  // for table body columns
  style?: Record<string, string | number>
  // 按真实外销单据版式复刻所用（刘总 2026-11-08）：
  src?: string               // image：真实 logo 路径
  height?: number            // image：显示高度 px
  left?: PrintField[]        // twoColumn：左栏（买方信息）
  right?: PrintField[]       // twoColumn：右栏（单据号 / 日期 / 原产地）
  bordered?: boolean         // table：真实单据粗黑框表头
  showRowNumber?: boolean    // table：false = 不加序号列（真实单据以 HS Code 起头）
  hideLabel?: boolean        // field：只输出值（大写金额 / 备注）
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
    name: 'PI打印模板（形式发票）',
    category: 'PI',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    // 版式参照真实客户 PI（Allum Corporation「PROFORMA INVOICE」，2026-11-05 刘总提供）。
    // 数据键 buyerName/buyerAddress/buyerAttn/buyerEmail/invoiceNo/invoiceDate/countryOfOrigin/
    // items/amountInWords/transactionMethod/paymentTerm/deliveryDate/remarks/beneficiaryAccount
    // 与 CI 完全复用；PL 复用买方与单据头 → 同客户 PI/CI/PL 数据互通。
    // currencyName 按单据实际币种输出（如 Euro / US Dollar），未传时回退模板静态文案。
    // 客户可见 PI 不含人民币金额 / 汇率：人民币折算只做内部参考，不进打印数据（刘总 2026-11-08）。
    // 明细表用 tableFields 自定义列（HS Code / DESCRIPTION / Qty / Unit Price / Total）。
    fields: [
      // 页头：真实 logo + 居中公司名与三行联系资料（严格按真实 Allum 单据版式，2026-11-08 刘总）
      { type: 'image', src: PRINT_LOGO.src, height: PRINT_LOGO.height, align: 'left' },
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: PRINT_FONT_SIZES.company, bold: true, align: 'center' },
      { type: 'header', content: 'Address: No. 51, Jinsigang Road, Wuzhong District, Suzhou, China', fontSize: PRINT_FONT_SIZES.meta, bold: false, align: 'center' },
      { type: 'header', content: 'Email: marketing@holangchina.com', fontSize: PRINT_FONT_SIZES.meta, bold: false, align: 'center' },
      { type: 'header', content: 'Tel: +86 4000512711', fontSize: PRINT_FONT_SIZES.meta, bold: false, align: 'center' },
      { type: 'spacer' },
      { type: 'header', content: 'PROFORMA INVOICE', fontSize: PRINT_FONT_SIZES.documentTitle, bold: true, align: 'center' },
      { type: 'spacer' },
      // 买方信息（左）与单据头（右）并排两栏，不再逐行堆叠
      { type: 'twoColumn', left: [
        { type: 'field', label: 'To', key: 'buyerName' },
        { type: 'field', label: 'Address', key: 'buyerAddress' },
        { type: 'field', label: 'CONTACT', key: 'buyerAttn' },
        { type: 'field', label: 'Tel.', key: 'buyerTel' },
        { type: 'field', label: 'E-mail', key: 'buyerEmail' },
      ], right: [
        { type: 'field', label: 'Invoice No.', key: 'invoiceNo' },
        { type: 'field', label: 'Date', key: 'invoiceDate' },
        { type: 'field', label: 'Country of Origin', key: 'countryOfOrigin' },
      ]},
      { type: 'header', content: 'US Dollar', key: 'currencyName', fontSize: PRINT_FONT_SIZES.small, bold: false, align: 'right' },
      // 明细表：真实单据 5 列 + 最左新增「产品编号 Item No.」（刘总 11-09），粗黑框、表头加粗
      { type: 'table', label: 'Item Details', key: 'items', bordered: true, showRowNumber: false, columns: [
        { type: 'text', content: 'Item No.', align: 'center' },
        { type: 'text', content: 'HS Code', align: 'left' },
        { type: 'text', content: 'DESCRIPTION OF PRODUCTS', align: 'center' },
        { type: 'text', content: 'Qty (set)', align: 'center' },
        { type: 'text', content: 'Unit Price', align: 'right' },
        { type: 'text', content: 'Total', align: 'right' },
      ], tableFields: [
        { type: 'text', key: 'productCode', align: 'center' },
        { type: 'text', key: 'hsCode', align: 'left' },
        { type: 'text', key: 'name', align: 'center' },
        { type: 'text', key: 'qty', align: 'center' },
        { type: 'text', key: 'price', align: 'right' },
        { type: 'text', key: 'amount', align: 'right' },
      ]},
      { type: 'field', label: 'TOTAL', key: 'totalAmount', align: 'right' },
      { type: 'field', label: 'Amount in Words', key: 'amountInWords', hideLabel: true },
      { type: 'spacer' },
      { type: 'field', label: 'TRANSACTION METHOD', key: 'transactionMethod' },
      { type: 'field', label: 'PAYMENT TERM', key: 'paymentTerm' },
      { type: 'field', label: 'DELIVERY DATE', key: 'deliveryDate' },
      { type: 'field', label: 'REMARKS', key: 'remarks', hideLabel: true },
      { type: 'spacer' },
      { type: 'header', content: 'Bank details:', key: 'bankDetailsTitle', fontSize: PRINT_FONT_SIZES.body, bold: true, align: 'left' },
      { type: 'field', label: 'Beneficiary Bank', labelKey: 'bankLabel1', key: 'beneficiaryBank' },
      { type: 'field', label: 'Bank Address', labelKey: 'bankLabel2', key: 'bankAddress' },
      { type: 'field', label: 'Swift Code', labelKey: 'bankLabel3', key: 'swiftCode' },
      { type: 'field', label: 'Beneficiary', labelKey: 'bankLabel4', key: 'beneficiary' },
      { type: 'field', label: 'Account No.', labelKey: 'bankLabel5', key: 'beneficiaryAccount' },
      { type: 'field', label: 'PAYMENT ROUTE', labelKey: 'bankLabel6', key: 'paymentRoute' },
      { type: 'spacer' },
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: PRINT_FONT_SIZES.body, bold: true, align: 'right' },
      { type: 'header', content: 'Authorized Signature', fontSize: PRINT_FONT_SIZES.small, bold: false, align: 'right' },
    ],
    createdAt: '2026-11-05',
    updatedAt: '2026-11-08',
  },
  {
    id: 'tpl-ci-print',
    name: 'CI打印模板（商业发票）',
    category: 'CI',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    // 版式参照真实客户 CI（Allum Corporation）。红色/黄色字体标记的项 = 每次开单要填的变量（见 field.key）。
    // 固定文案（卖方抬头、签名）用 header；银行信息按币种动态输出（见 bankAccountStore），不写死美元账户。
    fields: [
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: 14, bold: true, align: 'left' },
      { type: 'header', content: 'Address: No. 51, Jinsigang Road, Wuzhong District, Suzhou, China', fontSize: 10, bold: false, align: 'left' },
      { type: 'header', content: 'Email: marketing@holangchina.com', fontSize: 10, bold: false, align: 'left' },
      { type: 'header', content: 'Tel: +86 4000512711', fontSize: 10, bold: false, align: 'left' },
      { type: 'spacer' },
      { type: 'header', content: 'COMMERCIAL INVOICE', fontSize: 20, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: 'To', key: 'buyerName' },
      { type: 'field', label: 'Address', key: 'buyerAddress' },
      { type: 'field', label: 'ATTN', key: 'buyerAttn' },
      { type: 'field', label: 'EIN', key: 'buyerEin' },
      { type: 'field', label: 'E-mail', key: 'buyerEmail' },
      { type: 'field', label: 'Invoice No.', key: 'invoiceNo' },
      { type: 'field', label: 'Date', key: 'invoiceDate' },
      { type: 'field', label: 'Country of Origin', key: 'countryOfOrigin' },
      { type: 'header', content: 'US Dollar', key: 'currencyName', fontSize: 9, bold: false, align: 'right' },
      { type: 'spacer' },
      // 明细表：列头与渲染器的 body 对齐（No. + name + spec + qty + price + amount = 6 列）
      { type: 'table', label: 'Item Details', key: 'items', columns: [
        { type: 'text', content: 'No.', align: 'center' },
        { type: 'text', content: 'DESCRIPTION OF PRODUCTS', align: 'left' },
        { type: 'text', content: 'Spec', align: 'left' },
        { type: 'text', content: 'Qty (set)', align: 'right' },
        { type: 'text', content: 'Unit Price', align: 'right' },
        { type: 'text', content: 'Total', align: 'right' },
      ]},
      { type: 'field', label: 'Total Amount', key: 'totalAmount', align: 'right' },
      { type: 'field', label: 'Amount in Words', key: 'amountInWords' },
      { type: 'spacer' },
      { type: 'field', label: 'TRANSACTION METHOD', key: 'transactionMethod' },
      { type: 'field', label: 'PAYMENT TERM', key: 'paymentTerm' },
      { type: 'field', label: 'DELIVERY DATE', key: 'deliveryDate' },
      { type: 'field', label: 'REMARKS', key: 'remarks' },
      { type: 'spacer' },
      { type: 'header', content: 'Bank details:', key: 'bankDetailsTitle', fontSize: 11, bold: true, align: 'left' },
      { type: 'field', label: 'Beneficiary Bank', labelKey: 'bankLabel1', key: 'beneficiaryBank' },
      { type: 'field', label: 'Bank Address', labelKey: 'bankLabel2', key: 'bankAddress' },
      { type: 'field', label: 'Swift Code', labelKey: 'bankLabel3', key: 'swiftCode' },
      { type: 'field', label: 'Beneficiary', labelKey: 'bankLabel4', key: 'beneficiary' },
      { type: 'field', label: 'Account No.', labelKey: 'bankLabel5', key: 'beneficiaryAccount' },
      { type: 'field', label: 'PAYMENT ROUTE', labelKey: 'bankLabel6', key: 'paymentRoute' },
      { type: 'spacer' },
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: 11, bold: false, align: 'right' },
      { type: 'header', content: 'Authorized Signature', fontSize: 11, bold: false, align: 'right' },
      { type: 'footer', content: '--- HOLANG COMMERCIAL INVOICE ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
  },
  {
    id: 'tpl-pl-print',
    name: 'PL打印模板（装箱单）',
    category: 'PL',
    paperSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    enabled: true,
    // 版式参照真实客户 PL（Allum Corporation）。数据键 buyerName/buyerAddress/buyerAttn/buyerEin/
    // buyerEmail/invoiceNo/invoiceDate/countryOfOrigin/items 与 CI/PI 完全复用 → 同客户 PI/CI/PL 互通。
    // 明细表用 tableFields 自定义列（HS Code / DESCRIPTION / Qty / PACKAGE / N.W / G.W）。
    fields: [
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: 14, bold: true, align: 'left' },
      { type: 'header', content: 'Address: No. 51, Jinsigang Road, Wuzhong District, Suzhou, China', fontSize: 10, bold: false, align: 'left' },
      { type: 'header', content: 'Tel: +86 4000512711  Email: marketing@holangchina.com', fontSize: 10, bold: false, align: 'left' },
      { type: 'spacer' },
      { type: 'header', content: 'PACKING LIST', fontSize: 20, bold: true, align: 'center' },
      { type: 'spacer' },
      { type: 'field', label: 'To', key: 'buyerName' },
      { type: 'field', label: 'Address', key: 'buyerAddress' },
      { type: 'field', label: 'ATTN', key: 'buyerAttn' },
      { type: 'field', label: 'EIN', key: 'buyerEin' },
      { type: 'field', label: 'E-mail', key: 'buyerEmail' },
      { type: 'field', label: 'Invoice No.', key: 'invoiceNo' },
      { type: 'field', label: 'Date', key: 'invoiceDate' },
      { type: 'field', label: 'Country of Origin', key: 'countryOfOrigin' },
      { type: 'spacer' },
      { type: 'table', label: 'Packing Details', key: 'items', columns: [
        { type: 'text', content: 'No.', align: 'center' },
        { type: 'text', content: 'HS Code', align: 'left' },
        { type: 'text', content: 'DESCRIPTION OF PRODUCTS', align: 'left' },
        { type: 'text', content: 'Qty (set)', align: 'right' },
        { type: 'text', content: 'PACKAGE', align: 'left' },
        { type: 'text', content: 'N.W (KGS)', align: 'right' },
        { type: 'text', content: 'G.W (KGS)', align: 'right' },
      ], tableFields: [
        { type: 'text', key: 'hsCode', align: 'left' },
        { type: 'text', key: 'name', align: 'left' },
        { type: 'text', key: 'qty', align: 'right' },
        { type: 'text', key: 'package', align: 'left' },
        { type: 'text', key: 'nw', align: 'right' },
        { type: 'text', key: 'gw', align: 'right' },
      ]},
      { type: 'field', label: 'TOTAL N.W (KGS)', key: 'totalNW', align: 'right' },
      { type: 'field', label: 'TOTAL G.W (KGS)', key: 'totalGW', align: 'right' },
      { type: 'field', label: 'Total Packages', key: 'totalPackages' },
      { type: 'spacer' },
      { type: 'field', label: 'GROSS WEIGHT', key: 'grossWeight' },
      { type: 'field', label: 'NET WEIGHT', key: 'netWeight' },
      { type: 'field', label: 'MEASUREMENT', key: 'measurement' },
      { type: 'spacer' },
      { type: 'field', label: 'Net Dimension', key: 'netDimension' },
      { type: 'field', label: 'Crate Dimension', key: 'crateDimension' },
      { type: 'field', label: 'Packing', key: 'packingNote' },
      { type: 'spacer' },
      { type: 'header', content: 'Holang Tech (Suzhou) Co.,Ltd', fontSize: 11, bold: false, align: 'right' },
      { type: 'header', content: 'Authorized Signature', fontSize: 11, bold: false, align: 'right' },
      { type: 'footer', content: '--- HOLANG PACKING LIST ---', fontSize: 10, align: 'center' },
    ],
    createdAt: '2026-11-05',
    updatedAt: '2026-11-05',
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
  const builtinIds = new Set(BUILTIN_TEMPLATES.map(b => b.id))
  try {
    const raw = localStorage.getItem(PRINT_TEMPLATE_STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      if (Array.isArray(stored)) {
        // 内置模板以代码为唯一真源：新增的自动补进来，已存在的也随版本更新内容。
        // （刘总 2026-11-08 反馈：重建后的 PI 模板仍显示旧版，根因就是缓存里旧对象没被更新。）
        // 仅保留用户对该模板的「启用/禁用」状态；用户通过「复制」另存的自定义模板原样保留。
        const builtins = BUILTIN_TEMPLATES.map(b => {
          const old = stored.find((s: PrintTemplate) => s.id === b.id)
          return old ? { ...b, enabled: old.enabled } : b
        })
        const custom = stored.filter((s: PrintTemplate) => !builtinIds.has(s.id))
        return [...builtins, ...custom]
      }
    }
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
