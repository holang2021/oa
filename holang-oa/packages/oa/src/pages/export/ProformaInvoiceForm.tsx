import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { useI18n } from '../../i18n/I18nContext'
import { getCustomers } from '../../services/customerService'
import { getQuotes, type Quote } from '../../services/quoteService'
import { createPi, updatePiStatus, getPiById } from '../../services/piService'

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
  totalAmountCNY: number
  paymentTerms: string
  deliveryTerms: string
  deliveryDate: string
  signedAt: string
  notes: string
}

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
  totalAmountCNY: 0,
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
const currencyOptions = ['USD', 'EUR', 'CNY', 'GBP']
const paymentTermOptions = [
  'TT 30% in advance, 70% before shipment',
  'TT 30% in advance, 60% before shipment, 10% after acceptance',
  'LC at sight',
  'LC 30 days',
  '100% TT before shipment',
]
const deliveryTermOptions = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP']

export default function ProformaInvoiceForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isEdit = !!id

  const [form, setForm] = useState<PiForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const custData: any = await getCustomers({ salesType: 'EXTERNAL' })
        setCustomers(Array.isArray(custData) ? custData : custData?.list || [])
        if (isEdit && id) {
          const pi = await getPiById(id)
          if (pi) {
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
              totalAmountCNY: 0,
              paymentTerms: '',
              deliveryTerms: '',
              deliveryDate: '',
              signedAt: '',
              notes: pi.notes || '',
            })
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

  const handleSave = async () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (!form.quotationId) { alert('请关联一份已接受的报价单（PI 必须基于 ACCEPTED 外销报价）'); return }
    if (!form.totalAmount || form.totalAmount <= 0) { alert('请输入外币金额'); return }
    setSaving(true)
    try {
      const issuedAt = form.piDate ? new Date(form.piDate).toISOString() : undefined
      const expiresAt = (() => {
        if (!form.piDate) return undefined
        const d = new Date(form.piDate)
        d.setDate(d.getDate() + (form.validityDays || 30))
        return d.toISOString()
      })()
      const notesParts: string[] = []
      if (form.paymentTerms) notesParts.push(`付款条款: ${form.paymentTerms}`)
      if (form.deliveryTerms) notesParts.push(`交货条款: ${form.deliveryTerms}`)
      if (form.notes) notesParts.push(form.notes)
      const payload = {
        customerId: form.customerId,
        quoteRef: form.quotationId,
        amount: form.totalAmount,
        currency: form.currency,
        issuedAt,
        expiresAt,
        notes: notesParts.join('；') || undefined,
      }
      if (isEdit && id) {
        await updatePiStatus(id, form.status)
      } else {
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
        <button onClick={() => alert('生成 PI PDF：' + form.piCode)} className="btn btn-outline text-sm">
          <FileText size={14} className="mr-1" />
          导出 PDF
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
            <label className="text-xs text-gray-500">关联报价单（须 ACCEPTED）<span className="text-red-500">*</span></label>
            <select value={form.quotationId} onChange={e => update('quotationId', e.target.value)} className="input text-sm w-full">
              <option value="">请选择已接受报价单</option>
              {quotes.map(q => (
                <option key={q.id} value={q.id}>{q.code}（{q.amount?.toLocaleString?.() ?? q.amount}）</option>
              ))}
            </select>
            {form.customerId && quotes.length === 0 && (
              <div className="text-xs text-amber-600 mt-1">该外销客户暂无「已接受」报价单，无法生成 PI</div>
            )}
          </div>
        </div>

        {/* 金额与条款 */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm">金额与贸易条款</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">币种 <span className="text-red-500">*</span></label>
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className="input text-sm w-full">
                {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">外币金额 <span className="text-red-500">*</span></label>
              <input type="number" value={form.totalAmount || ''} onChange={e => {
                const val = parseFloat(e.target.value) || 0
                update('totalAmount', val)
                if (form.currency === 'USD') update('totalAmountCNY', Math.round(val * 7.27))
                else if (form.currency === 'EUR') update('totalAmountCNY', Math.round(val * 7.85))
                else update('totalAmountCNY', val)
              }} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">人民币金额（参考）</label>
              <input value={'¥' + form.totalAmountCNY.toLocaleString()} disabled className="input text-sm bg-gray-50 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">预计交货期</label>
              <input type="date" value={form.deliveryDate} onChange={e => update('deliveryDate', e.target.value)} className="input text-sm w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">付款条款</label>
              <select value={form.paymentTerms} onChange={e => update('paymentTerms', e.target.value)} className="input text-sm w-full">
                <option value="">请选择</option>
                {paymentTermOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">交货条款（Incoterms）</label>
              <select value={form.deliveryTerms} onChange={e => update('deliveryTerms', e.target.value)} className="input text-sm w-full">
                <option value="">请选择</option>
                {deliveryTermOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">备注</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input text-sm w-full" rows={2} />
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
