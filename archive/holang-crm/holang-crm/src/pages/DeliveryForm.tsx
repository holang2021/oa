import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { deliveries, customers, orders } from '../data/mockData'

export default function DeliveryForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isNew = !id || id === 'new'

  const emptyForm = () => ({
    id: '',
    orderId: '',
    customerId: '',
    customerName: '',
    salesType: 'direct' as 'direct' | 'indirect',
    businessLine: 'domestic' as 'domestic' | 'export',
    productType: 'finished' as 'finished' | 'spare',
    paidAsContract: 'yes' as 'yes' | 'no',
    expectedPaymentDate: '',
    overdueReason: '',
    deliveryDate: '',
    contactPerson: '',
    contactPhone: '',
    shippingAddress: '',
    shippingMethod: '',
    specialReq: '',
    approvalStatus: 'pending' as 'pending' | 'approved' | 'cancelled' | 'rejected',
    flowStatus: '执行中',
    notes: '',
  })

  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    if (!isNew && id) {
      const d = deliveries.find(x => x.id === id)
      if (d) setForm({ ...d })
    }
  }, [id, isNew])

  const update = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }))

  const handleCustomerChange = (cid: string) => {
    const c = customers.find(x => x.id === cid)
    update('customerId', cid)
    update('customerName', c?.name || '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = form.id || `FH${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${String(deliveries.length + 1).padStart(3, '0')}`
    update('id', code)
    alert(isNew ? '发货申请已创建（演示模式）' : '发货申请已更新（演示模式）')
    nav('/domestic/deliveries')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-lg font-bold">{isNew ? '新建发货申请' : '编辑发货申请'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 关联信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">关联信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
              <select value={form.customerId} onChange={e => handleCustomerChange(e.target.value)} className="input text-sm" required>
                <option value="">请选择</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">关联订单 *</label>
              <select value={form.orderId} onChange={e => update('orderId', e.target.value)} className="input text-sm" required>
                <option value="">请选择</option>
                {orders.filter(o => !form.customerId || o.customerId === form.customerId).map(o => <option key={o.id} value={o.id}>{o.code}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">销售类型 *</label>
              <select value={form.salesType} onChange={e => update('salesType', e.target.value)} className="input text-sm">
                <option value="direct">直销</option>
                <option value="indirect">间销</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">销售类别 *</label>
              <select value={form.businessLine} onChange={e => update('businessLine', e.target.value)} className="input text-sm">
                <option value="domestic">内销</option>
                <option value="export">外贸</option>
              </select>
            </div>
          </div>
        </div>

        {/* 产品信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">产品信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">产品类型</label>
              <select value={form.productType} onChange={e => update('productType', e.target.value)} className="input text-sm">
                <option value="finished">成品</option>
                <option value="spare">备件</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">按合同付款 *</label>
              <select value={form.paidAsContract} onChange={e => update('paidAsContract', e.target.value)} className="input text-sm">
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">预计回款时间 *</label>
              <input type="date" value={form.expectedPaymentDate} onChange={e => update('expectedPaymentDate', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">逾期回款原因</label>
              <input type="text" value={form.overdueReason} onChange={e => update('overdueReason', e.target.value)} className="input text-sm" placeholder="如逾期请填写原因" />
            </div>
          </div>
        </div>

        {/* 收货信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">收货信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发货时间 *</label>
              <input type="date" value={form.deliveryDate} onChange={e => update('deliveryDate', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">运输方式</label>
              <select value={form.shippingMethod} onChange={e => update('shippingMethod', e.target.value)} className="input text-sm">
                <option value="">请选择</option>
                <option value="road">公路</option>
                <option value="sea">海运</option>
                <option value="air">空运</option>
                <option value="rail">铁路</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">收货人 *</label>
              <input type="text" value={form.contactPerson} onChange={e => update('contactPerson', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">联系方式 *</label>
              <input type="text" value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} className="input text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">收货地址 *</label>
            <textarea value={form.shippingAddress} onChange={e => update('shippingAddress', e.target.value)} className="input text-sm" rows={2} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">其他特殊要求</label>
            <input type="text" value={form.specialReq} onChange={e => update('specialReq', e.target.value)} className="input text-sm" placeholder="包装要求、配送说明等" />
          </div>
        </div>

        {/* 审批状态 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">审批状态</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">审批状态</label>
              <select value={form.approvalStatus} onChange={e => update('approvalStatus', e.target.value)} className="input text-sm">
                <option value="pending">审批中</option>
                <option value="approved">已通过</option>
                <option value="cancelled">已撤消</option>
                <option value="rejected">驳回</option>
              </select>
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">备注</h3>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input text-sm" rows={3} placeholder="备注信息" />
        </div>

        {/* 操作 */}
        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary">保存</button>
          <button type="button" onClick={() => nav(-1)} className="btn btn-outline">取消</button>
        </div>
      </form>
    </div>
  )
}
