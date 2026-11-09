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
  initBankAccounts, getBankAccounts, getBankAccountForCurrency, missingBankFields,
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

// 商品明细空行：真实 PI 单据的一行可以是设备 / 外购 / 配件 / 运杂 / 安装 / 服务，
// 不为每种建结构（LOCKED 总纲第7条 Commercial Item 第一性）。
const emptyItem = (): PiItem => ({ productCode: '', hsCode: '', name: '', qty: 1, unit: '', price: 0, amount: 0 })
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
  const [amountManual, setAmountManual] = useState(false)
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
            const loadedTotal = loadedItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
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
            // 历史单据若「总金额 ≠ 明细合计」，说明当时是手工调整过的，进页面后不要自动覆盖。
            setAmountManual(loadedTotal > 0 && Math.abs((pi.amount || 0) - loadedTotal) > 0.009)
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
  // 收款账户按币种默认协同：走账户真源（支持同币种多套账户 / 指定默认），不写死美元账号
  const activeBankAccount = useMemo(
    () => getBankAccountForCurrency(form.currency),
    [form.currency, bankAccounts],
  )
  const isDomesticBank = activeBankAccount?.accountType === 'DOMESTIC'
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
    setCopyHint({ ok: true, text: `已复制 ${form.currency} 收款信息（${isDomesticBank ? '中文' : '英文'}），可直接粘贴发给客户。` })
    window.setTimeout(() => { setCopiedBank(false); setCopyHint(null) }, 3000)
  }
  const cnyReference = convertToCNY(Number(form.totalAmount) || 0, form.currency)
  const itemsTotal = form.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
  // 确认前可改、确认后冻结最终交易事实（LOCKED 总纲第6条）
  const isFrozen = form.status === 'CONFIRMED'

  // 明细合计是 PI 总金额的默认来源：填完明细自动带出，不用销售再抄一遍（减工作/降错）。
  // 一旦销售手工改过总金额，就停止自动覆盖，保留「抹零 / 含未列费用」等业务口子的可编辑权。
  useEffect(() => {
    if (amountManual || isFrozen || itemsTotal <= 0) return
    const auto = Number(itemsTotal.toFixed(2))
    if (Math.abs(auto - (Number(form.totalAmount) || 0)) > 0.009) {
      setForm(prev => ({ ...prev, totalAmount: auto }))
    }
    // 只依赖明细合计 / 手工标志 / 冻结状态：写回 totalAmount 不会再次触发，避免循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsTotal, amountManual, isFrozen])

  const applyItemsTotal = () => {
    setAmountManual(false)
    update('totalAmount', Number(itemsTotal.toFixed(2)))
  }

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
        qty, unit: '', price,
        amount: Number((qty * price).toFixed(2)),
      }
    })
    setAmountManual(false)
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
      // 币种名称按单据实际币种输出（原来模板写死 "US Dollar"，选 EUR/CNY 会错）
      currencyName: activeCurrency?.nameEn || form.currency,
      // 无明细时输出空表（渲染器给一行空单元格）；内部操作提示不进客户可见的打印数据
      items: printableItems,
      totalAmount: form.totalAmount ? `${form.currency} ${money(form.totalAmount)}` : '',
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
    if (!form.totalAmount || form.totalAmount <= 0) { alert('请填写商品明细（金额会自动带出），或直接填写 PI 总金额'); return }
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
      <div className="flex items-center gap-3">
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
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm">基本信息</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">PI 编号（保存后自动生成）</label>
              <input value={form.piCode} disabled className="input text-sm bg-gray-50 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">PI 日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.piDate} onChange={e => update('piDate', e.target.value)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">有效期（天）</label>
              <input type="number" value={form.validityDays} onChange={e => update('validityDays', parseInt(e.target.value) || 30)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="input text-sm w-full">
                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 客户信息 */}
        <div className="card space-y-3">
          <h3 className="font-medium text-sm">客户信息</h3>
          <div>
            <label className="text-xs text-gray-500">客户（外销）<span className="text-red-500">*</span></label>
            <select value={form.customerId} onChange={e => { update('customerId', e.target.value); update('quotationId', '') }} className="input text-sm w-full">
              <option value="">请选择客户</option>
              {customers.filter(c => (c.salesType || '').toUpperCase() === 'EXTERNAL').map(c => (
                <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
              ))}
            </select>
          </div>
          {selectedCustomer && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>客户：{selectedCustomer.companyName || selectedCustomer.name}</div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500">关联报价单（须 ACCEPTED）<span className="text-gray-400">· 选填</span></label>
            <select value={form.quotationId} onChange={e => update('quotationId', e.target.value)} className="input text-sm w-full">
              <option value="">不关联（直接建 PI）</option>
              {quotes.map(q => (
                <option key={q.id} value={q.id}>{q.code}（{q.amount?.toLocaleString?.() ?? q.amount}）</option>
              ))}
            </select>
            {form.customerId && quotes.length === 0 && (
              <div className="text-xs text-amber-600 mt-1">该外销客户暂无「已接受」报价单，可留空直接建 PI，后续再补关联</div>
            )}
            <div className="text-xs text-gray-400 mt-1">关联后可点下方「从报价单带入」初始化明细，带入后仍可自由改</div>
          </div>
        </div>

        {/* 商品明细：销售直接录入单价/数量/明细（刘总 2026-11-08「产品销售单价、明细没有地方能填写」） */}
        <div className="card lg:col-span-3 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-medium text-sm">商品明细（Commercial Items）</h3>
            <span className="text-xs text-gray-400">设备 / 外购 / 配件 / 运杂 / 安装 / 服务都可直接加行，金额＝数量 × 单价自动算</span>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={loadFromQuote} disabled={!quoteItems.length || isFrozen}
                className="btn btn-outline text-xs" title="从关联报价单初始化明细；带入后仍可自由修改，不强制同步">
                从报价单带入
              </button>
              <button type="button" onClick={addItem} disabled={isFrozen} className="btn btn-outline text-xs">
                <Plus size={13} className="mr-1" />新增一行
              </button>
            </div>
          </div>
          {isFrozen && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              该 PI 已确认，最终交易事实已冻结，明细与金额不可再改（如需修改请先把状态改回草稿）。
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2 w-10">No.</th>
                  <th className="w-28">产品编号</th>
                  <th className="w-32">HS Code</th>
                  <th>DESCRIPTION OF PRODUCTS <span className="text-red-500">*</span></th>
                  <th className="w-24 text-right">Qty</th>
                  <th className="w-20">单位</th>
                  <th className="w-32 text-right">Unit Price</th>
                  <th className="w-32 text-right">Total</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-1 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="py-1 pr-2">
                      <input value={it.productCode || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'productCode', e.target.value)}
                        placeholder="型号 / 料号，留空用行号" className="input text-xs w-full" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={it.hsCode} disabled={isFrozen} onChange={e => updateItem(idx, 'hsCode', e.target.value)}
                        placeholder="8419609090" className="input text-xs w-full" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={it.name} disabled={isFrozen} onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder="如 Nitrogen Generator / Export Packaging / Sea freight" className="input text-xs w-full" />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" step="any" value={it.qty || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} className="input text-xs w-full text-right" />
                    </td>
                    <td className="py-1 pr-2">
                      <input value={it.unit} disabled={isFrozen} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        placeholder="set" className="input text-xs w-full" />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" step="any" value={it.price || ''} disabled={isFrozen}
                        onChange={e => updateItem(idx, 'price', e.target.value)} placeholder="0.00" className="input text-xs w-full text-right" />
                    </td>
                    <td className="py-1 pr-2 text-right font-medium">{money(it.amount)}</td>
                    <td className="py-1">
                      <button type="button" onClick={() => removeItem(idx)} disabled={isFrozen || form.items.length === 1}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30" title="删除本行">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-gray-500">明细合计（上面各行自动加总）：<span className="font-semibold text-gray-800">{form.currency} {money(itemsTotal)}</span></span>
            <button type="button" onClick={applyItemsTotal} disabled={isFrozen || itemsTotal <= 0} className="btn btn-outline text-xs">
              按明细合计重算
            </button>
            {itemsTotal > 0 && Math.abs(itemsTotal - (Number(form.totalAmount) || 0)) > 0.009 && (
              <span className="text-amber-600">
                已手工调整：打印件 TOTAL 按下方的「PI 总金额」{form.currency} {money(form.totalAmount)} 出
              </span>
            )}
            <span className="text-gray-400 ml-auto">明细随 PI 一起保存，重开编辑页仍在；导出 PDF 时直接印到单据上。</span>
          </div>
        </div>

        {/* 金额与条款 */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm">金额与贸易条款</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">币种 <span className="text-red-500">*</span></label>
              {/* 币种与汇率同源：直接取系统设置「币种与汇率」，不再写死 USD/EUR/CNY/GBP */}
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className="input text-sm w-full">
                {!currencyList.some(c => c.id === form.currency) && <option value={form.currency}>{form.currency}</option>}
                {currencyList.map(c => <option key={c.id} value={c.id}>{c.id}（{c.name}）</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">PI 总金额（打印件 TOTAL） <span className="text-red-500">*</span></label>
              <input type="number" value={form.totalAmount || ''} disabled={isFrozen}
                onChange={e => { update('totalAmount', parseFloat(e.target.value) || 0); setAmountManual(true) }}
                className="input text-sm w-full" />
              <div className="text-[11px] mt-1">
                {amountManual ? (
                  <button type="button" onClick={applyItemsTotal} disabled={isFrozen || itemsTotal <= 0}
                    className="text-amber-600 hover:underline disabled:opacity-40">
                    已手工调整 · 点此恢复按明细合计
                  </button>
                ) : (
                  <span className="text-gray-400">自动跟随明细合计，可直接手改</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">系统汇率（内部）</label>
              <input value={activeCurrency ? `1 ${form.currency} = ${activeCurrency.rate} CNY` : '未配置该币种汇率'}
                disabled className="input text-sm bg-gray-50 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">交货期 DELIVERY DATE <span className="text-gray-400">· 选填，可自由描述</span></label>
              {/* 刘总 2026-11-08：交货期是「多少天」的相对描述，不是固定日历日期，不能用 date 框把自己写死。
                  真实 PI 单据该行就是一句话，datalist 只给常用写法建议，不限制输入。 */}
              <input list="pi-delivery-date" value={form.deliveryDate}
                onChange={e => update('deliveryDate', e.target.value)}
                placeholder="如 收到预付款后 20 天 / 20 DAYS AFTER RECEIVING THE PREPAYMENT"
                className="input text-sm w-full" />
              <datalist id="pi-delivery-date">
                {deliveryDateOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          {/* 收款账户与回款路径：随币种默认协同带出，打印到客户单据（外币英文 / 人民币中文） */}
          <div className={`rounded-lg border px-3 py-2.5 ${bankMissing.length ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-medium text-gray-700">
                收款账户及回款路径
                {activeBankAccount && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${isDomesticBank ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                    {isDomesticBank ? '人民币账户 · 内销回款' : '外币账户 · 出口收汇'}
                  </span>
                )}
                <span className="ml-2 font-normal text-gray-400">按币种 {form.currency} 自动协同带出 · 打印在客户单据 · 含公司地址与电话 · 可一键复制发给客户</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] ${bankMissing.length ? 'text-amber-700' : 'text-green-700'}`}>
                  {bankMissing.length ? `待补充：${bankMissing.join('、')}` : '资料完整'}
                </span>
                <button
                  onClick={handleCopyBank}
                  disabled={bankMissing.length > 0}
                  title={bankMissing.length ? '资料未维护完整，暂不能复制给客户' : '一键复制该币种收款信息，可直接粘贴发给客户'}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
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
              <div className={`mt-1.5 text-[11px] ${copyHint.ok ? 'text-green-700' : 'text-amber-700'}`}>{copyHint.text}</div>
            )}
            {activeBankAccount && !bankMissing.length ? (
              isDomesticBank ? (
                <div className="mt-1.5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-600">
                  <div>开户行：{activeBankAccount.beneficiaryBankCn || activeBankAccount.beneficiaryBank}</div>
                  <div>银行账号：{activeBankAccount.accountNo}</div>
                  <div>收款单位：{activeBankAccount.beneficiaryCn || activeBankAccount.beneficiary}</div>
                  <div>银行行号：{activeBankAccount.bankCode || '—'}　统一社会信用代码：{activeBankAccount.taxNo || '—'}</div>
                  <div className="lg:col-span-2">
                    回款路径：{activeBankAccount.paymentRoute || '（未填写，可在「ERP·财务 → 资金账户」补充汇款附言 / 到账要求）'}
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-600">
                  <div>Beneficiary Bank: {activeBankAccount.beneficiaryBank}</div>
                  <div>Account No.: {activeBankAccount.accountNo}</div>
                  <div>Beneficiary: {activeBankAccount.beneficiary}</div>
                  <div>Swift Code: {activeBankAccount.swiftCode || '—'}</div>
                  <div className="lg:col-span-2">Bank Address: {activeBankAccount.bankAddress || '—'}</div>
                  <div className="lg:col-span-2">
                    PAYMENT ROUTE: {activeBankAccount.paymentRoute || '—'}
                  </div>
                </div>
              )
            ) : (
              <div className="mt-1.5 text-[11px] text-amber-700">
                该币种收款账户尚未维护完整，打印件会显示醒目提示、不会借用其他币种账号。请到「ERP·财务 → 资金账户」补齐后再发客户。
              </div>
            )}
          </div>

          {/* 刘总 2026-11-08：人民币参考不出现在给客户的 PI 上。内部仅留一行小字说明折算与汇率来源，
              汇率取自系统设置（后端 currencies 表 + 自动/手动更新），不再写死 7.27 / 7.85。 */}
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2 leading-5">
            内部参考（<span className="font-medium">不输出到给客户的 PI / PDF</span>）：按系统汇率约折合
            ¥{cnyReference.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}；
            {activeCurrency
              ? `采用 1 ${form.currency} = ${activeCurrency.rate} CNY${activeCurrency.lastUpdated ? `（更新于 ${activeCurrency.lastUpdated}）` : '（汇率未记录更新时间）'}，可在「系统设置 → 币种与汇率」维护。`
              : '该币种未在「系统设置 → 币种与汇率」中启用，折算按原金额显示。'}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">付款条款 <span className="text-gray-400">（可自由填写）</span></label>
              {/* 刘总 2026-11-08：付款条件保留可编辑权力；datalist 仅提供常用值快捷建议，不限制输入 */}
              <input list="pi-payment-terms" value={form.paymentTerms}
                onChange={e => update('paymentTerms', e.target.value)}
                placeholder="可自由输入，如 TT 20% PREPAYMENT, 80% BALANCE BEFORE SHIPMENT"
                className="input text-sm w-full" />
              <datalist id="pi-payment-terms">
                {paymentTermOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-500">交易条件（Incoterms / 贸易方式）<span className="text-gray-400">（可自由填写）</span></label>
              {/* 真实 PI 单据为 TRANSACTION METHOD（如 CIF MIAMI），允许自由填写完整交易条件 */}
              <input list="pi-delivery-terms" value={form.deliveryTerms}
                onChange={e => update('deliveryTerms', e.target.value)}
                placeholder="可自由输入，如 CIF MIAMI"
                className="input text-sm w-full" />
              <datalist id="pi-delivery-terms">
                {deliveryTermOptions.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">备注 <span className="text-gray-400">（交货期也可以直接用文字写在这里，会印到 PI 的 REMARKS 行）</span></label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
              placeholder="如 ONE COMPLETE SET OF NPA15 SPARE PARTS FREE OF CHARGE，交货期：收到预付款后 20 天，海运到迈阿密约 40 天"
              className="input text-sm w-full" rows={2} />
          </div>
        </div>

        {/* 回签信息 */}
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-medium text-sm">回签信息</h3>
          <div>
            <label className="text-xs text-gray-500">客户回签日期</label>
            <input type="date" value={form.signedAt} onChange={e => update('signedAt', e.target.value)} className="input text-sm w-full" />
          </div>
          {form.signedAt && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ 客户已于 {form.signedAt} 回签此 PI
              <div className="mt-1">
                <button onClick={() => alert('转为订单：' + form.piCode)} className="btn btn-primary text-xs">
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
