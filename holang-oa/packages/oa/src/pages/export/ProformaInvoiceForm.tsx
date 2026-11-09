import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, Copy, Check } from 'lucide-react'
import { usePrintPreview } from '../../components/PrintPreview'
import { useI18n } from '../../i18n/I18nContext'
import { getCustomers } from '../../services/customerService'
import { getQuotes, type Quote } from '../../services/quoteService'
import { createPi, updatePiContent, getPiById, type PiItem, type CreatePiInput } from '../../services/piService'
// 汇率唯一真源：系统设置「币种与汇率」的后端汇率表 + 换算函数（刘总 2026-11-08：
// 「我们已经设计过汇率的计算方式」）。PI 不再自己写死 7.27 / 7.85。
import {
  initCurrencies, getActiveCurrencies, getCurrencyById, convertToCNY, type Currency,
} from '../../services/currencyStore'
// 收款账户按币种默认协同：选 USD / EUR / CNY 自动带出各自账户与回款路径（刘总 2026-11-08）
import {
  initBankAccounts, getBankAccounts, getBankAccountForExport, missingBankFields,
  buildBankPrintData, buildBankCopyText, type BankAccount,
} from '../../services/bankAccountStore'
import { copyText } from '../../services/clipboard'

interface PiForm {
  piCode: string
  customerId: string
  customerName: string
  quotationId: string
  piDate: string
  validityDays: number
  status: string
  currency: string
  totalAmount: number
  items: PiItem[]
  paymentTerms: string
  deliveryTerms: string
  deliveryDate: string
  signedAt: string
  notes: string
}

/**
 * 录入控件视觉基线（刘总 11-09「框线太小，请重新通盘设计」）
 * 唯一真源：docs/OA_UI_Foundation_V0.1.md 第 5/6/7/11/12 节 + docs/oa-design-tokens.json
 *   component.inputHeight=36 / inputHeightComplex=40 / tableHeaderH=40 / tableRowH=44
 *   fontSize.body=14 / aux=13（规范：正常业务信息不得低于 13px，不得为塞内容缩小字号）
 *   space.2=8 / space.3=12 / space.4=16；radius.sm=6 / radius.md=8
 *   颜色对齐 --color-*：gray-300=#d1d5db(border-dark)、gray-200=#e5e7eb(border)、
 *   gray-400=#9ca3af(text-muted)、brand-500/600=#1a56db(primary Focus)
 * 基线状态为 Candidate，规范明确「三页验证跑通前不得全局重构、不得改全站样式」，
 * 故**只在 PI 页落地**，绝不改 index.css 的全局 .input；其他页面不受影响。
 * ⚠️ OA 根字号 15px，Tailwind 的 h-9 / px-3 / text-sm 会被 rem 缩放，必须写显式 px 才等于 token 值。
 */
const FIELD_INPUT =
  'w-full h-[40px] px-[12px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors'
const CELL_INPUT =
  'w-full h-[36px] px-[8px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors'
const CELL_INPUT_RIGHT = CELL_INPUT + ' text-right'
const TEXTAREA_INPUT =
  'w-full min-h-[80px] px-[12px] py-[8px] text-[14px] leading-5 bg-white border border-gray-300 rounded-[6px] resize-y ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors'
// Label 统一 40px 高（= component.inputHeightComplex，可容 2 行 13px 文字），保证同一 grid 里所有输入框顶对齐。
// 字号 13px = fontSize.aux（原 text-[13px]=12px 低于规范下限）。block 是 min-height 生效的前提。
const FIELD_LABEL = 'block min-h-[40px] text-[13px] leading-5 text-gray-500'

// 商品明细空行：真实 PI 单据的一行可以是设备 / 外购 / 配件 / 运杂 / 安装 / 服务，
// 不为每种建结构（LOCKED 总纲第7条 Commercial Item 第一性）。
// 单位默认 pcs（刘总 11-09）：只是新行的初始值，输入框仍可自由改，不写死、不锁字段、不建枚举。
const DEFAULT_PI_UNIT = 'pcs'
const emptyItem = (): PiItem => ({ productCode: '', hsCode: '', name: '', qty: 1, unit: DEFAULT_PI_UNIT, price: 0, amount: 0 })
// 与真实 Allum PI 单据一致的千分位两位小数写法，如 13,800.00
const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const emptyForm = (): PiForm => ({
  piCode: '',
  customerId: '',
  customerName: '',
  quotationId: '',
  piDate: new Date().toISOString().split('T')[0],
  validityDays: 30,
  status: 'DRAFT',
  currency: 'USD',
  totalAmount: 0,
  items: [emptyItem()],
  paymentTerms: '',
  deliveryTerms: '',
  deliveryDate: '',
  signedAt: '',
  notes: '',
})

const statusOptions = ['DRAFT', 'CONFIRMED', 'CANCELLED']
const statusLabels: Record<string, string> = {
  DRAFT: '草稿', CONFIRMED: '已确认', CANCELLED: '已撤销',
}
const paymentTermOptions = [
  'TT 30% in advance, 70% before shipment',
  'TT 30% in advance, 60% before shipment, 10% after acceptance',
  'LC at sight',
  'LC 30 days',
  '100% TT before shipment',
]
const deliveryTermOptions = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP']
// 真实 PI 的 DELIVERY DATE 是「相对时间描述」而非日历日期（刘总 2026-11-08：
// 「在备注中我们可以描述交货期为多少时间，不要在这把自己写死」）。
// 这里只做常用写法快捷建议，不限制输入。
const deliveryDateOptions = [
  '20 DAYS AFTER RECEIVING THE PREPAYMENT',
  '30 DAYS AFTER RECEIVING THE PREPAYMENT',
  '45 DAYS AFTER RECEIVING THE PREPAYMENT',
  '20 DAYS AFTER RECEIVING THE PREPAYMENT / THE ESTIMATED CIF SHIPPING TIME TO MIAMI IS APPROXIMATELY 40 DAYS.',
]

// 付款条款 / 交易条件 / 交货期都是可协商文本，PI 表没有独立列，统一带前缀存进 notes，
// 编辑页按前缀解析回来（否则保存后重开全丢，销售只能重新敲一遍）。
// 分隔符兼容旧版的「；」单行格式与新版「换行」格式。
const NOTE_PREFIX = {
  paymentTerms: '付款条款: ',
  deliveryTerms: '交货条款: ',
  deliveryDate: '交货期: ',
} as const

function parseNotes(raw?: string | null) {
  const text = raw || ''
  // 新版按换行分（自由备注里的分号原样保留）；仅旧版那种「一整行用；连接」才退回按分号切。
  const lines = (text.includes('\n') ? text.split('\n') : text.split('；')).map(s => s.trim()).filter(Boolean)
  const pick = (p: string) => {
    const line = lines.find(l => l.startsWith(p))
    return line ? line.slice(p.length).trim() : ''
  }
  const prefixes = Object.values(NOTE_PREFIX) as string[]
  const free = lines.filter(l => !prefixes.some(p => l.startsWith(p))).join('\n')
  return {
    paymentTerms: pick(NOTE_PREFIX.paymentTerms),
    deliveryTerms: pick(NOTE_PREFIX.deliveryTerms),
    deliveryDate: pick(NOTE_PREFIX.deliveryDate),
    notes: free,
  }
}

// 返回空串而不是 undefined：编辑时清空条款/备注也要能写回库，否则后端会把「没传」当成「不修改」。
function buildNotes(f: PiForm): string {
  const parts: string[] = []
  if (f.paymentTerms.trim()) parts.push(NOTE_PREFIX.paymentTerms + f.paymentTerms.trim())
  if (f.deliveryTerms.trim()) parts.push(NOTE_PREFIX.deliveryTerms + f.deliveryTerms.trim())
  if (f.deliveryDate.trim()) parts.push(NOTE_PREFIX.deliveryDate + f.deliveryDate.trim())
  if (f.notes.trim()) parts.push(f.notes.trim())
  return parts.join('\n')
}

export default function ProformaInvoiceForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isEdit = !!id
  const { openPreview, PrintPreviewComponent } = usePrintPreview()

  const [form, setForm] = useState<PiForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  // 币种下拉与汇率同源：先同步读缓存，再从后端 /currencies 预热一次（与系统设置同一张表）。
  const [currencyList, setCurrencyList] = useState<Currency[]>(getActiveCurrencies())
  // 收款账户来自后端配置；先用内置真源渲染，异步加载完成后刷新（触发按币种协同重算）
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => getBankAccounts())
  // PI 总金额默认跟随明细合计（单一真源）；销售手工改过之后不再自动覆盖，保留可编辑权。
  // PI 总金额不再是可填字段：它由明细合计自动派生（刘总 11-09「自动算的、就是默认金额，没必要存在」）。
  // 表单里只保留一个金额展示（明细合计条），不再重复录入、不再手工改（减工作 / 降错）。
  // 一键复制收款信息给客户（销售开 PI 时最常用；复制不受编辑权限限制）
  const [copyHint, setCopyHint] = useState<{ ok: boolean; text: string } | null>(null)
  const [copiedBank, setCopiedBank] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await initCurrencies()
      await initBankAccounts()
      if (alive) { setCurrencyList(getActiveCurrencies()); setBankAccounts(getBankAccounts()) }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const custData: any = await getCustomers({ salesType: 'EXTERNAL' })
        setCustomers(Array.isArray(custData) ? custData : custData?.list || [])
        if (isEdit && id) {
          const pi = await getPiById(id)
          if (pi) {
            const parsed = parseNotes(pi.notes)
            const loadedItems: PiItem[] = Array.isArray(pi.items) && pi.items.length
              ? pi.items.map((it: any) => ({
                  productCode: it.productCode || '',
                  hsCode: it.hsCode || '',
                  name: it.name || '',
                  qty: Number(it.qty ?? 1) || 1,
                  unit: it.unit || '',
                  price: Number(it.price ?? 0) || 0,
                  amount: Number(it.amount ?? 0) || 0,
                }))
              : [emptyItem()]
            // 明细读入后，总金额由下方 useEffect 按明细合计自动派生
            setForm({
              piCode: pi.piNo || '',
              customerId: pi.customerId || '',
              customerName: '',
              quotationId: pi.quoteRef || '',
              piDate: (pi.issuedAt || '').slice(0, 10) || new Date().toISOString().split('T')[0],
              validityDays: 30,
              status: pi.status || 'DRAFT',
              currency: pi.currency || 'USD',
              totalAmount: pi.amount || 0,
              items: loadedItems,
              paymentTerms: parsed.paymentTerms,
              deliveryTerms: parsed.deliveryTerms,
              deliveryDate: parsed.deliveryDate,
              signedAt: '',
              notes: parsed.notes,
            })
            // 明细为空的旧单据保留后端原金额（历史真事实不被清零）；有明细时由下方 useEffect 自动派生。
          }
        } else {
          const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)
          setForm(prev => ({ ...prev, piCode: `PI-${dateStr}-NEW` }))
        }
      } catch (e: any) {
        alert(e?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  // 选中客户后加载该客户的「已接受(ACCEPTED)外销报价」供关联
  useEffect(() => {
    if (!form.customerId) { setQuotes([]); return }
    ;(async () => {
      try {
        const q: any = await getQuotes({ customerId: form.customerId, status: 'ACCEPTED', salesType: 'EXTERNAL' })
        setQuotes(Array.isArray(q) ? q : q?.list || [])
      } catch {
        setQuotes([])
      }
    })()
  }, [form.customerId])

  const update = (field: keyof PiForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)
  // 折算只用于内部参考，不进入给客户的 PI / 打印数据；汇率取 currencyStore（系统已设计的算法）。
  const activeCurrency = getCurrencyById(form.currency)
  // 出口单据（PI）账户真源：CNY 优先「人民币外币账户」，绝不掉到国内中文账户（刘总 11-09）
  const activeBankAccount = useMemo(
    () => getBankAccountForExport(form.currency),
    [form.currency, bankAccounts],
  )
  const isCnyForeignBank = activeBankAccount?.accountType === 'CNY_FOREIGN'
  const bankMissing = missingBankFields(activeBankAccount)
  /** 一键复制当前币种收款信息：销售可直接粘贴到邮件 / 聊天发给客户；资料不全时拒绝复制 */
  const handleCopyBank = async () => {
    if (!activeBankAccount || bankMissing.length) {
      setCopyHint({ ok: false, text: '该币种收款账户未维护完整，为避免把错误信息发给客户，暂不能复制。' })
      window.setTimeout(() => setCopyHint(null), 3500)
      return
    }
    const ok = await copyText(buildBankCopyText(activeBankAccount))
    if (!ok) {
      setCopyHint({ ok: false, text: '浏览器未允许复制，请手动选中文字复制。' })
      return
    }
    setCopiedBank(true)
    setCopyHint({ ok: true, text: `已复制 ${form.currency} 收款信息（英文出口口径），可直接粘贴发给客户。` })
    window.setTimeout(() => { setCopiedBank(false); setCopyHint(null) }, 3000)
  }
  const cnyReference = convertToCNY(Number(form.totalAmount) || 0, form.currency)
  const itemsTotal = form.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
  // 确认前可改、确认后冻结最终交易事实（LOCKED 总纲第6条）
  const isFrozen = form.status === 'CONFIRMED'

  // 总金额 = 明细合计，唯一来源：填完明细自动带出，销售不再重复录入、也不再手工改（刘总 11-09）。
  // 明细为空（itemsTotal=0）时不覆盖，保护「无明细、仅有金额」的历史单据不被清零。
  useEffect(() => {
    if (isFrozen || itemsTotal <= 0) return
    const auto = Number(itemsTotal.toFixed(2))
    if (Math.abs(auto - (Number(form.totalAmount) || 0)) > 0.009) {
      setForm(prev => ({ ...prev, totalAmount: auto }))
    }
    // 只依赖明细合计 / 冻结状态：写回 totalAmount 不会再次触发，避免循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsTotal, isFrozen])

  const quoteItems: any[] = (() => {
    const q: any = quotes.find(q => q.id === form.quotationId) || {}
    return Array.isArray(q.items) ? q.items : []
  })()

  // 报价单只做「初始化来源」：带出后仍可自由改，不永久引用、不强制同步、不锁定（LOCKED 总纲第5条）
  const loadFromQuote = () => {
    if (!quoteItems.length) return
    const loaded: PiItem[] = quoteItems.map(it => {
      const qty = Number(it.quantity ?? 1) || 1
      const price = Number(it.unitPrice ?? 0) || 0
      return {
        productCode: it.productCode || it.product?.model || '',
        hsCode: it.hsCode || it.product?.model || '',
        name: it.product?.name || it.productName || it.description || '',
        qty, unit: it.unit || DEFAULT_PI_UNIT, price,
        amount: Number((qty * price).toFixed(2)),
      }
    })
    setForm(prev => ({ ...prev, items: loaded, totalAmount: Number(loaded.reduce((s, x) => s + x.amount, 0).toFixed(2)) }))
  }

  const updateItem = (idx: number, field: keyof PiItem, raw: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => {
        if (i !== idx) return it
        const next = {
          ...it,
          [field]: field === 'qty' || field === 'price' ? (parseFloat(raw) || 0) : raw,
        } as PiItem
        // 行金额随数量/单价自动算，避免销售手算错；整笔费用可用 数量=1 + 单价=总额 表达
        next.amount = Number(((Number(next.qty) || 0) * (Number(next.price) || 0)).toFixed(2))
        return next
      }),
    }))
  }
  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }))
  const removeItem = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))

  // 把「PI 表单 + 客户 + 销售录入的商品明细」组装成打印数据。
  // 买方/单据头数据键与 CI/PL 模板一致，同一客户信息不重复录入（刘总 PI/CI/PL 互通原则）。
  const buildPiPrintData = (): Record<string, any> => {
    const c: any = selectedCustomer || {}
    // 币种符号取系统汇率真源（$ / € / ¥ / £）：只出现在 Unit Price / Total 两个列头与 TOTAL 行，
    // 表格内金额回到纯数字，不再重复带符号（刘总 11-09：删掉 US Dollar 行，改成 Unit Price ($) / Total ($)）
    const currencySymbol = activeCurrency?.symbol || ''
    const printableItems = form.items
      .filter(it => (it.name || '').trim() !== '' || Number(it.price) > 0)
      .map((it, idx) => ({
        // 产品编号：销售填了型号/料号就显示它，没填则退化为行号 1、2、3（Item No.）
        productCode: (it.productCode || '').trim() || String(idx + 1),
        hsCode: it.hsCode || '',
        name: it.name || '',
        qty: it.unit ? `${it.qty} ${it.unit}` : String(it.qty),
        price: money(it.price),
        amount: money(it.amount),
      }))
    return {
      buyerName: c.name || form.customerName || '',
      buyerAddress: c.address || '',
      buyerAttn: c.contactName || '',
      buyerTel: c.contactPhone || '',
      buyerEmail: c.contactEmail || '',
      invoiceNo: form.piCode || '',
      invoiceDate: form.piDate || '',
      countryOfOrigin: 'CHINA',
      // 列头占位符 {currencySymbol} 用这个符号注入；PI 打印件不再单独输出 US Dollar 名称行
      currencySymbol,
      currencyName: `${currencySymbol} ${activeCurrency?.nameEn || form.currency}`.trim(),
      // 无明细时输出空表（渲染器给一行空单元格）；内部操作提示不进客户可见的打印数据
      items: printableItems,
      totalAmount: form.totalAmount ? `${currencySymbol}${money(form.totalAmount)}` : '',
      amountInWords: '',
      transactionMethod: form.deliveryTerms || '',
      paymentTerm: form.paymentTerms || '',
      deliveryDate: form.deliveryDate || '',
      remarks: form.notes || '',
      // 收款账户按当前币种自动协同：不再写死美元账号；资料不全时输出待维护提示而非错账号
      ...buildBankPrintData(form.currency),
    }
  }

  const handleExportPdf = () => openPreview('tpl-pi-print', buildPiPrintData())

  const handleSave = async () => {
    if (!form.customerId) { alert('请选择客户'); return }
    // 报价单改为选填：有些报价单尚未在系统内完成，允许先建 PI，后续再补关联（刘总 2026-11-08）
    if (!form.totalAmount || form.totalAmount <= 0) { alert('请填写商品明细（数量与单价），PI 总金额会自动算出'); return }
    setSaving(true)
    try {
      const issuedAt = form.piDate ? new Date(form.piDate).toISOString() : undefined
      const expiresAt = (() => {
        if (!form.piDate) return undefined
        const d = new Date(form.piDate)
        d.setDate(d.getDate() + (form.validityDays || 30))
        return d.toISOString()
      })()
      const notes = buildNotes(form)
      // 过滤全空行；明细是这张 PI 自身的最终交易事实，随单据落库（不依赖报价单）
      const items = form.items.filter(it => (it.name || '').trim() !== '' || Number(it.price) > 0)
      if (isEdit && id) {
        await updatePiContent(id, { status: form.status, amount: form.totalAmount, currency: form.currency, notes, items })
      } else {
        const payload: CreatePiInput = {
          customerId: form.customerId,
          // 未关联报价单时完全不传该字段（后端 zod 对空串会报 min(1)）
          ...(form.quotationId ? { quoteRef: form.quotationId } : {}),
          amount: form.totalAmount,
          currency: form.currency,
          issuedAt,
          expiresAt,
          notes,
          items,
        }
        await createPi(payload)
      }
      navigate('/export/proforma-invoices')
    } catch (e: any) {
      alert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">加载中…</div>
  }

  return (
    <div className="space-y-4">
      {/* 导出 PDF 预览弹层：先预览，再由预览页「打印」按钮另存为 PDF */}
      {PrintPreviewComponent}
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-[16px]">
        <button onClick={() => navigate(-1)} className="btn btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold">
          {isEdit ? `编辑 PI ${form.piCode}` : '新建 PI（形式发票）'}
        </h2>
        <div className="ml-auto" />
        <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
          <Save size={14} className="mr-1" />
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={handleExportPdf} className="btn btn-outline text-sm" title="先预览，再在预览页点「打印」另存为 PDF">
          <FileText size={14} className="mr-1" />
          导出 PDF（预览）
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 基本信息 */}
        <div className="card lg:col-span-2 space-y-[16px]">
          <h3 className="font-medium text-sm">基本信息</h3>
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <label className={FIELD_LABEL}>PI 编号（保存后自动生成）</label>
              <input value={form.piCode} disabled className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>PI 日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.piDate} onChange={e => update('piDate', e.target.value)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>有效期（天）</label>
              <input type="number" value={form.validityDays} onChange={e => update('validityDays', parseInt(e.target.value) || 30)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className={FIELD_INPUT}>
                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 客户信息 */}
        <div className="card space-y-[16px]">
          <h3 className="font-medium text-sm">客户信息</h3>
          <div>
            <label className={FIELD_LABEL}>客户（外销）<span className="text-red-500">*</span></label>
            <select value={form.customerId} onChange={e => { update('customerId', e.target.value); update('quotationId', '') }} className={FIELD_INPUT}>
              <option value="">请选择客户</option>
              {customers.filter(c => (c.salesType || '').toUpperCase() === 'EXTERNAL').map(c => (
                <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
              ))}
            </select>
          </div>
          {selectedCustomer && (
            <div className="text-[13px] text-gray-500 space-y-1">
              <div>客户：{selectedCustomer.companyName || selectedCustomer.name}</div>
            </div>
          )}
          <div>
            <label className={FIELD_LABEL}>关联报价单（须 ACCEPTED）<span className="text-gray-400">· 选填</span></label>
            <select value={form.quotationId} onChange={e => update('quotationId', e.target.value)} className={FIELD_INPUT}>
              <option value="">不关联（直接建 PI）</option>
              {quotes.map(q => (
                <option key={q.id} value={q.id}>{q.code}（{q.amount?.toLocaleString?.() ?? q.amount}）</option>
              ))}
            </select>
            {form.customerId && quotes.length === 0 && (
              <div className="text-[13px] text-amber-600 mt-1">该外销客户暂无「已接受」报价单，可留空直接建 PI，后续再补关联</div>
            )}
            <div className="text-[13px] text-gray-400 mt-1">关联后可点下方「从报价单带入」初始化明细，带入后仍可自由改</div>
          </div>
        </div>

        {/* 商品明细：销售直接录入单价/数量/明细（刘总 2026-11-08「产品销售单价、明细没有地方能填写」） */}
        <div className="card lg:col-span-3 space-y-[16px]">
          <div className="flex items-center gap-[16px] flex-wrap">
            <h3 className="font-medium text-sm">商品明细（Commercial Items）</h3>
            <span className="text-[13px] text-gray-400">设备 / 外购 / 配件 / 运杂 / 安装 / 服务都可直接加行，金额＝数量 × 单价自动算</span>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={loadFromQuote} disabled={!quoteItems.length || isFrozen}
                className="btn btn-outline text-[13px]" title="从关联报价单初始化明细；带入后仍可自由修改，不强制同步">
                从报价单带入
              </button>
              <button type="button" onClick={addItem} disabled={isFrozen} className="btn btn-outline text-[13px]">
                <Plus size={13} className="mr-1" />新增一行
              </button>
            </div>
          </div>
          {isFrozen && (
            <div className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              该 PI 已确认，最终交易事实已冻结，明细与金额不可再改（如需修改请先把状态改回草稿）。
            </div>
          )}
          {/* 列多时按 UI 基线用固定列宽 + 横向滚动，绝不把输入框压扁（Foundation 第 12/17 节） */}
          <div className="text-[13px] text-gray-400">列较多，窄屏可左右滚动查看全部列</div>
          <div className="overflow-x-auto rounded-[8px] border border-gray-200">
            {/* 常用单位快捷选项：只是建议，input 仍可自由输入（保留修改的权力） */}
            <datalist id="pi-unit-options">
              {['pcs', 'set', 'kg', 'm', '台', '套', '件', '项'].map(u => <option key={u} value={u} />)}
            </datalist>
            {/* 列宽以 token space-2(8px) 为基数：40 / 80 / 112 均为 8 的倍数；DESCRIPTION 吃掉剩余宽度。
                表头 40px、行 44px、表格字号 14px 全部取 oa-design-tokens.json → component / fontSize。 */}
            <table className="w-full table-fixed text-[14px]" style={{ minWidth: 960 }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 112 }} />
                <col />
                <col style={{ width: 80 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr className="h-[40px] border-b-2 border-gray-200 text-[13px] font-medium text-gray-500">
                  <th className="px-[8px] text-center">No.</th>
                  <th className="px-[8px] text-left">产品编号</th>
                  <th className="px-[8px] text-left">HS Code</th>
                  <th className="px-[8px] text-left">DESCRIPTION OF PRODUCTS <span className="text-red-500">*</span></th>
                  <th className="px-[8px] text-right">Qty</th>
                  <th className="px-[8px] text-left" title="默认 pcs，可自由修改">单位</th>
                  <th className="px-[8px] text-right">Unit Price</th>
                  <th className="px-[8px] text-right">Total</th>
                  <th className="px-[8px]" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx} className="h-[44px] border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="px-[8px] text-center text-[13px] text-gray-400 align-middle">{idx + 1}</td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input value={it.productCode || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'productCode', e.target.value)}
                        placeholder="型号 / 料号" title="型号 / 料号，留空用行号" className={CELL_INPUT} />
                    </td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input value={it.hsCode} disabled={isFrozen} onChange={e => updateItem(idx, 'hsCode', e.target.value)}
                        placeholder="8419609090" className={CELL_INPUT} />
                    </td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input value={it.name} disabled={isFrozen} onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder="如 Nitrogen Generator / Export Packaging / Sea freight" className={CELL_INPUT} />
                    </td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input type="number" min="0" step="any" value={it.qty || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} className={CELL_INPUT_RIGHT} />
                    </td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input value={it.unit} disabled={isFrozen} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        list="pi-unit-options" placeholder={DEFAULT_PI_UNIT} className={CELL_INPUT} />
                    </td>
                    <td className="px-[8px] py-[4px] align-middle">
                      <input type="number" min="0" step="any" value={it.price || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'price', e.target.value)} placeholder="0.00" className={CELL_INPUT_RIGHT} />
                    </td>
                    <td className="px-[8px] text-right text-[14px] font-medium text-gray-900 tabular-nums bg-gray-50 align-middle">{money(it.amount)}</td>
                    <td className="px-[4px] text-center align-middle">
                      <button type="button" onClick={() => removeItem(idx)} disabled={isFrozen || form.items.length === 1}
                        className="h-[32px] w-[32px] rounded-[6px] text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                        title="删除本行">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 唯一金额展示：总金额由明细自动派生，不再有第二个可填的「PI 总金额」框（刘总 11-09）。
              人民币折算紧挨总额展示，方便销售一眼判断自己这单大概值多少人民币（刘总 11-09）：
              走 currencyStore 系统汇率，仅内部参考，绝不进打印数据 / 客户可见 PI。 */}
          <div className="flex items-center gap-[16px] flex-wrap rounded-[8px] border border-gray-200 bg-gray-50 px-[16px] py-[12px] text-[13px]">
            <span className="text-gray-500">PI 总金额（按商品明细自动算出）：<span className="ml-[8px] text-[14px] font-semibold text-gray-900 tabular-nums">{form.currency} {money(itemsTotal)}</span></span>
            <span className="inline-flex items-center gap-[8px] rounded-[6px] border border-gray-300 bg-white px-[12px] py-[4px]"
              title="按系统汇率折算，仅供内部参考，不输出到给客户的 PI / PDF">
              <span className="text-gray-500">{form.currency === 'CNY' ? '人民币金额' : '折合人民币'}</span>
              {activeCurrency
                ? <span className="text-[16px] font-semibold text-brand-600 tabular-nums">¥{money(cnyReference)}</span>
                : <span className="text-amber-600">汇率未配置</span>}
              <span className="text-gray-400">· 内部参考</span>
            </span>
            <span className="text-gray-400 ml-auto">改单价或数量，金额自动更新；保存与导出 PDF 都用这个数。</span>
          </div>
        </div>

        {/* 金额与条款：总金额不再单独填（按明细自动派生），本区只留 3 个真正要选/要填的字段。
            Label 统一 FIELD_LABEL(40px)，三列输入框顶对齐（刘总 11-09「没对齐」）。 */}
        <div className="card lg:col-span-2 space-y-[16px]">
          <h3 className="font-medium text-sm">金额与贸易条款</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
            <div>
              <label className={FIELD_LABEL}>币种 <span className="text-red-500">*</span></label>
              {/* 币种与汇率同源：直接取系统设置「币种与汇率」，不再写死 USD/EUR/CNY/GBP */}
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className={FIELD_INPUT}>
                {!currencyList.some(c => c.id === form.currency) && <option value={form.currency}>{form.currency}</option>}
                {currencyList.map(c => <option key={c.id} value={c.id}>{c.id}（{c.name}）</option>)}
              </select>
            </div>
            <div>
              <label className={FIELD_LABEL}>系统汇率（内部）</label>
              <input value={activeCurrency ? `1 ${form.currency} = ${activeCurrency.rate} CNY` : '未配置该币种汇率'}
                disabled className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>交货期 <span className="text-gray-400">· 选填</span></label>
              {/* 刘总 2026-11-08：交货期是「多少天」的相对描述，不是固定日历日期，不能用 date 框把自己写死。
                  真实 PI 单据该行就是一句话，datalist 只给常用写法建议，不限制输入。 */}
              <input list="pi-delivery-date" value={form.deliveryDate}
                onChange={e => update('deliveryDate', e.target.value)}
                placeholder="如 收到预付款后 20 天 / 20 DAYS AFTER RECEIVING THE PREPAYMENT"
                title="对应打印件 DELIVERY DATE，可自由描述天数"
                className={FIELD_INPUT} />
              <datalist id="pi-delivery-date">
                {deliveryDateOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          {/* 收款账户与回款路径：出口单据一律英文外币口径（CNY 走人民币外币账户） */}
          <div className={`rounded-lg border px-3 py-2.5 ${bankMissing.length ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[13px] font-medium text-gray-700">
                收款账户及回款路径
                {activeBankAccount && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[13px] bg-blue-100 text-blue-700">
                    {isCnyForeignBank ? '人民币外币账户 · 出口收汇' : '外币账户 · 出口收汇'}
                  </span>
                )}
                <span className="ml-2 font-normal text-gray-400">按币种 {form.currency} 自动协同带出 · 打印在客户单据 · 含公司地址与电话 · 可一键复制发给客户</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] ${bankMissing.length ? 'text-amber-700' : 'text-green-700'}`}>
                  {bankMissing.length ? `待补充：${bankMissing.join('、')}` : '资料完整'}
                </span>
                <button
                  onClick={handleCopyBank}
                  disabled={bankMissing.length > 0}
                  title={bankMissing.length ? '资料未维护完整，暂不能复制给客户' : '一键复制该币种收款信息，可直接粘贴发给客户'}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[13px] ${
                    bankMissing.length ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : copiedBank ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {copiedBank ? <Check size={12} /> : <Copy size={12} />}
                  {copiedBank ? '已复制' : '复制收款信息'}
                </button>
              </div>
            </div>
            {copyHint && (
              <div className={`mt-1.5 text-[13px] ${copyHint.ok ? 'text-green-700' : 'text-amber-700'}`}>{copyHint.text}</div>
            )}
            {activeBankAccount && !bankMissing.length ? (
              <div className="mt-1.5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-gray-600">
                <div>Beneficiary Bank: {activeBankAccount.beneficiaryBank}</div>
                <div>Account No.: {activeBankAccount.accountNo}</div>
                <div>Beneficiary: {activeBankAccount.beneficiary}</div>
                <div>Swift Code: {activeBankAccount.swiftCode || '—'}</div>
                <div className="lg:col-span-2">Bank Address: {activeBankAccount.bankAddress || '—'}</div>
                {/* 回款路径留空时整行删除，不显示「—」（刘总 11-09） */}
                {!!activeBankAccount.paymentRoute?.trim() && (
                  <div className="lg:col-span-2">PAYMENT ROUTE: {activeBankAccount.paymentRoute}</div>
                )}
              </div>
            ) : (
              <div className="mt-1.5 text-[13px] text-amber-700">
                该币种收款账户尚未维护完整，打印件会显示醒目提示、不会借用其他币种账号。请到「ERP·财务 → 资金账户」补齐后再发客户。
              </div>
            )}
          </div>

          {/* 刘总 2026-11-08：人民币参考不出现在给客户的 PI 上。金额已提到上方合计条醒目展示，
              这里只留汇率来源与更新时间说明；汇率取自系统设置，不再写死固定数值。 */}
          <div className="text-[13px] text-gray-500 bg-gray-50 border border-gray-100 rounded-[8px] px-[12px] py-[8px] leading-5">
            内部参考（<span className="font-medium">不输出到给客户的 PI / PDF</span>）：
            {activeCurrency
              ? `上方人民币折算采用 1 ${form.currency} = ${activeCurrency.rate} CNY${activeCurrency.lastUpdated ? `（更新于 ${activeCurrency.lastUpdated}）` : '（汇率未记录更新时间）'}，可在「系统设置 → 币种与汇率」维护；折算金额不会出现在客户单据上。`
              : '该币种未在「系统设置 → 币种与汇率」启用，暂无法折算人民币；请先在系统设置维护汇率。'}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            <div>
              <label className={FIELD_LABEL}>付款条款 <span className="text-gray-400">（可自由填写）</span></label>
              {/* 刘总 2026-11-08：付款条件保留可编辑权力；datalist 仅提供常用值快捷建议，不限制输入 */}
              <input list="pi-payment-terms" value={form.paymentTerms}
                onChange={e => update('paymentTerms', e.target.value)}
                placeholder="可自由输入，如 TT 20% PREPAYMENT, 80% BALANCE BEFORE SHIPMENT"
                className={FIELD_INPUT} />
              <datalist id="pi-payment-terms">
                {paymentTermOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className={FIELD_LABEL}>交易条件（Incoterms） <span className="text-gray-400">· 可自由填写</span></label>
              {/* 真实 PI 单据为 TRANSACTION METHOD（如 CIF MIAMI），允许自由填写完整交易条件 */}
              <input list="pi-delivery-terms" value={form.deliveryTerms}
                onChange={e => update('deliveryTerms', e.target.value)}
                placeholder="可自由输入，如 CIF MIAMI"
                className={FIELD_INPUT} />
              <datalist id="pi-delivery-terms">
                {deliveryTermOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className={FIELD_LABEL}>备注 <span className="text-gray-400">（交货期也可以直接用文字写在这里，会印到 PI 的 REMARKS 行）</span></label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
              placeholder="如 ONE COMPLETE SET OF NPA15 SPARE PARTS FREE OF CHARGE，交货期：收到预付款后 20 天，海运到迈阿密约 40 天"
              className={TEXTAREA_INPUT} rows={2} />
          </div>
        </div>

        {/* 回签信息 */}
        <div className="card lg:col-span-1 space-y-[16px]">
          <h3 className="font-medium text-sm">回签信息</h3>
          <div>
            <label className={FIELD_LABEL}>客户回签日期</label>
            <input type="date" value={form.signedAt} onChange={e => update('signedAt', e.target.value)} className={FIELD_INPUT} />
          </div>
          {form.signedAt && (
            <div className="text-[13px] text-green-600 bg-green-50 p-2 rounded">
              ✅ 客户已于 {form.signedAt} 回签此 PI
              <div className="mt-1">
                <button onClick={() => alert('转为订单：' + form.piCode)} className="btn btn-primary text-[13px]">
                  转为正式订单
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
