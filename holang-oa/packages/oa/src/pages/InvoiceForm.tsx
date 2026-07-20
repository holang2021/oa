import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { customers, orders } from '../data/mockData'
import { createInvoice, updateInvoice, getInvoiceById } from '../services/invoiceService'

export default function InvoiceForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const isNew = !id || id === 'new'

  const emptyForm = () => ({
    id: '',
    orderId: '',
    customerId: '',
    salesPerson: '',
    amount: 0,
    ratio: 0,
    orderStatus: 'pending' as 'completed' | 'pending' | 'delivered',
    type: 'vat_13_special',
    contractEntity: '',
    title: '',
    taxNumber: '',
    companyAddress: '',
    companyPhone: '',
    bankName: '',
    bankAccount: '',
    recipient: '',
    recipientPhone: '',
    recipientAddress: '',
    invoiceNumber: '',
    invoiceFile: '',
    invoiceScan: '',
    approvalStatus: 'pending' as 'pending' | 'issued' | 'rejected' | 'cancelled',
    notes: '',
  })

  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    if (!isNew && id) {
      getInvoiceById(id).then(inv => {
        if (inv) setForm(inv as any)
      }).catch(() => {})
    }
  }, [id, isNew])

  const update = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        customerId: form.customerId,
        orderId: form.orderId || null,
        salesPerson: form.salesPerson,
        amount: form.amount,
        ratio: form.ratio,
        invoiceType: form.type,
        title: form.title,
        taxNumber: form.taxNumber,
        companyAddress: form.companyAddress,
        companyPhone: form.companyPhone,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        recipient: form.recipient,
        recipientPhone: form.recipientPhone,
        detailAddress: form.recipientAddress,
        invoiceNumber: form.invoiceNumber,
        invoiceFile: form.invoiceFile,
        approvalStatus: form.approvalStatus,
        remark: form.notes,
      }
      if (isNew) {
        await createInvoice(payload)
      } else if (id) {
        await updateInvoice(id, payload)
      }
      nav('/domestic/invoices')
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-lg font-bold">{isNew ? '新建开票申请' : '编辑开票申请'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 关联信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">关联信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
              <select value={form.customerId} onChange={e => update('customerId', e.target.value)} className="input text-sm" required>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">销售负责人</label>
              <input type="text" value={form.salesPerson} onChange={e => update('salesPerson', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">订单状态 *</label>
              <select value={form.orderStatus} onChange={e => update('orderStatus', e.target.value)} className="input text-sm">
                <option value="completed">已完成</option>
                <option value="pending">未完成</option>
                <option value="delivered">已交货</option>
              </select>
            </div>
          </div>
        </div>

        {/* 开票金额 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">开票金额</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">本次开票金额 *</label>
              <input type="number" value={form.amount || ''} onChange={e => update('amount', parseFloat(e.target.value) || 0)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">本次开票比例(%)</label>
              <input type="number" value={form.ratio || ''} onChange={e => update('ratio', parseFloat(e.target.value) || 0)} className="input text-sm" min={0} max={100} />
            </div>
          </div>
        </div>

        {/* 发票信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">发票信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发票类型 *</label>
              <select value={form.type} onChange={e => update('type', e.target.value)} className="input text-sm">
                <option value="none">无须发票</option>
                <option value="vat_13_special">13%增值税专用发票</option>
                <option value="vat_6_special">6%增值税专用发票</option>
                <option value="vat_6_normal">6%普票</option>
                <option value="vat_13_normal">13%普票</option>
                <option value="normal">普通发票</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">开票主体 *</label>
              <input type="text" value={form.contractEntity} onChange={e => update('contractEntity', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发票抬头 *</label>
              <input type="text" value={form.title} onChange={e => update('title', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">统一信用代码 *</label>
              <input type="text" value={form.taxNumber} onChange={e => update('taxNumber', e.target.value)} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">公司地址</label>
              <input type="text" value={form.companyAddress} onChange={e => update('companyAddress', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">电话</label>
              <input type="text" value={form.companyPhone} onChange={e => update('companyPhone', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">开户银行</label>
              <input type="text" value={form.bankName} onChange={e => update('bankName', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">银行账号</label>
              <input type="text" value={form.bankAccount} onChange={e => update('bankAccount', e.target.value)} className="input text-sm" />
            </div>
          </div>
        </div>

        {/* 收件信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">收件信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">收件人</label>
              <input type="text" value={form.recipient} onChange={e => update('recipient', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">联系电话</label>
              <input type="text" value={form.recipientPhone} onChange={e => update('recipientPhone', e.target.value)} className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">收件地址</label>
            <textarea value={form.recipientAddress} onChange={e => update('recipientAddress', e.target.value)} className="input text-sm" rows={2} />
          </div>
        </div>

        {/* 发票结果 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">发票结果</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发票号</label>
              <input type="text" value={form.invoiceNumber} onChange={e => update('invoiceNumber', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发票附件</label>
              <input type="text" value={form.invoiceFile} onChange={e => update('invoiceFile', e.target.value)} className="input text-sm" placeholder="上传或填写文件路径" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">发票扫描件</label>
              <input type="text" value={form.invoiceScan} onChange={e => update('invoiceScan', e.target.value)} className="input text-sm" placeholder="上传或填写文件路径" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">审批状态</label>
              <select value={form.approvalStatus} onChange={e => update('approvalStatus', e.target.value)} className="input text-sm">
                <option value="pending">审批中</option>
                <option value="issued">已开具</option>
                <option value="rejected">驳回</option>
                <option value="cancelled">撤消</option>
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
