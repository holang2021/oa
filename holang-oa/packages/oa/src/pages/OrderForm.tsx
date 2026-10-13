import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { createOrder, updateOrder, getOrderById, type Order } from '../services/orderService'
import { getCustomerById, getCustomers } from '../services/customerService'
import { getQuotes } from '../services/quoteService'
import { useI18n } from '../i18n/I18nContext'

const emptyForm = (): Order => ({
  id: '',
  customerId: '',
  quotationId: '',
  code: '',
  amount: 0,
  amountWithoutTax: 0,
  status: 'pending',
  salesPerson: '',
  createdAt: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  businessLine: '',
  approvalStatus: 'pending',
  flowStatus: 'running',
  expectedDeliveryDate: '',
  contractEntity: '',
  salesMode: '直销',
  salesType: '',
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
const salesModeOptions = ['直销', '渠道', '代理']
const productTypeOptions = ['标准品', '定制']
const paymentMethodOptions = ['银行转账', '承兑', '现金']

export default function OrderForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const isEdit = !!id
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const prefilledCustomerId = searchParams.get('customerId') || ''
  const returnTo = searchParams.get('returnTo') || ''
  const safeReturnTo = returnTo.startsWith(`${basePath}/`) ? returnTo : `${basePath}/orders`

  const [form, setForm] = useState<Order>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customerList, setCustomerList] = useState<{id:string;name:string;code:string}[]>([])
  const [quoteList, setQuoteList] = useState<{id:string;code:string;customerId:string;amount:number}[]>([])

  useEffect(() => {
    getCustomers({ pageSize: 500 }).then(async res => {
      const customers = res.list.map(c => ({ id: c.id, name: c.name, code: c.code }))
      if (prefilledCustomerId && !customers.some(c => c.id === prefilledCustomerId)) {
        try {
          const customer = await getCustomerById(prefilledCustomerId)
          if (customer) customers.unshift({ id: customer.id, name: customer.name, code: customer.code })
        } catch {
          // 上下文客户已不可访问时，保留正常客户列表供用户重新选择。
        }
      }
      setCustomerList(customers)
    }).catch(() => {})
    getQuotes({ pageSize: 500 }).then(res => {
      setQuoteList(res.list.map(q => ({ id: q.id, code: q.code, customerId: q.customerId, amount: q.amount })))
    }).catch(() => {})
  }, [prefilledCustomerId])

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true)
      getOrderById(id).then(o => {
        if (o) setForm(o as Order)
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      // 新建订单不预填单号：留空由后端统一编码(OR+year+6位)，避免前端假号同日重号
      setForm(prev => ({ ...prev, code: '', customerId: prefilledCustomerId || prev.customerId }))
    }
  }, [id, isEdit, prefilledCustomerId])

  const update = (field: keyof Order, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.customerId) { alert('请选择客户'); return }
    if (!form.amount || form.amount <= 0) { alert('请输入订单金额'); return }
    setSaving(true)
    try {
      const payload: any = {
        customerId: form.customerId,
        orderCode: form.code,
        amount: isExportRoute ? form.amountWithoutTax : form.amount,
        amountWithoutTax: isExportRoute ? form.amountWithoutTax : (form.amountWithoutTax || Math.round((form.amount / (1 + (form.taxRate || 0) / 100)) * 100) / 100),
        status: form.status,
        salesPerson: form.salesPerson,
        businessLine: form.businessLine,
        orderDate: form.createdAt ? new Date(form.createdAt) : new Date(),
        deliveryDate: form.deliveryDate || null,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
        contractEntity: form.contractEntity,
        salesMode: form.salesMode,
        endUser: form.endUser,
        productType: form.productType,
        paymentMethod: form.paymentMethod,
        receiver: form.receiver,
        receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress,
        specialReq: form.specialReq,
        discount: form.discount,
        taxRate: isExportRoute ? 0 : form.taxRate,
      }
      if (isEdit && id) {
        await updateOrder(id, payload)
      } else {
        await createOrder(payload)
      }
      navigate(safeReturnTo)
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
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
            <input type="text" value={form.code || '（保存后自动生成）'} disabled className="input bg-gray-50 text-sm" placeholder="保存后自动生成" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">客户 *</label>
            <select
              value={form.customerId}
              onChange={e => update('customerId', e.target.value)}
              className="input text-sm"
            >
              <option value="">请选择客户</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
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
              {quoteList.filter(q => q.customerId === form.customerId).map(q => (
                <option key={q.id} value={q.id}>{q.code} - ¥{q.amount.toLocaleString()}</option>
              ))}
            </select>
          </div>
          {isExportRoute ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">合同金额（未税）*</label>
              <input
                type="number"
                value={form.amountWithoutTax || ''}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 0
                  update('amountWithoutTax', v)
                  update('amount', v)
                }}
                className="input text-sm"
                placeholder="请输入未税合同金额"
              />
              <p className="mt-1 text-[11px] text-amber-500">外销合同均为未税价格，不计税、无含税选项</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">计税方式 *</label>
                <select
                  value={String(form.taxRate ?? 13)}
                  onChange={e => {
                    const v = Number(e.target.value)
                    update('taxRate', v)
                    const amt = form.amount || 0
                    update('amountWithoutTax', v === 0 ? amt : Math.round((amt / (1 + v / 100)) * 100) / 100)
                  }}
                  className="input text-sm"
                >
                  <option value="13">增值税 13%</option>
                  <option value="6">增值税 6%</option>
                  <option value="0">未税（无税）</option>
                </select>
              </div>
              {form.taxRate === 0 ? (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">未税金额（合同总额）*</label>
                  <input
                    type="number"
                    value={form.amount || ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0
                      update('amount', v)
                      update('amountWithoutTax', v)
                    }}
                    className="input text-sm"
                    placeholder="请输入未税合同金额"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">含税金额（合同总额）*</label>
                    <input
                      type="number"
                      value={form.amount || ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0
                        update('amount', v)
                        update('amountWithoutTax', Math.round((v / (1 + (form.taxRate || 0) / 100)) * 100) / 100)
                      }}
                      className="input text-sm"
                      placeholder="请输入含税合同金额"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">未税金额（自动计算）</label>
                    <input
                      type="number"
                      value={Math.round((form.amount / (1 + (form.taxRate || 0) / 100)) * 100) / 100}
                      className="input text-sm bg-gray-50"
                      disabled
                    />
                  </div>
                </>
              )}
            </>
          )}
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
            <label className="block text-xs font-medium text-gray-500 mb-1">销售模式</label>
            <select
              value={form.salesMode}
              onChange={e => update('salesMode', e.target.value)}
              className="input text-sm"
            >
              {salesModeOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
