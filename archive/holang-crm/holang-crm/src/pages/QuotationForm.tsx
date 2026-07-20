import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { quotations, customers, opportunities } from '../data/mockData'
import type { Quotation } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'

const emptyForm = (): Quotation => ({
  id: '',
  customerId: '',
  opportunityId: '',
  code: '',
  amount: 0,
  status: 'draft',
  salesPerson: '',
  createdAt: new Date().toISOString().split('T')[0],
  validUntil: '',
  businessLine: '',
  approvalStatus: 'pending',
  flowStatus: 'draft',
  taxRate: 13,
  discount: 0,
  discountReason: '',
  convertedToOrder: false,
})

const statusOptions = ['draft', 'sent', 'approved', 'rejected', 'expired']
const statusLabels: Record<string, string> = {
  draft: '草稿', sent: '已发送', approved: '已通过', rejected: '已驳回', expired: '已过期',
}

export default function QuotationForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isEdit = !!id

  const [form, setForm] = useState<Quotation>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      const existing = quotations.find(q => q.id === id)
      if (existing) setForm({ ...existing })
    } else {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const count = quotations.length + 1
      setForm(prev => ({ ...prev, code: `HQ${dateStr}${String(count).padStart(3, '0')}` }))
    }
  }, [id, isEdit])

  const update = (field: keyof Quotation, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (!form.opportunityId) { alert('请选择关联商机'); return }
    if (!form.amount || form.amount <= 0) { alert('请输入报价金额'); return }
    setSaving(true)
    setTimeout(() => {
      if (isEdit) {
        const idx = quotations.findIndex(q => q.id === id)
        if (idx >= 0) quotations[idx] = form
      } else {
        form.id = 'q' + (quotations.length + 1)
        quotations.push(form)
      }
      setSaving(false)
      navigate('/domestic/quotations')
    }, 500)
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const customerOpportunities = opportunities.filter(o => o.customerId === form.customerId)

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold">
          {isEdit ? `编辑报价单 ${form.code}` : '新建报价单'}
        </h2>
        <div className="ml-auto" />
        <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
          <Save size={14} className="mr-1" />
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={() => alert('生成 PDF 预览（' + form.code + '）')} className="btn btn-outline text-sm">
          <FileText size={14} className="mr-1" />
          预览/导出
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 基本信息 */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm">基本信息</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">报价单号</label>
              <input value={form.code} disabled className="input text-sm bg-gray-50 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">报价日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.createdAt} onChange={e => update('createdAt', e.target.value)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">有效期至 <span className="text-red-500">*</span></label>
              <input type="date" value={form.validUntil} onChange={e => update('validUntil', e.target.value)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">状态</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="input text-sm w-full">
                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 客户与商机 */}
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-medium text-sm">客户信息</h3>
          <div>
            <label className="text-xs text-gray-500">客户 <span className="text-red-500">*</span></label>
            <select value={form.customerId} onChange={e => { update('customerId', e.target.value); update('opportunityId', '') }} className="input text-sm w-full">
              <option value="">请选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <label className="text-xs text-gray-500">关联商机 <span className="text-red-500">*</span></label>
            <select value={form.opportunityId} onChange={e => update('opportunityId', e.target.value)} className="input text-sm w-full" disabled={!form.customerId}>
              <option value="">请选择商机</option>
              {customerOpportunities.map(o => <option key={o.id} value={o.id}>{o.name}（{o.amount.toLocaleString()}）</option>)}
            </select>
          </div>
        </div>

        {/* 金额信息 */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="font-medium text-sm">金额信息</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">报价金额（元） <span className="text-red-500">*</span></label>
              <input type="number" value={form.amount || ''} onChange={e => update('amount', parseFloat(e.target.value) || 0)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">增值税税率（%）</label>
              <input type="number" value={form.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value) || 0)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">优惠金额（元）</label>
              <input type="number" value={form.discount || ''} onChange={e => update('discount', parseFloat(e.target.value) || 0)} className="input text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">税后金额</label>
              <input value={'¥' + ((form.amount - (form.discount || 0)) * (1 + form.taxRate / 100)).toFixed(2)} disabled className="input text-sm bg-gray-50 w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">优惠原因</label>
            <input value={form.discountReason || ''} onChange={e => update('discountReason', e.target.value)} placeholder="填写优惠原因..." className="input text-sm w-full" />
          </div>
        </div>

        {/* 审批信息 */}
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-medium text-sm">审批信息</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">审批状态</label>
              <select value={form.approvalStatus} onChange={e => update('approvalStatus', e.target.value)} className="input text-sm w-full">
                <option value="pending">待审批</option>
                <option value="approving">审批中</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">流程状态</label>
              <select value={form.flowStatus} onChange={e => update('flowStatus', e.target.value)} className="input text-sm w-full">
                <option value="draft">草稿</option>
                <option value="running">执行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>
          {form.convertedToOrder && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ 已转为订单
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
