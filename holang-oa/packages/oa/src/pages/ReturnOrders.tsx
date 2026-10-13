import { useState } from 'react'
import {
  Package, Search, Filter, Clock, CheckCircle2, XCircle,
  AlertTriangle, Truck, RefreshCw, DollarSign, FileText, Plus,
  ExternalLink, Shield, Globe, Flag, X, Save, MapPin, ChevronDown
} from 'lucide-react'

// ─── Logistics ────────────────────────────────────

interface LogisticsCarrier {
  id: string; name: string; code: string; type: 'domestic' | 'international'; website: string
}

const CARRIERS: LogisticsCarrier[] = [
  { id: 'sf', name: '顺丰速运', code: 'SF', type: 'domestic', website: 'https://www.sf-express.com' },
  { id: 'db', name: '德邦快递', code: 'DB', type: 'domestic', website: 'https://www.deppon.com' },
  { id: 'ky', name: '跨越速运', code: 'KY', type: 'domestic', website: 'https://www.ky-express.com' },
  { id: 'ane', name: '安能物流', code: 'ANE', type: 'domestic', website: 'https://www.ane56.com' },
  { id: 'zt', name: '中通快递', code: 'ZT', type: 'domestic', website: 'https://www.zto.com' },
  { id: 'jd', name: '京东物流', code: 'JD', type: 'domestic', website: 'https://www.jdl.com' },
  { id: 'dhl', name: 'DHL Express', code: 'DHL', type: 'international', website: 'https://www.dhl.com' },
  { id: 'fedex', name: 'FedEx', code: 'FX', type: 'international', website: 'https://www.fedex.com' },
  { id: 'ups', name: 'UPS', code: 'UPS', type: 'international', website: 'https://www.ups.com' },
  { id: 'tnt', name: 'TNT Express', code: 'TNT', type: 'international', website: 'https://www.tnt.com' },
]

interface TrackingEvent {
  time: string; location: string; description: string; status: 'picked' | 'transit' | 'out_for_delivery' | 'delivered' | 'exception'
}

// Simulated tracking data
const MOCK_TRACKING: Record<string, { carrier: string; events: TrackingEvent[] }> = {
  'SF1234567890': {
    carrier: 'SF',
    events: [
      { time: '2026-06-05 10:30', location: '苏州市吴中区集散中心', description: '快件已揽收', status: 'picked' },
      { time: '2026-06-05 18:00', location: '苏州转运中心', description: '快件离开苏州，发往深圳', status: 'transit' },
      { time: '2026-06-06 08:00', location: '深圳转运中心', description: '快件到达深圳转运中心', status: 'transit' },
      { time: '2026-06-06 14:20', location: '深圳市宝安区福永营业部', description: '快件正在派送中', status: 'out_for_delivery' },
      { time: '2026-06-06 16:45', location: '深圳市宝安区福永街道', description: '快件已签收，签收人：王芳', status: 'delivered' },
    ],
  },
  'SF0987654321': {
    carrier: 'SF',
    events: [
      { time: '2026-05-22 08:30', location: '深圳市宝安区', description: '客户退回快件已揽收', status: 'picked' },
      { time: '2026-05-23 12:00', location: '苏州转运中心', description: '退回快件到达苏州', status: 'transit' },
      { time: '2026-05-23 15:00', location: '苏州市工业园区', description: '退回快件已签收，签收人：仓储部', status: 'delivered' },
    ],
  },
}

const TRACKING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  picked: { label: '已揽收', color: 'bg-blue-50 text-blue-700' },
  transit: { label: '运输中', color: 'bg-amber-50 text-amber-700' },
  out_for_delivery: { label: '派送中', color: 'bg-brand-50 text-brand-700' },
  delivered: { label: '已签收', color: 'bg-green-50 text-green-700' },
  exception: { label: '异常', color: 'bg-red-50 text-red-700' },
}

// ─── Types ────────────────────────────────────────

type ReturnType = 'return' | 'exchange'
type ResolveMethod = 'refund_return' | 'no_refund_return' | 'exchange_only' | 'return_only'
type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'in_transit' | 'received' | 'refunded' | 'replaced' | 'completed'
type SalesDomain = 'domestic' | 'export'

interface ReturnOrder {
  id: string; code: string; domain: SalesDomain; type: ReturnType; resolveMethod: ResolveMethod
  orderId: string; orderCode: string; customerName: string; contactName: string; contactPhone: string
  productName: string; productCode: string; quantity: number
  reason: string; reasonCategory: string; description: string
  amount: number; status: ReturnStatus
  appliedAt: string; appliedBy: string; approvedAt: string; approvedBy: string
  shippedAt: string; trackingNo: string; refundedAt: string; refundAmount: number
  remark: string
  timeline: { time: string; action: string; operator: string; type?: 'apply' | 'approve' | 'reject' | 'logistics' | 'refund' }[]
}

// ─── Mock Data ────────────────────────────────────

const MOCK_RETURNS: ReturnOrder[] = [
  {
    id: 'r1', code: 'TH20260601001', domain: 'domestic', type: 'exchange', resolveMethod: 'exchange_only',
    orderId: 'ord1', orderCode: 'DD20260615001',
    customerName: '深圳鹏程电子有限公司', contactName: '王芳', contactPhone: '136****3456',
    productName: '制氢机 HPL03', productCode: 'HPL03', quantity: 1,
    reason: '设备运行时氢气纯度不达标，经技术排查确认为分子筛质量问题', reasonCategory: '质量问题',
    description: '客户反馈运行72小时后纯度降至99.95%（合同要求99.999%），已派工程师现场确认',
    amount: 128000, status: 'in_transit',
    appliedAt: '2026-06-01 09:30', appliedBy: '王芳',
    approvedAt: '2026-06-02 14:00', approvedBy: '刘世光',
    shippedAt: '2026-06-05 10:00', trackingNo: 'SF1234567890',
    refundedAt: '', refundAmount: 0,
    remark: '已安排换发新机，旧机退回分析。客户要求加急处理',
    timeline: [
      { time: '2026-06-01 09:30', action: '提交换货申请（仅换货，不涉及退款）', operator: '王芳', type: 'apply' },
      { time: '2026-06-01 16:00', action: '技术确认：分子筛质量问题，建议换机', operator: '张工程师' },
      { time: '2026-06-02 14:00', action: '审批通过，安排换货', operator: '刘世光', type: 'approve' },
      { time: '2026-06-05 10:00', action: '换发新机已发货，物流单号 SF1234567890', operator: '仓储部', type: 'logistics' },
    ],
  },
  {
    id: 'r2', code: 'TH20260612002', domain: 'domestic', type: 'return', resolveMethod: 'refund_return',
    orderId: 'ord2', orderCode: 'DD20260620001',
    customerName: '耐力股份有限公司', contactName: '冯韶楠', contactPhone: '138****6789',
    productName: '压缩空气过滤器 AF-200', productCode: 'AF-200', quantity: 2,
    reason: '客户项目方案变更，不需要该规格过滤器', reasonCategory: '客户原因',
    description: '客户原计划配套使用，后调整为集中供气方案',
    amount: 4400, status: 'pending',
    appliedAt: '2026-06-12 15:00', appliedBy: '冯韶楠',
    approvedAt: '', approvedBy: '', shippedAt: '', trackingNo: '',
    refundedAt: '', refundAmount: 4400,
    remark: '产品未拆封，客户要求退货退款',
    timeline: [
      { time: '2026-06-12 15:00', action: '提交退货退款申请', operator: '冯韶楠', type: 'apply' },
    ],
  },
  {
    id: 'r3', code: 'TH20260620003', domain: 'export', type: 'return', resolveMethod: 'no_refund_return',
    orderId: 'ord3', orderCode: 'EX20260610001',
    customerName: 'Cairo Oxygen Systems S.A.E.', contactName: 'Ahmed Hassan', contactPhone: '+20 100 123 4567',
    productName: '碳分子筛 CMS-240', productCode: 'CMS-240', quantity: 50,
    reason: '客户反馈吸附效率下降，经检测部分批号活性不达标', reasonCategory: '质量问题',
    description: '客户退回50kg活性不合格批次，但不要求退款，仅需补发合格品',
    amount: 4250, status: 'pending',
    appliedAt: '2026-06-20 08:00', appliedBy: 'Ahmed Hassan',
    approvedAt: '', approvedBy: '', shippedAt: '', trackingNo: '',
    refundedAt: '', refundAmount: 0,
    remark: '外销客户同意退货不退款，仅要求补发。需走审批确认',
    timeline: [
      { time: '2026-06-20 08:00', action: '提交退货不退款申请（仅退货，补发合格品）', operator: 'Ahmed Hassan', type: 'apply' },
    ],
  },
  {
    id: 'r4', code: 'TH20260520004', domain: 'domestic', type: 'return', resolveMethod: 'refund_return',
    orderId: 'ord1', orderCode: 'DD20260615001',
    customerName: '深圳鹏程电子有限公司', contactName: '周强', contactPhone: '135****4567',
    productName: '气动蝶阀 DN25', productCode: 'DN25-001', quantity: 1,
    reason: '发货规格与订单不符（收到DN32而非DN25）', reasonCategory: '发货错误',
    description: '仓库核对确认发货清单与实物不一致，为仓库拣货错误',
    amount: 2800, status: 'completed',
    appliedAt: '2026-05-20 11:00', appliedBy: '周强',
    approvedAt: '2026-05-20 15:30', approvedBy: '刘世光',
    shippedAt: '2026-05-22 08:00', trackingNo: 'SF0987654321',
    refundedAt: '2026-05-28 16:00', refundAmount: 2800,
    remark: '已退款并补发正确规格产品，仓库已更新拣货流程',
    timeline: [
      { time: '2026-05-20 11:00', action: '提交退货退款申请', operator: '周强', type: 'apply' },
      { time: '2026-05-20 15:30', action: '审批通过，确认为仓库错误，同意退货退款', operator: '刘世光', type: 'approve' },
      { time: '2026-05-22 08:00', action: '客户退回货物已签收', operator: '仓储部', type: 'logistics' },
      { time: '2026-05-23 10:00', action: '补发正确规格 DN25 产品', operator: '仓储部' },
      { time: '2026-05-28 16:00', action: '退款 ¥2,800 已到账', operator: '财务部', type: 'refund' },
    ],
  },
  {
    id: 'r5', code: 'TH20260618005', domain: 'export', type: 'exchange', resolveMethod: 'exchange_only',
    orderId: 'ord4', orderCode: 'EX20260515001',
    customerName: 'Sao Paulo Industrial Gases Ltda', contactName: 'Maria Silva', contactPhone: '+55 11 98765 4321',
    productName: '制氧机 OPL05', productCode: 'OPL05', quantity: 1,
    reason: '运输途中设备外壳受损，功能正常但外观影响客户验收', reasonCategory: '运输损坏',
    description: '海运途中集装箱碰撞导致外壳凹陷，已与货代确认责任',
    amount: 68000, status: 'approved',
    appliedAt: '2026-06-18 16:00', appliedBy: 'Maria Silva',
    approvedAt: '2026-06-19 10:00', approvedBy: '刘世光',
    shippedAt: '', trackingNo: '', refundedAt: '', refundAmount: 0,
    remark: '已协调货代保险理赔，同时安排换发新外壳组件。不涉及退款',
    timeline: [
      { time: '2026-06-18 16:00', action: '提交换货申请（仅换外壳，不退款）', operator: 'Maria Silva', type: 'apply' },
      { time: '2026-06-19 10:00', action: '审批通过，走货代保险 + 换发外壳', operator: '刘世光', type: 'approve' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────

const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '已审批', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejected: { label: '已驳回', color: 'bg-red-50 text-red-700 border-red-200' },
  in_transit: { label: '物流中', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  received: { label: '已收货', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refunded: { label: '已退款', color: 'bg-green-50 text-green-700 border-green-200' },
  replaced: { label: '已换发', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  completed: { label: '已完成', color: 'bg-green-50 text-green-700 border-green-200' },
}

const RESOLVE_LABELS: Record<ResolveMethod, string> = {
  refund_return: '退货退款',
  no_refund_return: '退货不退款',
  exchange_only: '仅换货',
  return_only: '仅退货',
}

const RESOLVE_COLORS: Record<ResolveMethod, string> = {
  refund_return: 'bg-red-50 text-red-700',
  no_refund_return: 'bg-orange-50 text-orange-700',
  exchange_only: 'bg-blue-50 text-blue-700',
  return_only: 'bg-gray-50 text-gray-600',
}

const TIMELINE_ICONS: Record<string, string> = {
  apply: 'bg-amber-400', approve: 'bg-green-500', reject: 'bg-red-500', logistics: 'bg-blue-400', refund: 'bg-emerald-500',
}

const STEPS = ['apply', 'approve', 'logistics', 'refund'] as const

// ─── Component ────────────────────────────────────

export default function ReturnOrders() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [domainFilter, setDomainFilter] = useState<string>('全部')
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showLogistics, setShowLogistics] = useState(false)
  const [logisticsInput, setLogisticsInput] = useState({ carrier: '', trackingNo: '' })

  const filtered = MOCK_RETURNS.filter(r => {
    if (statusFilter !== '全部' && r.status !== statusFilter) return false
    if (domainFilter !== '全部' && r.domain !== domainFilter) return false
    if (search && !r.customerName.includes(search) && !r.code.includes(search)) return false
    return true
  })

  const getCurrentStep = (status: ReturnStatus): number => {
    switch (status) {
      case 'pending': return 0
      case 'approved': return 1
      case 'rejected': return -1
      case 'in_transit': case 'replaced': return 2
      case 'received': case 'refunded': return 3
      case 'completed': return 3
      default: return 0
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
            <RefreshCw size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">退换货管理</h1>
            <p className="text-xs text-gray-500">内销外销统一 · 退货退款/退货不退款/换货 · 全部必须走审批流</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> 新建退换货
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { key: '全部', label: '全部', count: MOCK_RETURNS.length },
          { key: 'pending', label: '待审批', count: MOCK_RETURNS.filter(r => r.status === 'pending').length },
          { key: 'approved', label: '已审批', count: MOCK_RETURNS.filter(r => r.status === 'approved').length },
          { key: 'in_transit', label: '物流中', count: MOCK_RETURNS.filter(r => r.status === 'in_transit').length },
          { key: 'refunded', label: '已退款', count: MOCK_RETURNS.filter(r => r.status === 'refunded').length },
          { key: 'completed', label: '已完成', count: MOCK_RETURNS.filter(r => r.status === 'completed').length },
        ].map(s => (
          <button key={s.key} onClick={() => { setStatusFilter(s.key); setSelectedOrder(null) }}
            className={`card !p-3 text-left transition-all ${statusFilter === s.key ? 'ring-2 ring-brand-300' : ''}`}>
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-xl font-bold text-gray-800 mt-0.5">{s.count}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand-400" placeholder="搜索客户/单号..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setDomainFilter('全部')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${domainFilter === '全部' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 border'}`}>全部</button>
          <button onClick={() => setDomainFilter('domestic')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${domainFilter === 'domestic' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 border'}`}><Flag size={10} /> 内销</button>
          <button onClick={() => setDomainFilter('export')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${domainFilter === 'export' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 border'}`}><Globe size={10} /> 外销</button>
        </div>
      </div>

      {/* List + Detail */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table */}
        <div className={`${selectedOrder ? 'lg:w-7/12' : 'w-full'} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-xs text-gray-500">单号</th>
                <th className="text-left py-3 px-2 text-xs text-gray-500">客户</th>
                <th className="text-center py-3 px-2 text-xs text-gray-500">域</th>
                <th className="text-center py-3 px-2 text-xs text-gray-500">处理方式</th>
                <th className="text-center py-3 px-2 text-xs text-gray-500">原因</th>
                <th className="text-center py-3 px-2 text-xs text-gray-500">审批</th>
                <th className="text-center py-3 px-2 text-xs text-gray-500">状态</th>
                <th className="text-right py-3 px-2 text-xs text-gray-500">金额</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelectedOrder(r)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedOrder?.id === r.id ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-2">
                    <div className="text-xs font-medium text-gray-800">{r.code}</div>
                    <div className="text-[10px] text-gray-400">{r.appliedAt.slice(5)}</div>
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-700 max-w-[120px] truncate">{r.customerName}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${r.domain === 'domestic' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {r.domain === 'domestic' ? <><Flag size={8} /> 内销</> : <><Globe size={8} /> 外销</>}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${RESOLVE_COLORS[r.resolveMethod]}`}>{RESOLVE_LABELS[r.resolveMethod]}</span>
                  </td>
                  <td className="py-3 px-2 text-center text-[10px] text-gray-500">{r.reasonCategory}</td>
                  <td className="py-3 px-2 text-center">
                    {r.status === 'pending' ? (
                      <span className="text-[10px] text-amber-600 font-medium">待刘世光审批</span>
                    ) : r.status === 'rejected' ? (
                      <span className="text-[10px] text-red-500">{r.approvedBy} 驳回</span>
                    ) : (
                      <span className="text-[10px] text-green-600">{r.approvedBy} 已批</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CONFIG[r.status].color}`}>{STATUS_CONFIG[r.status].label}</span>
                  </td>
                  <td className="py-3 px-2 text-right text-xs font-mono text-gray-700">¥{r.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedOrder && (
          <div className="lg:w-5/12">
            <div className="card !p-0 overflow-hidden sticky top-4">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{selectedOrder.code}</h3>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${selectedOrder.domain === 'domestic' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {selectedOrder.domain === 'domestic' ? <><Flag size={7} /> 内销</> : <><Globe size={7} /> 外销</>}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_CONFIG[selectedOrder.status].color}`}>{STATUS_CONFIG[selectedOrder.status].label}</span>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Resolve Method + Amount */}
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${RESOLVE_COLORS[selectedOrder.resolveMethod]}`}>
                    {RESOLVE_LABELS[selectedOrder.resolveMethod]}
                  </span>
                  <span className="text-sm font-bold text-gray-800">¥{selectedOrder.amount.toLocaleString()}</span>
                </div>

                {/* Customer */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoRow label="客户" value={selectedOrder.customerName} />
                  <InfoRow label="联系人" value={selectedOrder.contactName + ' ' + selectedOrder.contactPhone} />
                  <InfoRow label="关联订单" value={selectedOrder.orderCode} />
                  <InfoRow label="产品" value={selectedOrder.productName + ' ×' + selectedOrder.quantity} />
                </div>

                {/* Reason */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-1 ${selectedOrder.reasonCategory === '质量问题' ? 'bg-red-100 text-red-700' : selectedOrder.reasonCategory === '发货错误' ? 'bg-amber-100 text-amber-700' : selectedOrder.reasonCategory === '运输损坏' ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-600'}`}>{selectedOrder.reasonCategory}</span>
                  <div className="text-xs text-gray-700">{selectedOrder.reason}</div>
                  {selectedOrder.description && <div className="text-[11px] text-gray-400 mt-1">{selectedOrder.description}</div>}
                </div>

                {/* Tracking + Remark */}
                {selectedOrder.trackingNo && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-brand-50 rounded-lg text-xs cursor-pointer" onClick={() => setShowLogistics(!showLogistics)}>
                      <Truck size={12} className="text-brand-500" />
                      <span className="text-brand-700 font-medium">{MOCK_TRACKING[selectedOrder.trackingNo]?.carrier || '物流'} {selectedOrder.trackingNo}</span>
                      <ChevronDown size={12} className={`ml-auto text-brand-400 transition-transform ${showLogistics ? 'rotate-180' : ''}`} />
                    </div>
                    {showLogistics && MOCK_TRACKING[selectedOrder.trackingNo] && (
                      <div className="border border-brand-100 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-brand-50/50 border-b border-brand-50 flex justify-between items-center text-xs">
                          <span className="font-medium text-gray-700">物流轨迹</span>
                          <a href="#" className="text-brand-500 hover:underline text-[10px]">官网查询 <ExternalLink size={8} className="inline" /></a>
                        </div>
                        <div className="px-3 py-2 space-y-0">
                          {MOCK_TRACKING[selectedOrder.trackingNo].events.map((evt, idx) => {
                            const isLast = idx === MOCK_TRACKING[selectedOrder.trackingNo].events.length - 1
                            return (
                              <div key={idx} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 ${isLast ? 'bg-brand-500 ring-2 ring-brand-200' : 'bg-green-400'}`} />
                                  {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-0.5" />}
                                </div>
                                <div className="pb-2">
                                  <div className="text-[11px] text-gray-700">{evt.description}</div>
                                  <div className="flex items-center gap-2 text-[9px] text-gray-400">
                                    <MapPin size={8} />{evt.location}<span>·</span>{evt.time}
                                    <span className={`px-1 py-0.5 rounded text-[8px] ${TRACKING_STATUS_MAP[evt.status].color}`}>{TRACKING_STATUS_MAP[evt.status].label}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Logistics Input — approved but no tracking yet */}
                {(selectedOrder.status === 'approved' || selectedOrder.status === 'in_transit') && !selectedOrder.trackingNo && (
                  <div className="p-3 bg-brand-50 rounded-lg space-y-2">
                    <div className="text-xs font-medium text-brand-700 flex items-center gap-1.5"><Truck size={12} /> 录入物流信息</div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={logisticsInput.carrier} onChange={e => setLogisticsInput(prev => ({ ...prev, carrier: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-brand-200 rounded text-xs bg-white">
                        <option value="">选择物流公司</option>
                        <optgroup label="国内">{[{id:'ky',name:'跨越速运(推荐)'},{id:'sf',name:'顺丰速运'},{id:'db',name:'德邦快递'},{id:'ane',name:'安能物流'},{id:'zt',name:'中通快递'},{id:'jd',name:'京东物流'}].map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                        <optgroup label="国际">{[{id:'dhl',name:'DHL Express'},{id:'fedex',name:'FedEx'},{id:'ups',name:'UPS'},{id:'tnt',name:'TNT Express'}].map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                      </select>
                      <input className="w-full px-2 py-1.5 border border-brand-200 rounded text-xs bg-white" placeholder="物流单号" value={logisticsInput.trackingNo} onChange={e => setLogisticsInput(prev => ({ ...prev, trackingNo: e.target.value }))} />
                    </div>
                    <button disabled={!logisticsInput.carrier || !logisticsInput.trackingNo}
                      className="w-full py-1.5 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400">
                      确认发货 & 开始跟踪物流
                    </button>
                  </div>
                )}

                {selectedOrder.remark && (
                  <div className="text-[11px] text-gray-500 px-2 py-1.5 bg-gray-50 rounded">{selectedOrder.remark}</div>
                )}

                {/* Action Buttons — based on status */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <button className="btn-primary text-xs flex items-center gap-1 px-3 py-2">✓ 审批通过</button>
                      <button className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">✗ 驳回</button>
                    </>
                  )}
                  {selectedOrder.status === 'approved' && selectedOrder.type === 'exchange' && (
                    <button className="btn-primary text-xs flex items-center gap-1 px-3 py-2"><Truck size={12} /> 录入物流发货</button>
                  )}
                  {selectedOrder.status === 'approved' && selectedOrder.type === 'return' && (
                    <button className="btn-primary text-xs flex items-center gap-1 px-3 py-2">通知客户退回 & 提供退运单号</button>
                  )}
                  {selectedOrder.status === 'received' && selectedOrder.resolveMethod === 'refund_return' && (
                    <button className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium">确认退款 ¥{selectedOrder.amount.toLocaleString()}</button>
                  )}
                  {selectedOrder.status === 'in_transit' && (
                    <button className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium">确认收货</button>
                  )}
                </div>
              </div>

              {/* Approval Progress Bar */}
              <div className="border-t border-gray-100 px-4 py-3">
                <h4 className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Shield size={12} /> 审批进度
                </h4>
                <div className="flex items-center">
                  {STEPS.map((step, idx) => {
                    const currentStep = getCurrentStep(selectedOrder.status)
                    const isDone = currentStep > idx || (step === 'apply' && selectedOrder.status !== 'pending')
                    const isCurrent = currentStep === idx && selectedOrder.status !== 'rejected'
                    const isRejected = selectedOrder.status === 'rejected' && step === 'approve'
                    const labels = ['提交申请', '审批', '物流处理', '退款/完成']
                    return (
                      <div key={step} className="flex-1 flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${isRejected ? 'bg-red-500 text-white' : isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-gray-200 text-gray-400'}`}>
                            {isRejected ? '✗' : isDone ? '✓' : idx + 1}
                          </div>
                          <div className={`text-[9px] mt-1 ${isRejected ? 'text-red-500 font-medium' : isCurrent ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                            {isRejected ? '已驳回' : labels[idx]}
                          </div>
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mt-[-8px] ${isDone ? 'bg-green-400' : isRejected && idx === 0 ? 'bg-red-300' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rejected message */}
                {selectedOrder.status === 'rejected' && (
                  <div className="mt-3 p-2.5 bg-red-50 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">审批驳回</span> — 驳回原因将显示在此处，申请人需重新提交
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="border-t px-4 py-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">处理时间轴</h4>
                <div className="space-y-0">
                  {selectedOrder.timeline.map((t, idx) => {
                    const isLast = idx === selectedOrder.timeline.length - 1
                    const dotColor = t.type ? TIMELINE_ICONS[t.type] : 'bg-gray-300'
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5`} />
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-0.5" />}
                        </div>
                        <div className="pb-2">
                          <div className="text-xs text-gray-700">{t.action}</div>
                          <div className="text-[10px] text-gray-400">{t.time} · {t.operator}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── New Return Form Modal ── */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="text-base font-semibold text-gray-800">新建退换货申请</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Domain */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">销售域</label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white"><Flag size={14} className="inline mr-1" />内销</button>
                    <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border text-gray-500"><Globe size={14} className="inline mr-1" />外销</button>
                  </div>
                </div>

                {/* Resolve Method */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">处理方式 <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['refund_return', 'no_refund_return', 'exchange_only', 'return_only'] as ResolveMethod[]).map(m => (
                      <button key={m} className={`px-3 py-2 rounded-lg text-xs font-medium border ${m === 'refund_return' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {RESOLVE_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">关联订单 <span className="text-red-400">*</span></label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option>DD20260615001 — 深圳鹏程电子有限公司</option>
                    <option>DD20260620001 — 耐力股份有限公司</option>
                  </select>
                </div>

                {/* Product */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">产品</label>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option>制氢机 HPL03</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">数量</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" type="number" defaultValue={1} />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">原因分类 <span className="text-red-400">*</span></label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option>质量问题</option><option>发货错误</option><option>客户原因</option><option>运输损坏</option><option>其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">详细说明</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="描述退换货原因..." />
                </div>

                {/* Approval Notice */}
                <div className="p-3 bg-amber-50 rounded-lg flex items-start gap-2 text-xs text-amber-700">
                  <Shield size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">审批流程</span>
                    <p className="mt-0.5">提交后 → 销售主管审批 → 审批通过后安排退货/换货/退款</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Save size={14} /> 提交申请
                  </button>
                  <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">取消</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-xs text-gray-700 truncate">{value}</div>
    </div>
  )
}
