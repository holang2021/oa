import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, Download } from 'lucide-react'
import { usePrintPreview } from '../../components/PrintPreview'
import { getCustomers } from '../../services/customerService'
import { getPis, getPiById } from '../../services/piService'
import { proformaInvoices } from '../../data/mockData'
import {
  initCurrencies, getActiveCurrencies, getCurrencyById, convertToCNY, type Currency,
} from '../../services/currencyStore'
import { initBankAccounts, buildBankPrintData } from '../../services/bankAccountStore'
import { FIELD_INPUT, CELL_INPUT, CELL_INPUT_RIGHT, TEXTAREA_INPUT, FIELD_LABEL, money } from '../../services/formTokens'
import {
  type ExportDoc, type ExportDocKind, type ExportDocItem, type PiSource,
  emptyDoc, emptyItem, getExportDocById, saveExportDoc, nextDocCode,
  initDocFromPi, sumAmount, sumNW, sumGW, defaultAmountInWords,
  buildCiPrintData, buildPlPrintData, EXPORT_DOC_STATUS,
} from '../../services/exportDocStore'

/**
 * CI（商业发票）/ PL（装箱单）录入页 —— 与 PI 同一套录入体验、同一套数据键。
 *
 * 业务依据：
 * - 刘总「同一个客户的 PI/CI/PL 数据应该都能互通」：共用抬头 / 单据头 / 明细键，从 PI 一键带出。
 * - LOCKED 第 5/11 条：带出只是初始化，之后各单据独立可改，不回写 PI、不强制同步。
 * - LOCKED 第 6 条：确认（ISSUED）后冻结最终交易事实。
 * - LOCKED 第 7 条 Commercial Item 第一性：一张明细表容纳所有行项类型，不为每种建结构。
 * - UI Foundation（Candidate）：沿用 PI 定稿版式 items-start + 买方抬头独立整行，不改全局 CSS。
 */

const STATUS_OPTIONS = ['DRAFT', 'ISSUED', 'CANCELLED']
const PAYMENT_OPTIONS = ['TT 30% in advance, 70% before shipment', 'LC at sight', '100% TT before shipment']
const INCOTERM_OPTIONS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP']

export default function ExportDocForm() {
  const { kind: kindParam, id } = useParams()
  const kind: ExportDocKind = String(kindParam || '').toUpperCase() === 'PL' ? 'PL' : 'CI'
  const isCI = kind === 'CI'
  const nav = useNavigate()
  const { openPreview, PrintPreviewComponent } = usePrintPreview()

  const [form, setForm] = useState<ExportDoc>(() => {
    if (id) return getExportDocById(id) || emptyDoc(kind)
    return emptyDoc(kind)
  })
  const [customers, setCustomers] = useState<any[]>([])
  const [currencyList, setCurrencyList] = useState<Currency[]>(getActiveCurrencies())
  const [piSources, setPiSources] = useState<PiSource[]>([])
  const [piIsDemo, setPiIsDemo] = useState(false)
  const [selectedPiId, setSelectedPiId] = useState('')
  const [saving, setSaving] = useState(false)

  const isFrozen = form.status === 'ISSUED'
  const activeCurrency = useMemo(() => getCurrencyById(form.currency), [form.currency, currencyList])
  const cnyReference = useMemo(() => convertToCNY(form.totalAmount, form.currency), [form.totalAmount, form.currency])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await initCurrencies()
      initBankAccounts()
      if (alive) setCurrencyList(getActiveCurrencies())
    })()
    getCustomers().then(res => { if (alive) setCustomers(res?.list || []) }).catch(() => {})
    // 从 PI 带出的数据源：优先真实 PI（后端 /pi），后端离线时退回示例 PI 并明确标注，
    // 且示例 PI 只带出基本信息、不编造明细（LOCKED 第 2 条证据优先级）。
    ;(async () => {
      try {
        const r = await getPis({ salesType: 'EXTERNAL' })
        if (alive && r.list && r.list.length) {
          setPiSources(r.list.map(p => ({
            id: p.id, piNo: p.piNo, customerId: p.customerId || '',
            amount: p.amount, issueDate: p.issueDate,
          })))
          return
        }
      } catch { /* 后端离线 */ }
      if (alive) {
        setPiIsDemo(true)
        setPiSources(proformaInvoices.map(p => ({
          id: p.id, piNo: p.piCode, customerId: p.customerId, customerName: p.customerName,
          amount: p.totalAmount, currency: p.currency, piDate: p.piDate,
          notes: '', items: [],
        })))
      }
    })()
    return () => { alive = false }
  }, [])

  // CI 总金额由明细自动派生，不设第二个可填总额（PI 已定稿口径，避免两处金额打架）
  useEffect(() => {
    if (isFrozen) return
    const auto = sumAmount(form.items)
    if (auto > 0 && Math.abs(auto - (Number(form.totalAmount) || 0)) > 0.009) {
      setForm(prev => ({ ...prev, totalAmount: auto }))
    }
  }, [form.items, isFrozen])

  const update = <K extends keyof ExportDoc>(key: K, value: ExportDoc[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const updateItem = (idx: number, field: keyof ExportDocItem, raw: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => {
        if (i !== idx) return it
        const numeric = ['qty', 'price', 'nw', 'gw'].includes(field)
        const next = { ...it, [field]: numeric ? (parseFloat(raw) || 0) : raw } as ExportDocItem
        next.amount = Number(((Number(next.qty) || 0) * (Number(next.price) || 0)).toFixed(2))
        return next
      }),
    }))
  }
  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }))
  const removeItem = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))

  /** 从 PI 一次性带出：覆盖前确认；带出后 sourcePiId 仅留痕，不建立引用关系 */
  const handleImportPi = async () => {
    const picked = piSources.find(p => p.id === selectedPiId)
    if (!picked) { alert('请先选择一张 PI'); return }
    if (!window.confirm('从 PI 带出会覆盖当前已填内容；带出后本单据独立保存，改动不会回写 PI。继续？')) return
    let source: PiSource = picked
    if (!piIsDemo) {
      try {
        const detail: any = await getPiById(picked.id)
        if (detail) {
          let items: any[] = Array.isArray(detail.items) ? detail.items : []
          if (!items.length && typeof detail.items_json === 'string') {
            try { items = JSON.parse(detail.items_json) } catch { items = [] }
          }
          source = { ...picked, ...detail, notes: detail.notes || '', items }
        }
      } catch { /* 详情取不到时仍可用列表基本信息初始化 */ }
    }
    const seeded = initDocFromPi(kind, source)
    setForm(prev => ({ ...seeded, id: prev.id, kind, createdAt: prev.createdAt }))
  }

  const handleExportPdf = () => {
    if (isCI) {
      const symbol = activeCurrency?.symbol || ''
      openPreview('tpl-ci-print', buildCiPrintData(form, symbol, buildBankPrintData(form.currency)))
    } else {
      openPreview('tpl-pl-print', buildPlPrintData(form))
    }
  }

  const handleSave = () => {
    if (!form.customerId) { alert('请选择客户'); return }
    const hasItem = form.items.some(it => (it.name || '').trim() !== '')
    if (!hasItem) { alert('请至少填写一行商品明细'); return }
    if (isCI) {
      if (!(form.totalAmount > 0)) { alert('请填写商品明细的数量与单价，总金额会自动算出'); return }
      const missing = [
        !(form.paymentTerm || '').trim() && '付款条款（PAYMENT TERM）',
        !(form.transactionMethod || '').trim() && '交易条件（TRANSACTION METHOD）',
        !(form.deliveryDate || '').trim() && '交货期（DELIVERY DATE）',
      ].filter(Boolean) as string[]
      if (missing.length) { alert(`请填写：${missing.join('、')}`); return }
    }
    const next: ExportDoc = {
      ...form,
      kind,
      code: form.code || nextDocCode(kind),
      amountInWords: isCI ? (form.amountInWords || defaultAmountInWords(form.totalAmount, form.currency)) : '',
      totalNW: sumNW(form.items),
      totalGW: sumGW(form.items),
    }
    saveExportDoc(next)
    setForm(next)
    alert(`${kind} 已保存：${next.code}（草稿存于本机浏览器）`)
    nav('/export/export-docs')
  }

  const symbol = activeCurrency?.symbol || ''
  const title = isCI ? '商业发票 CI' : '装箱单 PL'

  return (
    <div className="space-y-4">
      {PrintPreviewComponent}
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/export/export-docs')} className="btn btn-outline text-sm"><ArrowLeft size={14} />返回</button>
        <h2 className="text-lg font-semibold">{id ? `编辑 ${title} ${form.code}` : `新建 ${title}`}</h2>
        <div className="ml-auto" />
        <button onClick={handleSave} disabled={saving || isFrozen} className="btn btn-primary text-sm">
          <Save size={14} className="mr-1" />保存
        </button>
        <button onClick={handleExportPdf} className="btn btn-outline text-sm" title="先预览，再在预览页点「打印」另存为 PDF">
          <FileText size={14} className="mr-1" />导出 PDF（预览）
        </button>
      </div>

      {isFrozen && (
        <div className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          该单据已签发，最终交易事实已冻结；如需修改请先把状态改回草稿。
        </div>
      )}

      {/* 顶部两栏不等高：items-start 关掉 Grid 默认 stretch，避免左卡被撑出空白（PI 定稿口径） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="card lg:col-span-2 space-y-[16px]">
          <h3 className="font-medium text-sm">基本信息</h3>
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <label className={FIELD_LABEL}>{kind} 编号（保存后自动生成）</label>
              <input value={form.code} disabled className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>{kind} 日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.docDate} disabled={isFrozen}
                onChange={e => update('docDate', e.target.value)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>{isCI ? '币种' : '原产国'}</label>
              {isCI ? (
                <select value={form.currency} disabled={isFrozen}
                  onChange={e => update('currency', e.target.value)} className={FIELD_INPUT}>
                  {currencyList.map(c => <option key={c.id} value={c.id}>{c.id} · {c.nameEn || c.name}</option>)}
                </select>
              ) : (
                <input value={form.countryOfOrigin} disabled={isFrozen}
                  onChange={e => update('countryOfOrigin', e.target.value)} className={FIELD_INPUT} />
              )}
            </div>
            <div>
              <label className={FIELD_LABEL}>状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value as any)} className={FIELD_INPUT}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{EXPORT_DOC_STATUS[s as keyof typeof EXPORT_DOC_STATUS]}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card space-y-[16px]">
          <h3 className="font-medium text-sm">客户信息</h3>
          <div>
            <label className={FIELD_LABEL}>客户（外销）<span className="text-red-500">*</span></label>
            <select value={form.customerId} disabled={isFrozen} onChange={e => {
              const c: any = customers.find(x => x.id === e.target.value) || {}
              setForm(prev => ({
                ...prev, customerId: e.target.value,
                customerName: c.companyName || c.name || '',
                buyerName: c.companyName || c.name || '',
                buyerAddress: [c.address, c.addressDetail].filter(Boolean).join(' ').trim() || prev.buyerAddress,
                buyerAttn: c.contactName || c.contacts?.[0]?.name || prev.buyerAttn,
                buyerTel: c.contactPhone || c.contacts?.[0]?.phone || c.companyPhone || prev.buyerTel,
                buyerEmail: c.contactEmail || c.contacts?.[0]?.email || prev.buyerEmail,
              }))
            }} className={FIELD_INPUT}>
              <option value="">请选择客户</option>
              {customers.filter(c => (c.salesType || '').toUpperCase() === 'EXTERNAL').map(c => (
                <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
              ))}
            </select>
          </div>
          {/* 从 PI 带出：PI 只作初始化来源，带出后本单据独立（LOCKED 第 5/11 条） */}
          <div>
            <label className={FIELD_LABEL}>从 PI 带出（数据互通）</label>
            <div className="flex gap-[8px]">
              <select value={selectedPiId} onChange={e => setSelectedPiId(e.target.value)} className={FIELD_INPUT}>
                <option value="">选择 PI</option>
                {piSources.map(p => <option key={p.id} value={p.id}>{p.piNo || p.id}</option>)}
              </select>
              <button type="button" onClick={handleImportPi} disabled={isFrozen}
                className="btn btn-outline text-[13px] whitespace-nowrap" title="一次性带出买方抬头、单据头、商品明细与条款；带出后可自由改，不回写 PI">
                <Download size={13} className="mr-1" />带出
              </button>
            </div>
            <div className="text-[13px] text-gray-400 mt-1">
              {piIsDemo
                ? '当前为示例 PI（后端未连接）：只带出基本信息，明细请在下方录入，不会编造数据。'
                : '带出只是一次性拷贝，之后 CI/PL 独立保存，改动不回写 PI。'}
            </div>
            {form.sourcePiNo && <div className="text-[13px] text-gray-500 mt-1">来源 PI：{form.sourcePiNo}（仅留痕，不强制同步）</div>}
          </div>
        </div>

        {/* 买方抬头：与 PI 定稿一致，独立整行铺开；EIN 是真实 CI/PL 单据特有字段 */}
        <div className="card lg:col-span-3 space-y-[16px]">
          <div className="flex items-center gap-[16px] flex-wrap">
            <h3 className="font-medium text-sm">买方抬头（打印在客户单据左上方）</h3>
            <span className="text-[13px] text-gray-400">选客户自动带出；带出后可直接改，改动只属于这张单据</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[16px]">
            <div>
              <label className={FIELD_LABEL}>Address 地址</label>
              <input value={form.buyerAddress} disabled={isFrozen} onChange={e => update('buyerAddress', e.target.value)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>ATTN 联系人</label>
              <input value={form.buyerAttn} disabled={isFrozen} onChange={e => update('buyerAttn', e.target.value)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>EIN 税号</label>
              <input value={form.buyerEin} disabled={isFrozen} onChange={e => update('buyerEin', e.target.value)}
                placeholder="如 59-1234567" className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>Tel. 电话</label>
              <input value={form.buyerTel} disabled={isFrozen} onChange={e => update('buyerTel', e.target.value)} className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL}>E-mail 邮箱</label>
              <input value={form.buyerEmail} disabled={isFrozen} onChange={e => update('buyerEmail', e.target.value)} className={FIELD_INPUT} />
            </div>
          </div>
        </div>

        {/* 商品明细：CI 走价格列，PL 走包装与重量列，同一行结构（Commercial Item 第一性） */}
        <div className="card lg:col-span-3 space-y-[16px]">
          <div className="flex items-center gap-[16px] flex-wrap">
            <h3 className="font-medium text-sm">{isCI ? '商品明细（Commercial Items）' : '装箱明细（Packing Details）'}</h3>
            <span className="text-[13px] text-gray-400">
              {isCI ? '金额＝数量 × 单价自动算；设备 / 配件 / 运杂 / 服务都可直接加行' : '毛净重、包装由装箱实际情况填写，PI 不带出这些数据'}
            </span>
            <div className="ml-auto">
              <button type="button" onClick={addItem} disabled={isFrozen} className="btn btn-outline text-[13px]">
                <Plus size={13} className="mr-1" />新增一行
              </button>
            </div>
          </div>
          <div className="text-[13px] text-gray-400">列较多，窄屏可左右滚动查看全部列</div>
          <div className="overflow-x-auto rounded-[8px] border border-gray-200">
            <datalist id="doc-unit-options"><option value="pcs" /><option value="set" /><option value="kg" /><option value="crate" /></datalist>
            <table className="w-full text-[14px] table-fixed" style={{ minWidth: 1000 }}>
              <colgroup>
                <col style={{ width: 44 }} />
                <col style={{ width: 104 }} />
                <col />
                {isCI && <col style={{ width: 104 }} />}
                <col style={{ width: 76 }} />
                <col style={{ width: 76 }} />
                {isCI ? (
                  <><col style={{ width: 112 }} /><col style={{ width: 112 }} /></>
                ) : (
                  <><col style={{ width: 120 }} /><col style={{ width: 96 }} /><col style={{ width: 96 }} /></>
                )}
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr className="h-[40px] bg-gray-50 text-[13px] text-gray-600 border-b border-gray-200">
                  <th className="px-[8px] text-center">No.</th>
                  <th className="px-[8px] text-left">HS Code</th>
                  <th className="px-[8px] text-left">DESCRIPTION OF PRODUCTS <span className="text-red-500">*</span></th>
                  {isCI && <th className="px-[8px] text-left">Spec 规格</th>}
                  <th className="px-[8px] text-center">Qty</th>
                  <th className="px-[8px] text-center">单位</th>
                  {isCI ? (
                    <><th className="px-[8px] text-right">Unit Price ({symbol})</th><th className="px-[8px] text-right">Total ({symbol})</th></>
                  ) : (
                    <><th className="px-[8px] text-left">PACKAGE</th><th className="px-[8px] text-right">N.W (KGS)</th><th className="px-[8px] text-right">G.W (KGS)</th></>
                  )}
                  <th className="px-[8px] text-center">删</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx} className="h-[44px] border-b border-gray-100">
                    <td className="px-[8px] text-center text-gray-400">{idx + 1}</td>
                    <td className="px-[8px]"><input value={it.hsCode} disabled={isFrozen} onChange={e => updateItem(idx, 'hsCode', e.target.value)} className={CELL_INPUT} /></td>
                    <td className="px-[8px]"><input value={it.name} disabled={isFrozen} onChange={e => updateItem(idx, 'name', e.target.value)} className={CELL_INPUT} /></td>
                    {isCI && <td className="px-[8px]"><input value={it.spec} disabled={isFrozen} onChange={e => updateItem(idx, 'spec', e.target.value)} className={CELL_INPUT} /></td>}
                    <td className="px-[8px]"><input value={it.qty} disabled={isFrozen} onChange={e => updateItem(idx, 'qty', e.target.value)} className={CELL_INPUT_RIGHT} /></td>
                    <td className="px-[8px]"><input value={it.unit} list="doc-unit-options" disabled={isFrozen} onChange={e => updateItem(idx, 'unit', e.target.value)} className={CELL_INPUT} /></td>
                    {isCI ? (
                      <>
                        <td className="px-[8px]"><input value={it.price} disabled={isFrozen} onChange={e => updateItem(idx, 'price', e.target.value)} className={CELL_INPUT_RIGHT} /></td>
                        <td className="px-[8px] text-right tabular-nums text-gray-600">{money(it.amount)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-[8px]"><input value={it.package} disabled={isFrozen} onChange={e => updateItem(idx, 'package', e.target.value)} placeholder="如 1 CRATE" className={CELL_INPUT} /></td>
                        <td className="px-[8px]"><input value={it.nw} disabled={isFrozen} onChange={e => updateItem(idx, 'nw', e.target.value)} className={CELL_INPUT_RIGHT} /></td>
                        <td className="px-[8px]"><input value={it.gw} disabled={isFrozen} onChange={e => updateItem(idx, 'gw', e.target.value)} className={CELL_INPUT_RIGHT} /></td>
                      </>
                    )}
                    <td className="px-[8px] text-center">
                      <button type="button" onClick={() => removeItem(idx)} disabled={isFrozen} className="text-red-500 disabled:text-gray-300" title="删除这一行"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合计条：金额 / 重量一律由明细派生，不设第二个可填总额 */}
          <div className="flex items-center gap-[16px] flex-wrap rounded-[8px] border border-gray-200 bg-gray-50 px-[16px] py-[8px]">
            {isCI ? (
              <>
                <span className="text-gray-500">{kind} 总金额（按商品明细自动算出）</span>
                <span className="text-[16px] font-semibold text-gray-800 tabular-nums">{symbol}{money(form.totalAmount)}</span>
                <span className="inline-flex items-center gap-[8px] rounded-[6px] border border-gray-300 bg-white px-[12px] py-[4px]"
                  title="按系统汇率折算，仅供内部参考，不输出到给客户的 CI / PDF">
                  <span className="text-gray-500">{form.currency === 'CNY' ? '人民币金额' : '折合人民币'}</span>
                  {activeCurrency
                    ? <span className="text-[16px] font-semibold text-brand-600 tabular-nums">¥{money(cnyReference)}</span>
                    : <span className="text-amber-600">汇率未配置</span>}
                  <span className="text-gray-400">· 内部参考</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-500">TOTAL N.W (KGS)</span>
                <span className="text-[16px] font-semibold text-gray-800 tabular-nums">{money(sumNW(form.items))}</span>
                <span className="text-gray-500">TOTAL G.W (KGS)</span>
                <span className="text-[16px] font-semibold text-gray-800 tabular-nums">{money(sumGW(form.items))}</span>
                <span className="text-gray-400">按明细自动汇总</span>
              </>
            )}
          </div>
        </div>

        {isCI ? (
          <>
            {/* 条款：与 PI 同口径，三项必填且仍可自由输入，不强选下拉 */}
            <div className="card lg:col-span-3 space-y-[16px]">
              <h3 className="font-medium text-sm">交易条款（打印在客户单据上）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
                <div>
                  <label className={FIELD_LABEL} title="对应打印件 PAYMENT TERM，可自由输入，必填">付款条款 <span className="text-red-500">*</span></label>
                  <input list="doc-payment-terms" value={form.paymentTerm} disabled={isFrozen}
                    onChange={e => update('paymentTerm', e.target.value)} className={FIELD_INPUT} />
                  <datalist id="doc-payment-terms">{PAYMENT_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
                </div>
                <div>
                  <label className={FIELD_LABEL} title="对应打印件 TRANSACTION METHOD，可自由输入，必填">交易条件（Incoterms）<span className="text-red-500">*</span></label>
                  <input list="doc-incoterms" value={form.transactionMethod} disabled={isFrozen}
                    onChange={e => update('transactionMethod', e.target.value)} className={FIELD_INPUT} />
                  <datalist id="doc-incoterms">{INCOTERM_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
                </div>
                <div>
                  <label className={FIELD_LABEL} title="对应打印件 DELIVERY DATE，可自由描述天数，必填">交货期 <span className="text-red-500">*</span></label>
                  <input list="doc-delivery-date" value={form.deliveryDate} disabled={isFrozen}
                    onChange={e => update('deliveryDate', e.target.value)} className={FIELD_INPUT} />
                  <datalist id="doc-delivery-date"><option value="20 DAYS AFTER RECEIPT OF DEPOSIT" /><option value="30 DAYS" /></datalist>
                </div>
              </div>
              <div>
                <label className={FIELD_LABEL}>金额大写（Amount in Words，留空则自动生成）</label>
                <input value={form.amountInWords} disabled={isFrozen} onChange={e => update('amountInWords', e.target.value)}
                  placeholder={defaultAmountInWords(form.totalAmount, form.currency)} className={FIELD_INPUT} />
              </div>
              <div>
                <label className={FIELD_LABEL}>REMARKS 备注</label>
                <textarea value={form.remarks} disabled={isFrozen} onChange={e => update('remarks', e.target.value)} className={TEXTAREA_INPUT} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 装箱信息：真实 PL 的汇总与尺寸字段，CI 没有 */}
            <div className="card lg:col-span-3 space-y-[16px]">
              <h3 className="font-medium text-sm">装箱汇总（打印在客户单据上）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
                <div><label className={FIELD_LABEL}>Total Packages 总件数</label>
                  <input value={form.totalPackages} disabled={isFrozen} onChange={e => update('totalPackages', e.target.value)}
                    placeholder="如 2 CRATES" className={FIELD_INPUT} /></div>
                <div><label className={FIELD_LABEL}>GROSS WEIGHT 毛重</label>
                  <input value={form.grossWeight} disabled={isFrozen} onChange={e => update('grossWeight', e.target.value)}
                    placeholder="如 380 KGS" className={FIELD_INPUT} /></div>
                <div><label className={FIELD_LABEL}>NET WEIGHT 净重</label>
                  <input value={form.netWeight} disabled={isFrozen} onChange={e => update('netWeight', e.target.value)}
                    placeholder="如 320 KGS" className={FIELD_INPUT} /></div>
                <div><label className={FIELD_LABEL}>MEASUREMENT 体积</label>
                  <input value={form.measurement} disabled={isFrozen} onChange={e => update('measurement', e.target.value)}
                    placeholder="如 1.8 CBM" className={FIELD_INPUT} /></div>
                <div><label className={FIELD_LABEL}>Net Dimension 净尺寸</label>
                  <input value={form.netDimension} disabled={isFrozen} onChange={e => update('netDimension', e.target.value)} className={FIELD_INPUT} /></div>
                <div><label className={FIELD_LABEL}>Crate Dimension 箱尺寸</label>
                  <input value={form.crateDimension} disabled={isFrozen} onChange={e => update('crateDimension', e.target.value)} className={FIELD_INPUT} /></div>
              </div>
              <div>
                <label className={FIELD_LABEL}>Packing 包装说明</label>
                <textarea value={form.packingNote} disabled={isFrozen} onChange={e => update('packingNote', e.target.value)} className={TEXTAREA_INPUT} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
