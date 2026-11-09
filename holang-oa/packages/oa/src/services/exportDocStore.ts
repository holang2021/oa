// ============================================================
// 外销单证 CI（Commercial Invoice）/ PL（Packing List）草稿真源
//
// 刘总核心原则：同一个客户的 PI / CI / PL 数据互通 —— 三张单据共用同一组数据键
//   buyerName / buyerAddress / buyerAttn / buyerTel / buyerEmail / buyerEin
//   invoiceNo / invoiceDate / countryOfOrigin / items / paymentTerm / deliveryDate ...
//
// LOCKED 总纲第 5 / 11 条：后续单据须能表达自身最终事实；PI 只作「初始化来源」，
//   初始化 ≠ 永久引用 ≠ 强制同步 ≠ 不可改。此处从 PI 带出是一次性拷贝当下事实，
//   sourcePiId 仅记录来源便于追溯，不是外键，不会反向改 PI，也不会被 PI 后续改动覆盖。
//
// 走法 B / 第 9 问：本轮**不新建 Model、不建表、不建 API**。草稿先落 localStorage，
//   与 printTemplateStore / bankAccountStore / currencyStore 同范式，让销售当天就能在系统里
//   开单、预览、打印，不用回 Word / Excel（销售体验硬约束）。
//   上服务器多人共用属于下一步，需先确认持久化方案再动后端。
// ============================================================

export type ExportDocKind = 'CI' | 'PL'
export type ExportDocStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED'

/**
 * Commercial Item 第一性（LOCKED 第 7 条）：一张单据的行项可以是设备 / 外购 / 配件 /
 * 运杂 / 安装 / 服务，不为每种建结构。CI 用价格列、PL 用包装与重量列，同一行结构即可。
 */
export interface ExportDocItem {
  productCode: string   // 产品编号 / 型号
  hsCode: string        // HS 编码
  name: string          // DESCRIPTION OF PRODUCTS
  spec: string          // CI 的 Spec 列
  qty: number
  unit: string
  price: number
  amount: number
  package: string       // PL 的 PACKAGE 列
  nw: number            // PL 的 N.W (KGS)
  gw: number            // PL 的 G.W (KGS)
}

/** CI / PL 共用一张单据结构，用 kind 区分版式，不为每种单据复制一套模型 */
export interface ExportDoc {
  id: string
  kind: ExportDocKind
  code: string
  sourcePiId: string       // 仅记录「从哪张 PI 初始化过」，非外键
  sourcePiNo: string
  customerId: string
  customerName: string
  // 买方抬头：打印件左上方 To / Address / ATTN / EIN / E-mail
  buyerName: string
  buyerAddress: string
  buyerAttn: string
  buyerTel: string
  buyerEmail: string
  buyerEin: string
  // 单据头
  docDate: string
  countryOfOrigin: string
  currency: string
  // 商品明细
  items: ExportDocItem[]
  // CI 金额与条款
  totalAmount: number
  amountInWords: string
  transactionMethod: string
  paymentTerm: string
  deliveryDate: string
  remarks: string
  // PL 装箱信息（真实 PL 不显示单价 / 金额）
  totalPackages: string
  totalNW: number
  totalGW: number
  grossWeight: string
  netWeight: string
  measurement: string
  netDimension: string
  crateDimension: string
  packingNote: string
  status: ExportDocStatus
  createdAt: string
  updatedAt: string
}

/** PI 数据源：兼容后端 /pi/:id 返回与列表页 mock 数据，字段宽松、缺什么留什么 */
export interface PiSource {
  id: string
  piNo?: string
  piCode?: string
  customerId?: string
  customerName?: string
  amount?: number
  currency?: string
  issueDate?: string
  piDate?: string
  notes?: string
  items?: Array<{
    productCode?: string; hsCode?: string; name?: string
    qty?: number; unit?: string; price?: number; amount?: number
  }>
}

const STORAGE_KEY = 'holang.exportDocs.v1'

export const emptyItem = (): ExportDocItem => ({
  productCode: '', hsCode: '', name: '', spec: '', qty: 1, unit: 'pcs',
  price: 0, amount: 0, package: '', nw: 0, gw: 0,
})

const today = () => new Date().toISOString().split('T')[0]

export function emptyDoc(kind: ExportDocKind): ExportDoc {
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    code: '',
    sourcePiId: '', sourcePiNo: '',
    customerId: '', customerName: '',
    buyerName: '', buyerAddress: '', buyerAttn: '', buyerTel: '', buyerEmail: '', buyerEin: '',
    docDate: today(), countryOfOrigin: 'CHINA', currency: 'USD',
    items: [emptyItem()],
    totalAmount: 0, amountInWords: '',
    transactionMethod: '', paymentTerm: '', deliveryDate: '', remarks: '',
    totalPackages: '', totalNW: 0, totalGW: 0,
    grossWeight: '', netWeight: '', measurement: '',
    netDimension: '', crateDimension: '', packingNote: '',
    status: 'DRAFT',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

// ---- 本地草稿读写（与项目既有 store 同范式；不碰后端）----

export function getExportDocs(): ExportDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

export function getExportDocById(id: string): ExportDoc | undefined {
  return getExportDocs().find(d => d.id === id)
}

export function saveExportDoc(doc: ExportDoc): ExportDoc {
  const next = { ...doc, updatedAt: new Date().toISOString() }
  const list = getExportDocs()
  const idx = list.findIndex(d => d.id === doc.id)
  if (idx >= 0) list[idx] = next
  else list.unshift(next)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* 配额满时静默降级 */ }
  return next
}

export function deleteExportDoc(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getExportDocs().filter(d => d.id !== id)))
  } catch { /* noop */ }
}

/** 单据编号：CI-2026-001 / PL-2026-001，按同类型已有数量递增，保存时才定号 */
export function nextDocCode(kind: ExportDocKind): string {
  const year = new Date().getFullYear()
  const n = getExportDocs().filter(d => d.kind === kind).length + 1
  return `${kind}-${year}-${String(n).padStart(3, '0')}`
}

// ---- 从 PI 初始化：一次性拷贝，之后各单据独立维护自己的最终事实 ----

/** PI 表单把买方抬头与条款写在 notes 里（走法 B），此处按键读回，不新增字段 */
const PI_NOTE_PREFIX = {
  paymentTerm: '付款条款: ',
  transactionMethod: '交货条款: ',
  deliveryDate: '交货期: ',
  buyerAddress: '买方地址: ',
  buyerAttn: '买方联系人: ',
  buyerTel: '买方电话: ',
  buyerEmail: '买方邮箱: ',
} as const

export function parsePiNotes(notes?: string): Record<keyof typeof PI_NOTE_PREFIX, string> {
  const out = Object.fromEntries(Object.keys(PI_NOTE_PREFIX).map(k => [k, ''])) as Record<keyof typeof PI_NOTE_PREFIX, string>
  String(notes || '').split('\n').forEach(line => {
    for (const [k, prefix] of Object.entries(PI_NOTE_PREFIX)) {
      if (line.startsWith(prefix)) out[k as keyof typeof PI_NOTE_PREFIX] = line.slice(prefix.length).trim()
    }
  })
  return out
}

/**
 * 从 PI 生成 CI / PL 草稿。
 * 带出的只是「初始化值」：买方抬头、单据头、条款、商品名称与数量；
 * PL 特有的包装 / 毛净重、CI 的金额大写与 EIN 等 PI 没有的事实一律留空由销售补，
 * 不假装 PI 有这些数据（LOCKED 第 2 条：低优先级证据不推翻真实单据）。
 */
export function initDocFromPi(kind: ExportDocKind, pi: PiSource): ExportDoc {
  const base = emptyDoc(kind)
  const n = parsePiNotes(pi.notes)
  const srcItems = Array.isArray(pi.items) ? pi.items : []
  const items: ExportDocItem[] = srcItems.length
    ? srcItems.map(it => ({
        ...emptyItem(),
        productCode: it.productCode || '',
        hsCode: it.hsCode || '',
        name: it.name || '',
        // CI 的 Spec 用产品编号初始化；PL 不需要规格列
        spec: kind === 'CI' ? (it.productCode || '') : '',
        qty: Number(it.qty) || 0,
        unit: it.unit || 'pcs',
        price: kind === 'CI' ? (Number(it.price) || 0) : 0,
        amount: kind === 'CI' ? (Number(it.amount) || (Number(it.qty) || 0) * (Number(it.price) || 0)) : 0,
        // 包装 / 重量是装箱时才产生的最终事实，PI 不带出
        package: '', nw: 0, gw: 0,
      }))
    : [emptyItem()]

  return {
    ...base,
    sourcePiId: pi.id,
    sourcePiNo: pi.piNo || pi.piCode || '',
    customerId: pi.customerId || '',
    customerName: pi.customerName || '',
    buyerName: pi.customerName || '',
    buyerAddress: n.buyerAddress,
    buyerAttn: n.buyerAttn,
    buyerTel: n.buyerTel,
    buyerEmail: n.buyerEmail,
    buyerEin: '',
    docDate: today(),
    currency: pi.currency || 'USD',
    items,
    totalAmount: kind === 'CI' ? items.reduce((s, it) => s + (Number(it.amount) || 0), 0) : 0,
    transactionMethod: n.transactionMethod,
    paymentTerm: n.paymentTerm,
    deliveryDate: n.deliveryDate,
    totalNW: 0,
    totalGW: 0,
  }
}

// ---- 汇总：金额与重量一律由明细派生，不设第二个可填总额（PI 已定稿口径）----

export const sumAmount = (items: ExportDocItem[]) =>
  Number(items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0).toFixed(2))
export const sumNW = (items: ExportDocItem[]) =>
  Number(items.reduce((s, it) => s + (Number(it.nw) || 0), 0).toFixed(2))
export const sumGW = (items: ExportDocItem[]) =>
  Number(items.reduce((s, it) => s + (Number(it.gw) || 0), 0).toFixed(2))

// ---- 打印数据：键与 tpl-ci-print / tpl-pl-print 及 PI 模板完全对齐 ----

const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 金额大写：外贸单据惯例 SAY TOTAL ... ONLY；销售仍可在表单里覆盖 */
export function defaultAmountInWords(amount: number, currency: string): string {
  if (!amount || amount <= 0) return ''
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  const under1000 = (n: number): string => {
    const parts: string[] = []
    if (n >= 100) { parts.push(`${ones[Math.floor(n / 100)]} HUNDRED`); n %= 100 }
    if (n >= 20) { parts.push(tens[Math.floor(n / 10)]); if (n % 10) parts.push(ones[n % 10]); n = 0 }
    else if (n > 0) { parts.push(ones[n]); n = 0 }
    return parts.join(' ')
  }
  const int = Math.floor(amount)
  const cents = Math.round((amount - int) * 100)
  let words = ''
  if (int >= 1000000) { words += `${under1000(Math.floor(int / 1000000))} MILLION `; }
  const rest = int % 1000000
  if (rest >= 1000) { words += `${under1000(Math.floor(rest / 1000))} THOUSAND `; }
  if (rest % 1000) words += under1000(rest % 1000)
  words = words.trim() || 'ZERO'
  const cur = String(currency || '').toUpperCase()
  return cents
    ? `SAY TOTAL ${cur} ${words} AND ${String(cents).padStart(2, '0')}/100 ONLY`
    : `SAY TOTAL ${cur} ${words} ONLY`
}

/** 共用抬头：与 PI 模板同名同义，保证同客户三张单据不重复录入 */
function commonPrintHead(doc: ExportDoc, currencySymbol: string) {
  return {
    buyerName: doc.buyerName || doc.customerName || '',
    buyerAddress: doc.buyerAddress,
    buyerAttn: doc.buyerAttn,
    buyerTel: doc.buyerTel,
    buyerEmail: doc.buyerEmail,
    buyerEin: doc.buyerEin,
    invoiceNo: doc.code || '',
    invoiceDate: doc.docDate || '',
    countryOfOrigin: doc.countryOfOrigin || 'CHINA',
    currencySymbol,
    currencyName: `${currencySymbol} ${doc.currency}`.trim(),
  }
}

export function buildCiPrintData(doc: ExportDoc, currencySymbol: string, bank: Record<string, any> = {}): Record<string, any> {
  const items = doc.items.filter(it => (it.name || '').trim() !== '' || Number(it.price) > 0)
    .map((it, idx) => ({
      // CI 模板第一列是自动序号（showRowNumber 默认 true），后面 5 列走默认键
      name: it.name || '',
      spec: it.spec || it.productCode || '',
      qty: it.unit ? `${it.qty} ${it.unit}` : String(it.qty),
      price: money(it.price),
      amount: money((Number(it.qty) || 0) * (Number(it.price) || 0)),
      // 显式键，便于后续模板切到 tableFields 时不丢数据
      productCode: it.productCode || String(idx + 1),
      hsCode: it.hsCode || '',
    }))
  return {
    ...commonPrintHead(doc, currencySymbol),
    items,
    totalAmount: doc.totalAmount ? `${currencySymbol}${money(doc.totalAmount)}` : '',
    amountInWords: doc.amountInWords || defaultAmountInWords(doc.totalAmount, doc.currency),
    transactionMethod: doc.transactionMethod || '',
    paymentTerm: doc.paymentTerm || '',
    deliveryDate: doc.deliveryDate || '',
    remarks: doc.remarks || '',
    ...bank,
  }
}

export function buildPlPrintData(doc: ExportDoc): Record<string, any> {
  const items = doc.items.filter(it => (it.name || '').trim() !== '' || Number(it.qty) > 0)
    .map(it => ({
      hsCode: it.hsCode || '',
      name: it.name || '',
      qty: it.unit ? `${it.qty} ${it.unit}` : String(it.qty),
      package: it.package || '',
      nw: it.nw ? String(it.nw) : '',
      gw: it.gw ? String(it.gw) : '',
    }))
  return {
    ...commonPrintHead(doc, ''),
    items,
    totalNW: String(sumNW(doc.items)),
    totalGW: String(sumGW(doc.items)),
    totalPackages: doc.totalPackages || '',
    grossWeight: doc.grossWeight || '',
    netWeight: doc.netWeight || '',
    measurement: doc.measurement || '',
    netDimension: doc.netDimension || '',
    crateDimension: doc.crateDimension || '',
    packingNote: doc.packingNote || '',
  }
}

export const EXPORT_DOC_STATUS: Record<ExportDocStatus, string> = {
  DRAFT: '草稿', ISSUED: '已签发', CANCELLED: '已撤销',
}
