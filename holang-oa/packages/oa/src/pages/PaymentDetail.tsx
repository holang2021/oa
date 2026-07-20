import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign, Calendar, User, Building2, FileText, CreditCard, CheckCircle2, Loader2, Pencil } from 'lucide-react'
import { getPaymentById, type Payment } from '../services/paymentService'

const paymentTypeLabels: Record<string, string> = {
  deposit: '定金', progress: '进度款', final: '尾款', retention: '质保金',
  PROGRESS: '进度款', DEPOSIT: '定金', FINAL: '尾款', RETENTION: '质保金',
}

function getStatusLabel(status?: string): string {
  if (status === 'RECEIVED') return '已到账'
  if (status === 'PENDING') return '待回款'
  return status || '待回款'
}

function getStatusColor(status?: string): string {
  return status === 'RECEIVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/export') ? '/export' : '/domestic'

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getPaymentById(id)
      .then(setPayment)
      .catch(() => setPayment(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> 加载中...
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium">回款记录不存在</p>
        <button onClick={() => navigate(`${basePath}/collections`)} className="btn-secondary mt-4">返回</button>
      </div>
    )
  }

  const fmtMoney = (v: number) => '¥' + v.toLocaleString()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`${basePath}/collections`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">回款详情</h1>
        <span className="font-mono text-sm text-gray-400">{payment.paymentCode}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => navigate(`${basePath}/collections/${payment.id}/edit`)} className="btn-secondary text-xs inline-flex items-center gap-1">
            <Pencil size={14} /> 编辑
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${payment.status === 'RECEIVED' ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <DollarSign size={22} className={payment.status === 'RECEIVED' ? 'text-green-600' : 'text-yellow-600'} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{payment.customer?.companyName || '-'}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                  <CheckCircle2 size={12} className="inline mr-1" />
                  {getStatusLabel(payment.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><FileText size={12} /> 类型：{paymentTypeLabels[payment.type || ''] || payment.type || '-'}</span>
                <span className="inline-flex items-center gap-1"><CreditCard size={12} /> 方式：{payment.paymentMethod || '-'}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: payment.status === 'RECEIVED' ? '#16a34a' : '#d97706' }}>
              {fmtMoney(payment.amount)}
            </div>
            <div className="text-xs text-gray-400 mt-1">回款金额</div>
          </div>
        </div>
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 订单信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText size={15} className="text-brand-500" /> 关联订单
          </h3>
          <div className="space-y-2">
            <InfoRow label="订单编号" value={payment.order?.orderCode || '-'} />
            <InfoRow label="客户名称" value={payment.customer?.companyName || '-'} />
            <InfoRow label="业务线" value={payment.order?.businessLine || '-'} />
          </div>
        </div>

        {/* 时间信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar size={15} className="text-blue-500" /> 时间节点
          </h3>
          <div className="space-y-2">
            <InfoRow label="计划回款日" value={payment.plannedDate?.slice(0, 10) || '-'} />
            <InfoRow label="实际到账日" value={payment.receivedDate?.slice(0, 10) || '-'} />
            <InfoRow label="申请日期" value={payment.applyDate?.slice(0, 10) || '-'} />
            <InfoRow label="创建时间" value={payment.createdAt?.slice(0, 16) || '-'} />
          </div>
        </div>

        {/* 财务信息 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CreditCard size={15} className="text-emerald-500" /> 财务信息
          </h3>
          <div className="space-y-2">
            <InfoRow label="付款账户" value={payment.payerAccount || '-'} />
            <InfoRow label="收款账户" value={payment.customerAccount || '-'} />
            <InfoRow label="回款比例" value={payment.paymentRatio ? `${payment.paymentRatio}%` : '-'} />
            <InfoRow label="财务确认人" value={payment.confirmedFinance || '-'} />
            <InfoRow label="确认日期" value={payment.confirmedFinanceDate?.slice(0, 10) || '-'} />
            <InfoRow label="发票核销" value={payment.invoiceConfirm || '-'} />
          </div>
        </div>
      </div>

      {/* 备注 / 凭证 */}
      {(payment.remark || payment.voucher) && (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">附加信息</h3>
          {payment.remark && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{payment.remark}</div>
          )}
          {payment.voucher && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={13} />
              凭证号：<span className="font-mono">{payment.voucher}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-800 font-medium truncate ml-3">{value || '-'}</span>
    </div>
  )
}
