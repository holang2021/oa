import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, ArrowUp, ArrowDown, Settings, GripVertical } from 'lucide-react'
import { getCustomers } from '../services/customerService'
import { getProducts, type Product } from '../services/productService'
import { getQuoteById, createQuoteApi, updateQuoteApi } from '../services/quoteService'
import { useI18n } from '../i18n/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import QuoteFieldConfig from './QuoteFieldConfig'
import { getQuoteFields, type QuoteFieldDef } from '../services/quoteFieldStore'

interface QuoteItemRow {
  uid: string
  isCustom: boolean
  productId: string
  name: string
  model: string
  spec: string
  quantity: number
  unit: string
  unitPrice: number
  discount: number
}

const uid = () => 'row_' + Math.random().toString(36).slice(2, 9)

const emptyForm = () => ({
  customerId: '',
  code: '',
  validUntil: '',
  status: 'DRAFT',
  taxRate: 13,
  discount: 0,
  notes: '',
  commercialTerms: '',
  // V1 预览用，不保存到后端
  quoteSubject: '',
  customerContact: '',
  customerEmail: '',
  customerPhone: '',
  remarks: '',
  validDays: 30,
})

const statusOptions = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']
const statusLabels: Record<string, string> = {
  DRAFT: '草稿', SENT: '已发送', APPROVED: '已通过', REJECTED: '已驳回', EXPIRED: '已过期',
}

// ─── 数字 → 中文大写金额（人民币，元角分，V1 预览工具） ──────────────────────
function num2Chinese(num: number): string {
  if (!num || isNaN(num)) return '人民币零元整'
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿', '兆']
  const negative = num < 0
  const n = Math.abs(num)
  const [intPartStr, decStr] = n.toFixed(2).split('.')
  const intPart = parseInt(intPartStr, 10)

  let intResult = ''
  if (intPart === 0) {
    intResult = '零元'
  } else {
    const groups: number[][] = []
    let m = intPart
    while (m > 0) {
      const g: number[] = []
      for (let i = 0; i < 4; i++) { g.unshift(m % 10); m = Math.floor(m / 10) }
      groups.unshift(g)
    }
    let acc = ''
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const big = bigUnits[groups.length - 1 - gi]
      let gs = ''
      let nonZero = false
      let lastZero = false
      for (let i = 0; i < 4; i++) {
        const d = g[i]
        if (d === 0) {
          if (!lastZero && nonZero) gs += '零'
          lastZero = true
        } else {
          gs += digits[d] + units[3 - i]
          nonZero = true
          lastZero = false
        }
      }
      gs = gs.replace(/零+$/, '')
      if (gs) {
        if (acc && !acc.endsWith('零')) acc += '零'
        acc += gs + big
      } else if (big === '万' || big === '亿') {
        if (acc && !acc.endsWith('零')) acc += big
      }
    }
    intResult = acc + '元'
  }

  const jiao = parseInt(decStr[0])
  const fen = parseInt(decStr[1])
  let decResult = ''
  if (jiao === 0 && fen === 0) {
    decResult = '整'
  } else {
    if (jiao > 0) decResult += digits[jiao] + '角'
    else if (fen > 0) decResult += '零'
    if (fen > 0) decResult += digits[fen] + '分'
  }

  return '人民币' + intResult + decResult + (negative ? '（负）' : '')
}

function fmtDateCN(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ─── 型号 → 规格预制模板（V1 前端内嵌 · 仅供选择产品时自动填入 Desc&Spec；
//                     产品库 spec 字段优先、模板仅作空值兜底；销售可自由删改） ────
const PRODUCT_SPEC_TEMPLATE: Record<string, string> = {
  NPL09B: [
    '型　　号：NPL09B',
    '氮气流量：30.0m³/h',
    '氮气纯度：99.99%（无氧含量）',
    '氧 含 量：≤100ppm',
    '出口压力：0.6MPa',
    '进 气 口：G1',
    '出 气 口：G3/4',
    '功　　率：100W　220V/50HZ',
    '外形尺寸：1875×500×1700mm',
    '用气需求：3.0m³/min（洁净压缩空气）',
    '含 尘 量：0.01ppm',
    '含 油 量：0.01um',
    '露点温度：2~10℃',
    '进气压力：≥0.7MPa',
  ].join('\n'),
}

function specTemplateFor(p?: { name?: string; model?: string | null; spec?: string | null }): string {
  if (!p) return ''
  // 优先级：产品库 spec（已有则尊重） → 型号模板 → 名称模板 → 空
  if (p.spec && p.spec.trim()) return p.spec
  if (p.model && PRODUCT_SPEC_TEMPLATE[p.model]) return PRODUCT_SPEC_TEMPLATE[p.model]
  if (p.name && PRODUCT_SPEC_TEMPLATE[p.name]) return PRODUCT_SPEC_TEMPLATE[p.name]
  return ''
}

export default function QuotationForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const isEdit = !!id
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'

  const [form, setForm] = useState(emptyForm())
  const [items, setItems] = useState<QuoteItemRow[]>([])
  const [customerList, setCustomerList] = useState<{ id: string; name: string; code: string }[]>([])
  const [productList, setProductList] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showFieldCfg, setShowFieldCfg] = useState(false)
  // 档1：报价格段配置（前端 localStorage 原型）——字段定义 + 当前单据填写值
  const [quoteFields, setQuoteFields] = useState<QuoteFieldDef[]>([])
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    getCustomers({ pageSize: 500, salesType }).then(res => {
      setCustomerList(res.list.map(c => ({ id: c.id, name: c.name, code: c.code })))
    }).catch(() => {})
    getProducts({ pageSize: 500 }).then(res => {
      setProductList(res.list)
    }).catch(() => {})
  }, [salesType])

  // 载入报价格段配置（localStorage 原型）
  useEffect(() => {
    setQuoteFields(getQuoteFields())
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true)
      getQuoteById(id).then(q => {
        if (q) {
          setForm({
            customerId: q.customerId,
            code: q.code,
            validUntil: (q.validUntil || '').slice(0, 10),
            status: q.status || 'DRAFT',
            taxRate: q.taxRate ?? 13,
            discount: q.discount || 0,
            notes: q.notes || '',
            commercialTerms: (q as any).commercialTerms || q.notes || '',
            quoteSubject: '',
            customerContact: '',
            customerEmail: '',
            customerPhone: '',
            remarks: '',
            validDays: 30,
          })
          setItems(((q.items as any[]) || []).map((it: any) => ({
            uid: uid(),
            isCustom: !it.productId,
            productId: it.productId || '',
            name: it.name || '',
            model: it.model || '',
            spec: it.spec || '',
            quantity: it.quantity,
            unit: it.unit || '台',
            unitPrice: it.unitPrice ?? 0,
            discount: it.discount || 0,
          })))
        }
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      setForm(prev => ({ ...prev, code: `QT${dateStr}001` }))
    }
  }, [id, isEdit])

  const update = (field: keyof ReturnType<typeof emptyForm>, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addProductRow = () => setItems(prev => [...prev, { uid: uid(), isCustom: false, productId: '', name: '', model: '', spec: '', quantity: 1, unit: '台', unitPrice: 0, discount: 0 }])
  const addCustomRow = () => setItems(prev => [...prev, { uid: uid(), isCustom: true, productId: '', name: '', model: '', spec: '', quantity: 1, unit: '项', unitPrice: 0, discount: 0 }])
  const removeItem = (u: string) => setItems(prev => prev.filter(it => it.uid !== u))

  const updateItem = (u: string, field: keyof QuoteItemRow, value: any) => {
    setItems(prev => prev.map(it => it.uid === u ? { ...it, [field]: value } : it))
  }

  const pickProduct = (u: string, pid: string) => {
    const p = productList.find(pr => pr.id === pid)
    setItems(prev => prev.map(it => {
      if (it.uid !== u) return it
      return {
        ...it,
        productId: pid,
        name: p?.name || '',
        model: p?.model || '',
        unitPrice: p?.unitPrice || 0,
        unit: it.unit || '台',
        spec: specTemplateFor(p) || it.spec,
      }
    }))
  }

  const moveItem = (u: string, dir: -1 | 1) => {
    setItems(prev => {
      const i = prev.findIndex(it => it.uid === u)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const arr = [...prev]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  // 档1：行项拖拽排序（握把拖拽）
  const reorderItems = (from: number, to: number) => {
    setItems(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const arr = [...prev]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return arr
    })
  }

  // 单价即折后价：行项总价 = 单价 × 数量（不再额外乘行项折扣）
  const lineAmount = (it: QuoteItemRow) => (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)

  // 计价
  const rate = isExportRoute ? 0 : (form.taxRate ?? 0)
  const isTaxFree = rate === 0
  const preDiscount = items.reduce((a, it) => a + lineAmount(it), 0)
  const totalTaxed = preDiscount * (1 - (Number(form.discount) || 0) / 100)
  const totalUntaxed = isTaxFree ? totalTaxed : Math.round((totalTaxed / (1 + rate / 100)) * 100) / 100
  const totalSets = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)

  const selectedCustomer = customerList.find(c => c.id === form.customerId)

  const handleSave = async () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (items.length === 0) { alert('请至少添加一条行项'); return }
    setSaving(true)
    try {
      const payload: any = {
        customerId: form.customerId,
        items: items.map(it => ({
          productId: it.productId || undefined,
          name: it.name,
          model: it.model,
          spec: it.spec,
          quantity: Number(it.quantity) || 1,
          unit: it.unit,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
        })),
        discount: Number(form.discount) || 0,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        notes: form.commercialTerms,
        commercialTerms: form.commercialTerms,
        taxRate: rate,
      }
      if (isEdit && id) {
        await updateQuoteApi(id, payload)
      } else {
        await createQuoteApi(payload)
      }
      navigate(`${basePath}/quotations`)
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">加载中...</div>

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? `编辑报价单 ${form.code}` : '新建报价单'}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowFieldCfg(true)} className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <Settings size={15} /> 字段配置
          </button>
          <button onClick={() => setShowPreview(true)} className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <FileText size={15} /> 预览
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-1.5">
            <Save size={15} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 顶部信息：基本 + 客户 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 基本信息 */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">报价单号</label>
              <input value={form.code} disabled className="input text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">报价有效期（天） *</label>
              <input type="number" min={1} value={form.validDays} onChange={e => update('validDays', parseInt(e.target.value) || 30)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">报价日期截止</label>
              <input type="date" value={form.validUntil} onChange={e => update('validUntil', e.target.value)} className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">报价主题 *</label>
            <input value={form.quoteSubject} onChange={e => update('quoteSubject', e.target.value)} className="input text-sm" placeholder="如：模块式氮气发生器 报价 / NPL09B 询盘回复" />
          </div>
        </div>

        {/* 客户信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">客户信息</h3>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
            <select value={form.customerId} onChange={e => update('customerId', e.target.value)} className="input text-sm">
              <option value="">请选择客户</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}（{c.code}）</option>)}
            </select>
          </div>
          {selectedCustomer && <div className="text-xs text-gray-500">客户编码：{selectedCustomer.code}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">联系人</label>
            <input value={form.customerContact} onChange={e => update('customerContact', e.target.value)} className="input text-sm" placeholder="如：周小姐" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">邮箱</label>
              <input value={form.customerEmail} onChange={e => update('customerEmail', e.target.value)} className="input text-sm" placeholder="选填" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">电话</label>
              <input value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} className="input text-sm" placeholder="选填" />
            </div>
          </div>
        </div>
      </div>

      {/* 报价行项 */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">报价行项 *</h3>
          <div className="flex gap-2">
            <button onClick={addProductRow} className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> 添加产品
            </button>
            <button onClick={addCustomRow} className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> 添加自定义行
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          添加产品：从 HOLANG 产品库选择，自动带入名称/型号/默认规格，可修改。添加自定义行：自由填写名称与规格，用于储气罐 / 外购件 / 运杂费 / 安装 / 其他临时项目。
        </p>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="py-6 text-center text-gray-400 text-sm">暂无行项，请点击「添加产品」或「添加自定义行」</div>
          )}
          {items.map((it, idx) => (
            <div key={it.uid} className="border rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {it.isCustom ? (
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">名称 *</label>
                      <input value={it.name} onChange={e => updateItem(it.uid, 'name', e.target.value)} className="input text-sm" placeholder="如：100L 储气罐 / 运杂费 / 安装费" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-0.5">选择 HOLANG 产品 *</label>
                      <select value={it.productId} onChange={e => pickProduct(it.uid, e.target.value)} className="input text-sm">
                        <option value="">请选择产品</option>
                        {productList.map(pr => (
                          <option key={pr.id} value={pr.id}>{pr.name}{pr.model ? `（${pr.model}）` : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-0.5">型号</label>
                    <input value={it.model} onChange={e => updateItem(it.uid, 'model', e.target.value)} className="input text-sm" placeholder="型号（可选）" />
                  </div>
                </div>
                <button onClick={() => removeItem(it.uid)} className="text-red-500 hover:text-red-700 p-1 mt-5" title="删除该行">
                  <Trash2 size={15} />
                </button>
                {/* 档1：拖拽握把 */}
                <div
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5 mt-5"
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragIndex !== null && dragIndex !== idx) reorderItems(dragIndex, idx); setDragIndex(null) }}
                  title="拖拽排序"
                >
                  <GripVertical size={16} />
                </div>
                <div className="flex flex-col gap-0.5 mt-5">
                  <button onClick={() => moveItem(it.uid, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-0.5" title="上移">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveItem(it.uid, 1)} disabled={idx === items.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-0.5" title="下移">
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  Description &amp; Specification（选 HOLANG 产品后自动带入规格，可自由删改；自定义行手填）
                </label>
                <textarea value={it.spec} onChange={e => updateItem(it.uid, 'spec', e.target.value)} className="input text-sm leading-relaxed font-mono" rows={6} placeholder={"型　号：\n氮气流量：\n氮气纯度：\n出口压力：\n…"} />
                {it.spec && (
                  <div className="text-[10px] text-gray-400 mt-0.5">已 {it.spec.split(/\r?\n/).filter(l => l.trim()).length} 行，可逐行删改</div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">数量</label>
                  <input type="number" min={0} value={it.quantity} onChange={e => updateItem(it.uid, 'quantity', parseFloat(e.target.value) || 0)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">单位</label>
                  <input value={it.unit} onChange={e => updateItem(it.uid, 'unit', e.target.value)} className="input text-sm" placeholder="台/项/套" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">单价</label>
                  <input type="number" min={0} value={it.unitPrice} onChange={e => updateItem(it.uid, 'unitPrice', parseFloat(e.target.value) || 0)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">折扣(%)</label>
                  <input type="number" value={it.discount} onChange={e => updateItem(it.uid, 'discount', parseFloat(e.target.value) || 0)} className="input text-sm" />
                </div>
                <div className="flex items-end">
                  <div className="text-sm">
                    <span className="text-[11px] text-gray-500">金额 </span>
                    <span className="font-medium text-brand-600">¥{lineAmount(it).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 计税方式 + 合计 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">计税方式</label>
            {isExportRoute ? (
              <div className="input text-sm bg-gray-50 text-gray-500">未税（外销）</div>
            ) : (
              <select value={String(form.taxRate ?? 13)} onChange={e => update('taxRate', Number(e.target.value))} className="input text-sm">
                <option value="13">增值税 13%</option>
                <option value="6">增值税 6%</option>
                <option value="0">未税（无税）</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">整单优惠(%)</label>
            <input type="number" value={form.discount} onChange={e => update('discount', parseFloat(e.target.value) || 0)} className="input text-sm" />
          </div>
          <div className="space-y-1">
            {isTaxFree ? (
              <div className="text-right">
                <span className="text-xs text-gray-500">未税金额：</span>
                <span className="text-lg font-bold text-brand-600">¥{totalUntaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <>
                <div className="text-right">
                  <span className="text-xs text-gray-500">未税金额：</span>
                  <span className="text-base font-bold text-brand-600">¥{totalUntaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">含税金额（{rate}%）：</span>
                  <span className="text-lg font-bold text-gray-900">¥{totalTaxed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>
        </div>
        {isExportRoute && <p className="text-[11px] text-amber-500">外销报价均为未税价格，不计税、无含税选项</p>}
      </div>

      {/* 商业条款 + 备注 */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">商业条款 / 备注</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">商业条款（付款条件 / 交货期 / 质保…）</label>
            <textarea
              value={form.commercialTerms}
              onChange={e => update('commercialTerms', e.target.value)}
              className="input text-sm"
              rows={6}
              placeholder="如：付款方式：30% 预付款，65% 发货款，5% 调试验收完成1周内付清。&#10;交 货 期：订单确认后 20 天具备发货条件，特殊情况再商榷。&#10;…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">备注（每行一条，自动编号列示）</label>
            <textarea
              value={form.remarks}
              onChange={e => update('remarks', e.target.value)}
              className="input text-sm"
              rows={6}
              placeholder="如：本次价格为人民币含13%增值税价格，总价已含运费，但不含货到现场的二次搬运费用。&#10;…"
            />
          </div>
        </div>
      </div>

      {/* 档1：自定义字段（字段配置里添加的字段自动出现在此） */}
      {quoteFields.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">自定义字段</h3>
            <button onClick={() => setShowFieldCfg(true)} className="text-xs text-brand-600 hover:underline">
              管理字段
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quoteFields.map(f => (
              <div key={f.id}>
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  {f.label}{f.required ? ' *' : ''}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={customValues[f.id] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="input text-sm"
                  >
                    <option value="">请选择</option>
                    {(f.options || []).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'date' ? (
                  <input
                    type="date"
                    value={customValues[f.id] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="input text-sm"
                  />
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    value={customValues[f.id] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="input text-sm"
                  />
                ) : (
                  <input
                    value={customValues[f.id] || ''}
                    onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="input text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 客户视角预览（前端本地渲染，无需保存） */}
      {showFieldCfg && (
        <QuoteFieldConfig
          onClose={() => setShowFieldCfg(false)}
          onChanged={() => setQuoteFields(getQuoteFields())}
        />
      )}
      {showPreview && (
        <QuotePreview
          code={form.code}
          customerName={selectedCustomer?.name || '（未选择客户）'}
          customerCode={selectedCustomer?.code || ''}
          customerContact={form.customerContact}
          customerEmail={form.customerEmail}
          customerPhone={form.customerPhone}
          quoteSubject={form.quoteSubject}
          validDays={form.validDays}
          isExport={isExportRoute}
          items={items}
          totalUntaxed={totalUntaxed}
          totalTaxed={totalTaxed}
          rate={rate}
          totalSets={totalSets}
          commercialTerms={form.commercialTerms}
          remarks={form.remarks}
          customFields={quoteFields.map(f => ({ label: f.label, value: customValues[f.id] || '' })).filter(p => p.value)}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

function QuotePreview(props: {
  code: string
  customerName: string
  customerCode: string
  customerContact: string
  customerEmail: string
  customerPhone: string
  quoteSubject: string
  validDays: number
  isExport: boolean
  items: QuoteItemRow[]
  totalUntaxed: number
  totalTaxed: number
  totalSets: number
  rate: number
  commercialTerms: string
  remarks: string
  customFields?: { label: string; value: string }[]
  onClose: () => void
}) {
  const today = new Date()
  const dateStr = fmtDateCN(today)
  const fmt = (n: number) => '￥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // 我方联系人/邮箱：自动读取当前登录销售真实信息（方案 A：V1 仅前端接 name/email；电话暂用公司统一号）
  const { user } = useAuth()
  const ourContact = user?.name || '刘世光 18662335855'
  const ourEmail = user?.email || 'henry.liu@holangchina.com'

  // 金额合计：对内销 = 含税；对未税 = 未税
  const finalTotal = props.rate === 0 ? props.totalUntaxed : props.totalTaxed
  const chineseTotal = num2Chinese(finalTotal)

  const remarkLines = (props.remarks || '').split('\n').map(s => s.trim()).filter(Boolean)
  const termLines = (props.commercialTerms || '').split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto p-4" onClick={props.onClose}>
      <div className="bg-white w-full max-w-3xl shadow my-4" onClick={e => e.stopPropagation()}>
        {/* 打印页边距控制：A4 + 12mm，导出 PDF 时生效 */}
        <style>{`@page{size:A4;margin:12mm;}@media print{.no-print{display:none!important;}}`}</style>
        {/* 顶部栏 */}
        <div className="no-print flex items-center justify-between px-5 py-2.5 border-b bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">报价单预览（客户视角）</span>
          <button onClick={props.onClose} className="text-gray-500 hover:text-gray-700 text-xs">关闭</button>
        </div>

        {/* 报价单主体——严格参考真实 HOLANG 报价单格式 */}
        <div className="px-9 py-6 text-gray-900" style={{ fontFamily: 'Arial, "Microsoft YaHei", sans-serif' }}>
          {/* Logo + 标题 + 右上角编号 */}
          <div className="flex items-start justify-between border-b-2 border-brand-300 pb-2 mb-3">
            <div className="flex items-center gap-4">
              <img
                src="/HOLANG_Logo_Official.png"
                alt="昊朗（苏州）能源科技有限公司"
                style={{ height: '28px', width: 'auto' }}
                className="shrink-0 select-none"
                draggable={false}
              />
              <div className="text-2xl font-semibold leading-none">
                Quotation
                <span className="text-base font-medium ml-1">报价单</span>
              </div>
            </div>
            <div className="text-[11px] text-gray-700 space-y-1 text-right min-w-[180px]">
              <div className="flex items-center justify-end gap-2">
                <span className="text-gray-500">报价编号：</span>
                <span className="font-mono tabular-nums border-b border-dotted border-gray-500 px-2 min-w-[150px] inline-block text-center">
                  {props.code || '—'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-gray-500">报价日期：</span>
                <span className="border-b border-dotted border-gray-500 px-2 min-w-[150px] inline-block text-center">
                  {dateStr}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-gray-500">报价有效期：</span>
                <span className="border-b border-dotted border-gray-500 px-2 min-w-[150px] inline-block text-center">
                  {Number(props.validDays) > 0 ? `${props.validDays}天` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 客户 + 公司信息 */}
          <div className="grid grid-cols-2 gap-x-6 mb-4 text-[12px]">
            <div className="space-y-1.5">
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">客户名称：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">{props.customerName === '（未选择客户）' ? '' : props.customerName}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">联&nbsp;系&nbsp;人：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">{props.customerContact || '—'}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">邮&nbsp;&nbsp;&nbsp;&nbsp;箱：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1 break-all">{props.customerEmail || '—'}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">电&nbsp;&nbsp;&nbsp;&nbsp;话：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">{props.customerPhone || '—'}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">主&nbsp;&nbsp;&nbsp;&nbsp;题：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">{props.quoteSubject || '—'}</span></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">公司名称：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1 font-semibold">昊朗（苏州）能源科技有限公司</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">联&nbsp;系&nbsp;人：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">{ourContact}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">邮&nbsp;&nbsp;&nbsp;&nbsp;箱：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1 break-all text-blue-700">{ourEmail}</span></div>
              <div className="flex"><span className="w-16 text-gray-500 shrink-0">电&nbsp;&nbsp;&nbsp;&nbsp;话：</span><span className="border-b border-dotted border-gray-400 flex-1 px-1">400-0512-711</span></div>
            </div>
          </div>

          {/* 导语 */}
          <div className="text-[12px] text-gray-700 mb-3">感谢贵方的不吝询价，现将贵方所需产品做如下报价：</div>

          {/* 行项表 */}
          <table className="w-full text-[12px] border-collapse border-2 border-black mb-0">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="border border-black p-1.5 w-12">
                  <div className="font-semibold">Item</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">项目</div>
                </th>
                <th className="border border-black p-1.5">
                  <div className="font-semibold">Descriptions &amp; Specification</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">名称及规格</div>
                </th>
                <th className="border border-black p-1.5 w-20">
                  <div className="font-semibold">Quantity</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">数量（SET）</div>
                </th>
                <th className="border border-black p-1.5 w-28">
                  <div className="font-semibold">Unit Price</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">单价（RMB）</div>
                </th>
                <th className="border border-black p-1.5 w-28">
                  <div className="font-semibold">Total</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">总价（RMB）</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {props.items.length === 0 && (
                <tr><td colSpan={5} className="border border-black p-4 text-center text-gray-400">暂无行项</td></tr>
              )}
              {props.items.map((it, i) => {
                const qty = Number(it.quantity) || 0
                const price = Number(it.unitPrice) || 0
                const total = price * qty
                const hasPrice = price > 0
                return (
                  <tr key={it.uid} className="align-top">
                    <td className="border border-black p-1.5 text-center font-semibold">{i + 1}</td>
                    <td className="border border-black p-1.5">
                      <div className="font-semibold text-[13px]">{it.name || '—'}</div>
                      {it.model && <div className="text-gray-600 text-[11px] mt-0.5">型&nbsp;&nbsp;号：{it.model}</div>}
                      {it.spec && (
                        <div className="text-gray-700 text-[11px] mt-0.5 whitespace-pre-wrap leading-relaxed">
                          {it.spec}
                        </div>
                      )}
                    </td>
                    <td className="border border-black p-1.5 text-center">{qty}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">
                      {hasPrice ? fmt(price) : '-'}
                    </td>
                    <td className="border border-black p-1.5 text-right tabular-nums font-semibold">
                      {hasPrice ? fmt(total) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* 合计 + 大写 */}
          <table className="w-full text-[12px] border-collapse border-2 border-black border-t-0">
            <tbody>
              <tr>
                <td className="border border-black p-1.5" colSpan={2}></td>
                <td className="border border-black p-1.5 text-left whitespace-nowrap w-20">
                  合计：<span className="float-right tabular-nums">{props.totalSets}</span>
                </td>
                <td className="border border-black p-1.5 text-left whitespace-nowrap w-28">
                  总&nbsp;&nbsp;价
                </td>
                <td className="border border-black p-1.5 text-right font-bold w-28 tabular-nums">
                  {fmt(finalTotal)}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5" colSpan={2}></td>
                <td className="border border-black p-1.5 text-left whitespace-nowrap w-20">
                  大&nbsp;&nbsp;写：
                </td>
                <td className="border border-black p-1.5 text-left whitespace-nowrap" colSpan={2}>
                  人民币&nbsp;{chineseTotal}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 备注区 */}
          {(remarkLines.length > 0 || termLines.length > 0) && (
            <div className="mt-4 text-[12px]">
              {(remarkLines.length > 0 || props.quoteSubject) && (
                <div className="mb-3">
                  <div className="font-semibold mb-1">备注：</div>
                  <ol className="list-decimal pl-5 space-y-0.5">
                    {props.quoteSubject && (
                      <li className="whitespace-pre-wrap">{props.quoteSubject}</li>
                    )}
                    {remarkLines.map((line, i) => (
                      <li key={i} className="whitespace-pre-wrap">{line}</li>
                    ))}
                  </ol>
                </div>
              )}
              {termLines.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">注：</div>
                  <ol className="list-decimal pl-5 space-y-0.5">
                    {termLines.map((line, i) => (
                      <li key={i} className="whitespace-pre-wrap">{line}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* 自定义字段（档1：字段配置里添加的字段） */}
          {props.customFields && props.customFields.length > 0 && (
            <div className="mt-4 text-[12px]">
              <div className="font-semibold mb-1">其他信息：</div>
              <ul className="space-y-0.5">
                {props.customFields.map((p, i) => (
                  <li key={i}>
                    <span className="text-gray-500">{p.label}：</span>
                    <span className="whitespace-pre-wrap">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 落款 */}
          <div className="mt-10 text-[12px] text-right pr-2 space-y-1">
            <div className="font-semibold">昊朗（苏州）能源科技有限公司</div>
            <div>{dateStr}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
