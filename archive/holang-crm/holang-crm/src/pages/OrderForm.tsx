import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { orders, customers, quotations } from '../data/mockData'
import { Order } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'

const emptyForm = (): Order => ({
  id: '',
  customerId: '',
  quotationId: '',
  code: '',
  amount: 0,
  status: 'pending',
  salesPerson: '',
  createdAt: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  businessLine: '',
  approvalStatus: 'pending',
  flowStatus: 'running',
  expectedDeliveryDate: '',
  contractEntity: '',
  salesType: '直销',
  endUser: '',
  productType: '标准品',
  paymentMethod: '银行转账',
  receiver: '',
  receiverPhone: '',
  receiverAddress: '',
  contractFile: '',
  techAgreement: '',
  specialReq: '',
  collectedAmount: 0,
  invoicedAmount: 0,
  taxRate: 13,
  discount: 0,
  items: [],
})

const statusOptions = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled']
const statusLabels: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', in_production: '生产中',
  shipped: '已发货', delivered: '已交付', cancelled: '已取消',
}
const salesTypeOptions = ['直销', '渠道', '代理']
const productTypeOptions = ['标准品', '定制']
const paymentMethodOptions = ['银行转账', '承兑', '现金']

export default function OrderForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isEdit = !!id

  const [form, setForm] = useState<Order>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      const existing = orders.find(o => o.id === id)
      if (existing) setForm({ ...existing })
    } else {
      // 新建时自动生成编号
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const count = orders.length + 1
      setForm(prev => ({ ...prev, code: `ORD${dateStr}${String(count).padStart(3, '0')}` }))
    }
  }, [id, isEdit])

  const update = (field: keyof Order, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (!form.amount || form.amount <= 0) { alert('请输入订单金额'); return }
    setSaving(true)
    setTimeout(() => {
      if (isEdit) {
        const idx = orders.findIndex(o => o.id === id)
        if (idx >= 0) orders[idx] = form
      } else {
        const newId = String(orders.length + 1)
        orders.push({ ...form, id: newId })
      }
      setSaving(false)
      navigate('/domestic/orders')
    }, 500)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑订单' : '新建订单'}</h1>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单编号</label>
            <input type="text" value={form.code} disabled className="input bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
            <select
              value={form.customerId}
              onChange={e => update('customerId', e.target.value)}
              className="input text-sm"
            >
              <option value="">请选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">关联报价</label>
            <select
              value={form.quotationId}
              onChange={e => update('quotationId', e.target.value)}
              className="input text-sm"
            >
              <option value="">请选择报价（可选）</option>
              {quotations.filter(q => q.customerId === form.customerId).map(q => (
                <option key={q.id} value={q.id}>{q.code} - ¥{q.amount.toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单金额 *</label>
            <input
              type="number"
              value={form.amount || ''}
              onChange={e => update('amount', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="请输入订单金额"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单状态 *</label>
            <select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className="input text-sm"
            >
              {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">业务线</label>
            <select
              value={form.businessLine}
              onChange={e => update('businessLine', e.target.value)}
              className="input text-sm"
            >
              <option value="">请选择</option>
              <option value="industrial">工业</option>
              <option value="retail">零售</option>
              <option value="oem">OEM</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">下单日期 *</label>
            <input
              type="date"
              value={form.createdAt}
              onChange={e => update('createdAt', e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">交付日期 *</label>
            <input
              type="date"
              value={form.deliveryDate}
              onChange={e => update('deliveryDate', e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">期望交付日期</label>
            <input
              type="date"
              value={form.expectedDeliveryDate}
              onChange={e => update('expectedDeliveryDate', e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">销售负责人</label>
            <input
              type="text"
              value={form.salesPerson}
              onChange={e => update('salesPerson', e.target.value)}
              className="input text-sm"
              placeholder="请输入销售负责人"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">商务信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">签约主体</label>
            <input
              type="text"
              value={form.contractEntity}
              onChange={e => update('contractEntity', e.target.value)}
              className="input text-sm"
              placeholder="请输入签约主体"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">销售类型</label>
            <select
              value={form.salesType}
              onChange={e => update('salesType', e.target.value)}
              className="input text-sm"
            >
              {salesTypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">终端用户</label>
            <input
              type="text"
              value={form.endUser}
              onChange={e => update('endUser', e.target.value)}
              className="input text-sm"
              placeholder="请输入终端用户"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">产品类型</label>
            <select
              value={form.productType}
              onChange={e => update('productType', e.target.value)}
              className="input text-sm"
            >
              {productTypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">付款方式</label>
            <select
              value={form.paymentMethod}
              onChange={e => update('paymentMethod', e.target.value)}
              className="input text-sm"
            >
              {paymentMethodOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">增值税税率(%)</label>
            <input
              type="number"
              value={form.taxRate || ''}
              onChange={e => update('taxRate', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="13"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">优惠金额</label>
            <input
              type="number"
              value={form.discount || ''}
              onChange={e => update('discount', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">收货信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">收货人</label>
            <input
              type="text"
              value={form.receiver}
              onChange={e => update('receiver', e.target.value)}
              className="input text-sm"
              placeholder="请输入收货人"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">收货人电话</label>
            <input
              type="text"
              value={form.receiverPhone}
              onChange={e => update('receiverPhone', e.target.value)}
              className="input text-sm"
              placeholder="请输入收货人电话"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">收货地址</label>
            <textarea
              value={form.receiverAddress}
              onChange={e => update('receiverAddress', e.target.value)}
              className="input text-sm"
              rows={2}
              placeholder="请输入收货地址"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">财务信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">已回款金额</label>
            <input
              type="number"
              value={form.collectedAmount || ''}
              onChange={e => update('collectedAmount', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="0"
              disabled
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">已开票金额</label>
            <input
              type="number"
              value={form.invoicedAmount || ''}
              onChange={e => update('invoicedAmount', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="0"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">取消</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm inline-flex items-center gap-1.5"
        >
          <Save size={15} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
