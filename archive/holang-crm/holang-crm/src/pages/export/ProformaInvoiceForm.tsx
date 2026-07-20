import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { proformaInvoices, customers, quotations } from '../../data/mockData'
import type { ProformaInvoice } from '../../data/mockData'
import { useI18n } from '../../i18n/I18nContext'

const emptyForm = (): ProformaInvoice => ({
  id: '',
  piCode: '',
  customerId: '',
  customerName: '',
  orderId: '',
  quotationId: '',
  piDate: new Date().toISOString().split('T')[0],
  salesPerson: '',
  currency: 'USD',
  totalAmount: 0,
  totalAmountCNY: 0,
  paymentTerms: '',
  deliveryTerms: '',
  deliveryDate: '',
  validityDays: 30,
  status: 'draft',
  signedAt: '',
  pdfFile: '',
  createdAt: new Date().toISOString().split('T')[0],
})

const statusOptions = ['draft', 'sent', 'signed', 'expired', 'cancelled']
const statusLabels: Record<string, string> = {
  draft: '草稿', sent: '已发送', signed: '已回签', expired: '已过期', cancelled: '已撤销',
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

  const [form, setForm] = useState<ProformaInvoice>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      const existing = proformaInvoices.find(pi => pi.id === id)
      if (existing) setForm({ ...existing })
    } else {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)
      const count = proformaInvoices.length + 1
      setForm(prev => ({ ...prev, piCode: `PI-${dateStr}-${String(count).padStart(3, '0')}` }))
    }
  }, [id, isEdit])

  const update = (field: keyof ProformaInvoice, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (!form.totalAmount || form.totalAmount <= 0) { alert('请输入外币金额'); return }
    setSaving(true)
    setTimeout(() => {
      if (isEdit) {
        const idx = proformaInvoices.findIndex(pi => pi.id === id)
        if (idx >= 0) proformaInvoices[idx] = form
      } else {
        form.id = 'pi' + (proformaInvoices.length + 1)
        proformaInvoices.push(form)
      }
      setSaving(false)
      navigate('/export/proforma-invoices')
    }, 500)
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)

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
              <label className="text-xs text-gray-500">PI 编号</label>
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
            <label className="text-xs text-gray-500">客户 <span className="text-red-500">*</span></label>
            <select value={form.customerId} onChange={e => { update('customerId', e.target.value); update('quotationId', '') }} className="input text-sm w-full">
              <option value="">请选择客户</option>
              {customers.filter(c => c.salesType === 'external' || !c.salesType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedCustomer && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>联系人：{selectedCustomer.contactName}</div>
              <div>电话：{selectedCustomer.contactPhone}</div>
              <div>邮箱：{selectedCustomer.contactEmail}</div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500">关联报价单</label>
            <select value={form.quotationId} onChange={e => update('quotationId', e.target.value)} className="input text-sm w-full">
              <option value="">请选择报价单</option>
              {quotations.filter(q => q.customerId === form.customerId).map(q => <option key={q.id} value={q.id}>{q.code}（¥{q.amount.toLocaleString()}）</option>)}
            </select>
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
                // 自动换算人民币（汇率取 7.27）
                if (form.currency === 'USD') update('totalAmountCNY', Math.round(val * 7.27))
                else if (form.currency === 'EUR') update('totalAmountCNY', Math.round(val * 7.85))
                else update('totalAmountCNY', val)
              }} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">人民币金额</label>
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
        </div>

        {/* 审批/回签信息 */}
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-medium text-sm">回签信息</h3>
          <div>
            <label className="text-xs text-gray-500">客户回签日期</label>
            <input type="date" value={form.signedAt} onChange={e => update('signedAt', e.target.value)} className="input text-sm w-full" />
          </div>
          {form.signedAt && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ 客户已于 {form.signedAt} 回签此 PI
              {!form.orderId && (
                <div className="mt-1">
                  <button onClick={() => alert('转为订单：' + form.piCode)} className="btn btn-primary text-xs">
                    转为正式订单
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
