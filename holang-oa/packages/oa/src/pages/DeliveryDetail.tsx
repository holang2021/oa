import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit, Package, Truck, User, Phone, MapPin, Calendar, FileText, Building2 } from 'lucide-react'
import { getDeliveryById, type Delivery } from '../services/deliveryService'

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')

  useEffect(() => {
    if (!id) return
    getDeliveryById(id).then(d => {
      if (d) setDelivery(d)
      else setError('发货单不存在')
    }).catch(() => setError('加载失败')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-8 text-gray-400">加载中...</div>
  if (error || !delivery) return <div className="text-center py-8 text-red-500">{error || '未找到'}</div>

  const fmt = (s?: string) => s ? s.slice(0, 16).replace('T', ' ') : '-'
  const statusColor: Record<string, string> = {
    '普通': 'bg-gray-100 text-gray-700',
    '加急': 'bg-orange-100 text-orange-700',
    '已发货': 'bg-green-100 text-green-700',
  }
  const label = delivery.flowStatus || '普通'

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-1 hover:bg-gray-100 rounded"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold">发货单明细</h1>
          <p className="text-xs text-gray-500">{delivery.code || delivery.id.slice(-8)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[label] || 'bg-gray-100'}`}>{label}</span>
        <button onClick={() => nav(`${isExportRoute ? '/export' : '/domestic'}/deliveries/${id}/edit`)}
          className="ml-auto btn btn-primary text-sm flex items-center gap-1">
          <Edit size={14} /> 编辑
        </button>
      </div>

      {/* 基本信息 */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package size={15} /> 基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem icon={<FileText size={12} />} label="发货编号" value={delivery.code || delivery.id.slice(-8)} />
          <InfoItem icon={<Building2 size={12} />} label="关联订单" value={delivery.order?.orderCode || '-'} />
          <InfoItem icon={<Building2 size={12} />} label="客户" value={delivery.customer?.companyName || '-'} />
          <InfoItem icon={<Calendar size={12} />} label="申请日期" value={fmt(delivery.applyDate)} />
          <InfoItem icon={<Truck size={12} />} label="发货时间" value={fmt(delivery.deliveryDate)} />
          <InfoItem icon={<FileText size={12} />} label="状态" value={
            <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[label]}`}>{label}</span>
          } />
          <InfoItem icon={<User size={12} />} label="申请人" value={delivery.applicant || '-'} />
          <InfoItem icon={<FileText size={12} />} label="产品类型" value={delivery.productType || '-'} />
          <InfoItem icon={<FileText size={12} />} label="订单类型" value={delivery.orderType || '-'} />
        </div>
      </div>

      {/* 收货信息 */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Truck size={15} /> 收货信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem icon={<User size={12} />} label="收货人" value={delivery.receiver || '-'} />
          <InfoItem icon={<Phone size={12} />} label="联系电话" value={delivery.receiverPhone || '-'} />
          <InfoItem icon={<MapPin size={12} />} label="地址" value={`${delivery.shippingAddress || ''}${delivery.detailAddress ? ' ' + delivery.detailAddress : ''}`} spanFull />
          <InfoItem icon={<FileText size={12} />} label="特殊要求" value={delivery.specialReq || '无'} spanFull />
          <InfoItem icon={<FileText size={12} />} label="备注" value={delivery.remark || '无'} spanFull />
        </div>
      </div>

      {/* 财务/付款 */}
      {(delivery.paidAsContract || delivery.expectedPaymentDate || delivery.overdueReason) && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText size={15} /> 财务信息</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem icon={<FileText size={12} />} label="付款方式" value={delivery.paidAsContract || '-'} />
            <InfoItem icon={<Calendar size={12} />} label="预计到款日" value={fmt(delivery.expectedPaymentDate)} />
            <InfoItem icon={<FileText size={12} />} label="逾期原因" value={delivery.overdueReason || '-'} />
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon, label, value, spanFull }: { icon?: React.ReactNode; label: string; value: React.ReactNode; spanFull?: boolean }) {
  return (
    <div className={spanFull ? 'md:col-span-3 col-span-2' : ''}>
      <p className="text-[11px] text-gray-400 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}
