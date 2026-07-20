import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Package, FileText, Truck, DollarSign, Calendar, User, MapPin, Phone, Printer, Loader2 } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { getOrderById } from '../services/orderService'
import { getCustomerById } from '../services/customerService'
import type { Order } from '../services/orderService'
import ApprovalFlow from '../components/ApprovalFlow'
import { usePrintPreview } from '../components/PrintPreview'

const orderStatusColors: Record<string, string> = {
  pending: 'bg-gray-50 text-gray-600',
  confirmed: 'bg-blue-50 text-blue-700',
  in_production: 'bg-yellow-50 text-yellow-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const orderStatusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  in_production: '生产中',
  shipped: '已发货',
  delivered: '已交付',
  cancelled: '已取消',
}

const paymentMethodLabels: Record<string, string> = {
  '30%预付+60%发货+10%验收': '30%预付 + 60%发货 + 10%验收',
  '银行转账': '银行转账',
  '承兑': '承兑',
  '现金': '现金',
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { openPreview, PrintPreviewComponent } = usePrintPreview()

  const [order, setOrder] = useState<Order | null>(null)
  const [customerName, setCustomerName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const basePath = location.pathname.startsWith('/export') ? '/export' : '/domestic'

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const data = await getOrderById(id)
        if (cancelled) return
        if (data) {
          setOrder(data)
          // 加载客户名称
          if (data.customerId) {
            try {
              const cust = await getCustomerById(data.customerId)
              if (cust && !cancelled) setCustomerName(cust.name)
            } catch { /* 客户加载失败不阻塞 */ }
          }
        }
      } catch { /* silent */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="text-sm">加载中...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Package size={48} className="text-gray-300 mb-4" />
        <p className="text-lg font-medium text-gray-500">订单不存在</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">返回</button>
      </div>
    )
  }

  const fmtMoney = (v: number) => '\u00A5' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handlePrint = () => {
    openPreview('tpl-order-print', {
      orderNo: order.code,
      customerName: customerName || order.customerId,
      orderDate: order.createdAt,
      deliveryDate: order.deliveryDate,
      totalAmount: fmtMoney(order.amount),
      items: (order.items || []).map((item, i) => ({
        name: item.productName,
        spec: item.spec || '',
        qty: item.quantity,
        price: fmtMoney(item.unitPrice),
        amount: fmtMoney(item.subtotal),
      })),
    })
  }

  return (
    <div className="space-y-5">
      {PrintPreviewComponent}
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`${basePath}/orders`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">订单详情</h1>
          <span className="font-mono text-sm text-gray-400">{order.code}</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${orderStatusColors[order.status]}`}>{orderStatusLabels[order.status]}</span>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Printer size={13} />打印
        </button>
      </div>

      {/* Card 1: 基本信息 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-700">基本信息</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoItem icon={<FileText size={12} />} label="订单编号" value={order.code} />
          <InfoItem icon={<User size={12} />} label="客户名称" value={
            customerName
              ? <span className="text-brand-600 hover:underline cursor-pointer" onClick={() => navigate(`${basePath}/customers/${order.customerId}`)}>{customerName}</span>
              : order.customerId
          } />
          <InfoItem icon={<Calendar size={12} />} label="订单日期" value={order.createdAt} />
          <InfoItem icon={<Truck size={12} />} label="交货日期" value={order.deliveryDate || '-'} />
          <InfoItem icon={<Calendar size={12} />} label="期望交付日期" value={order.expectedDeliveryDate || '-'} />
          <InfoItem icon={<DollarSign size={12} />} label="订单状态" value={<span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[order.status]}`}>{orderStatusLabels[order.status]}</span>} />
          <InfoItem icon={<DollarSign size={12} />} label="总金额" value={<span className="text-lg font-bold text-brand-600">{fmtMoney(order.amount)}</span>} />
          <InfoItem icon={<DollarSign size={12} />} label="未税金额" value={<span className="font-medium text-gray-700">{fmtMoney(order.amountWithoutTax || 0)}</span>} />
          <InfoItem icon={<User size={12} />} label="销售负责人" value={order.salesPerson || '-'} />
          <InfoItem icon={<FileText size={12} />} label="业务线" value={order.businessLine === 'industrial' ? '工业' : order.businessLine === 'retail' ? '零售' : order.businessLine === 'oem' ? 'OEM' : (order.businessLine || '-')} />
          <InfoItem icon={<FileText size={12} />} label="签约主体" value={order.contractEntity || '-'} />
          <InfoItem icon={<FileText size={12} />} label="销售类型" value={order.salesType || '-'} />
          <InfoItem icon={<FileText size={12} />} label="产品类型" value={order.productType || '-'} />
          <InfoItem icon={<FileText size={12} />} label="付款方式" value={paymentMethodLabels[order.paymentMethod || ''] || order.paymentMethod || '-'} />
          <InfoItem icon={<DollarSign size={12} />} label="已回款金额" value={<span className="text-green-600 font-medium">{fmtMoney(order.collectedAmount)}</span>} />
          <InfoItem icon={<DollarSign size={12} />} label="已开票金额" value={<span className="text-blue-600 font-medium">{fmtMoney(order.invoicedAmount)}</span>} />
        </div>

        {/* 收货信息 */}
        {(order.receiver || order.receiverAddress) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-400 mb-2">收货信息</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {order.receiver && <InfoItem icon={<User size={12} />} label="收货人" value={order.receiver} />}
              {order.receiverPhone && <InfoItem icon={<Phone size={12} />} label="联系电话" value={order.receiverPhone} />}
              {order.receiverAddress && <InfoItem icon={<MapPin size={12} />} label="收货地址" value={order.receiverAddress} />}
            </div>
          </div>
        )}

        {/* 特殊要求 */}
        {order.specialReq && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-400 mb-1">特殊要求</div>
            <div className="text-sm text-gray-700 bg-yellow-50 rounded-lg px-3 py-2">{order.specialReq}</div>
          </div>
        )}
      </div>

      {/* Card 2: 产品明细 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-700">产品明细</h2>
            <span className="text-xs text-gray-400">共 {(order.items || []).length} 项</span>
          </div>
          <div className="text-sm text-gray-500">
            合计：<span className="text-lg font-bold text-brand-600">{fmtMoney(order.amount)}</span>
          </div>
        </div>

        {(order.items && order.items.length > 0) ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">产品名称</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">规格</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">数量</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">单价(不含税)</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">税率</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">小计(含税)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{item.productName}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-xs truncate">{item.spec || '-'}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{item.quantity} {item.unit || ''}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtMoney(item.unitPrice)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{item.taxRate != null ? item.taxRate + '%' : '-'}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">{fmtMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={6} className="px-3 py-2.5 text-right text-sm font-medium text-gray-500">合计</td>
                    <td className="px-3 py-2.5 text-right text-lg font-bold text-brand-600">{fmtMoney(order.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {order.items.map((item, idx) => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-gray-900 text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-400">#{idx + 1}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{item.spec || '-'}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-gray-400">\u6570\u91CF：</span>
                      <span className="text-gray-700">{item.quantity} {item.unit || ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400">\u5355\u4EF7：</span>
                      <span className="text-gray-700">{fmtMoney(item.unitPrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">\u7A0E\u7387：</span>
                      <span className="text-gray-700">{item.taxRate != null ? item.taxRate + '%' : '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400">\u5C0F\u8BA1：</span>
                      <span className="font-medium text-gray-900">{fmtMoney(item.subtotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  合计：<span className="text-lg font-bold text-brand-600">{fmtMoney(order.amount)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">暂无产品明细</div>
        )}
      </div>

      {/* Card 3: 审批流程 */}
      <div className="card">
        <ApprovalFlow bizType="order" bizRecordId={id!} />
      </div>
    </div>
  )
}

/** 信息条目子组件 */
function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-gray-400 uppercase mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-gray-800 truncate">{value}</div>
    </div>
  )
}
