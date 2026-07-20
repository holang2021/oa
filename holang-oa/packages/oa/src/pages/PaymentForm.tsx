import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { customers, orders } from '../data/mockData'
import { Payment } from '../data/mockData'
import { createPayment, updatePayment, getPaymentById } from '../services/paymentService'
import { useI18n } from '../i18n/I18nContext'

const emptyForm = (): Payment => ({
  id: '',
  customerId: '',
  orderId: '',
  code: '',
  amount: 0,
  type: 'deposit',
  status: 'pending',
  plannedDate: '',
  receivedDate: '',
  paymentMethod: '银行转账',
  confirmedFinance: 'pending',
  confirmedFinanceDate: '',
  paymentVoucher: '',
  paymentRatio: 0,
  customerAccount: '',
  applyDate: '',
  remark: '',
})

const typeOptions = ['deposit', 'progress', 'final', 'retention']
const typeLabels: Record<string, string> = { deposit: '定金', progress: '进度款', final: '尾款', retention: '质保金' }
const paymentMethodOptions = ['银行转账', '承兑', '现金']

export default function PaymentForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isEdit = !!id

  const [form, setForm] = useState<Payment>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      getPaymentById(id).then(p => {
        if (p) setForm(p as any)
      }).catch(() => {})
    } else {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      setForm(prev => ({ ...prev, code: `PAY${dateStr}001` }))
    }
  }, [id, isEdit])

  // 当选择订单时，自动带出客户
  useEffect(() => {
    if (form.orderId) {
      const order = orders.find(o => o.id === form.orderId)
      if (order) {
        setForm(prev => ({ ...prev, customerId: order.customerId }))
      }
    }
  }, [form.orderId])

  const update = (field: keyof Payment, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.orderId) { alert('请选择订单'); return }
    if (!form.amount || form.amount <= 0) { alert('请输入回款金额'); return }
    setSaving(true)
    try {
      const payload: any = {
        customerId: form.customerId,
        orderId: form.orderId,
        paymentCode: form.code,
        amount: form.amount,
        type: (form.type || 'PROGRESS').toUpperCase(),
        status: (form.status || 'PENDING').toUpperCase(),
        plannedDate: form.plannedDate || null,
        receivedDate: form.receivedDate || null,
        paymentMethod: form.paymentMethod,
        paymentRatio: form.paymentRatio,
        remark: form.remark,
      }
      if (isEdit && id) {
        await updatePayment(id, payload)
      } else {
        await createPayment(payload)
      }
      navigate('/domestic/collections')
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const getCustomerName = (cid: string) => customers.find(c => c.id === cid)?.name || ''
  const getOrderCode = (oid: string) => orders.find(o => o.id === oid)?.code || ''

  // 可用订单（已确认的订单）
  const availableOrders = form.customerId
    ? orders.filter(o => o.customerId === form.customerId && o.status !== 'cancelled')
    : orders.filter(o => o.status !== 'cancelled')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑回款' : '新建回款'}</h1>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">关联信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款编号</label>
            <input type="text" value={form.code} disabled className="input bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">关联订单 *</label>
            <select
              value={form.orderId}
              onChange={e => update('orderId', e.target.value)}
              className="input text-sm"
            >
              <option value="">请选择订单</option>
              {availableOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.code} - ¥{o.amount.toLocaleString()} ({getCustomerName(o.customerId)})
                </option>
              ))}
            </select>
          </div>
          {form.customerId && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">关联客户</label>
              <input type="text" value={getCustomerName(form.customerId)} disabled className="input bg-gray-50 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款类型 *</label>
            <select
              value={form.type}
              onChange={e => update('type', e.target.value)}
              className="input text-sm"
            >
              {typeOptions.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">回款信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款金额 *</label>
            <input
              type="number"
              value={form.amount || ''}
              onChange={e => update('amount', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="请输入回款金额"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款状态 *</label>
            <select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className="input text-sm"
            >
              <option value="pending">待回款</option>
              <option value="received">已到账</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">计划回款日期 *</label>
            <input
              type="date"
              value={form.plannedDate}
              onChange={e => update('plannedDate', e.target.value)}
              className="input text-sm"
            />
          </div>
          {form.status === 'received' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">实际到账日期</label>
              <input
                type="date"
                value={form.receivedDate}
                onChange={e => update('receivedDate', e.target.value)}
                className="input text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款方式</label>
            <select
              value={form.paymentMethod}
              onChange={e => update('paymentMethod', e.target.value)}
              className="input text-sm"
            >
              {paymentMethodOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款比例(%)</label>
            <input
              type="number"
              value={form.paymentRatio || ''}
              onChange={e => update('paymentRatio', parseFloat(e.target.value) || 0)}
              className="input text-sm"
              placeholder="0-100"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">财务确认</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">财务确认</label>
            <select
              value={form.confirmedFinance}
              onChange={e => update('confirmedFinance', e.target.value)}
              className="input text-sm"
            >
              <option value="pending">待确认</option>
              <option value="confirmed">已确认</option>
            </select>
          </div>
          {form.confirmedFinance === 'confirmed' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">财务确认日期</label>
              <input
                type="date"
                value={form.confirmedFinanceDate}
                onChange={e => update('confirmedFinanceDate', e.target.value)}
                className="input text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">回款凭证</label>
            <input
              type="text"
              value={form.paymentVoucher}
              onChange={e => update('paymentVoucher', e.target.value)}
              className="input text-sm"
              placeholder="请输入回款凭证编号或上传"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户付款账户</label>
            <input
              type="text"
              value={form.customerAccount}
              onChange={e => update('customerAccount', e.target.value)}
              className="input text-sm"
              placeholder="请输入客户付款账户"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">其他信息</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">申请时间</label>
            <input
              type="date"
              value={form.applyDate}
              onChange={e => update('applyDate', e.target.value)}
              className="input text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
            <textarea
              value={form.remark}
              onChange={e => update('remark', e.target.value)}
              className="input text-sm"
              rows={3}
              placeholder="请输入备注"
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
