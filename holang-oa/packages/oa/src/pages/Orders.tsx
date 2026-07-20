import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Pencil, Trash2, Loader2 } from 'lucide-react'
import { getOrders, type Order } from '../services/orderService'
import { useI18n } from '../i18n/I18nContext'
import { isCurrentUserAdmin } from '../services/rbacStore'

const orderStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-50 text-gray-600',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PRODUCTION: 'bg-yellow-50 text-yellow-700',
  SHIPPED: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
  pending: 'bg-gray-50 text-gray-600',
  confirmed: 'bg-blue-50 text-blue-700',
  in_production: 'bg-yellow-50 text-yellow-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}
const orderStatusLabels: Record<string, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  IN_PRODUCTION: '生产中',
  SHIPPED: '已发货',
  DELIVERED: '已交付',
  CANCELLED: '已取消',
  pending: '待确认',
  confirmed: '已确认',
  in_production: '生产中',
  shipped: '已发货',
  delivered: '已交付',
  cancelled: '已取消',
}

export default function Orders() {
  const navigate = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [page, setPage] = useState(1)

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getOrders({ page, pageSize: 50, search, salesType })
      setOrders(result.list)
    } catch {
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [page, search])

  // 前端状态筛选（后端暂不过滤时用）
  const allStatuses = ['全部', ...Array.from(new Set(orders.map(o => o.status)))]

  const getStatusKey = (s: string): string => {
    if (orderStatusColors[s]) return s
    const lower = s.toLowerCase()
    if (orderStatusColors[lower]) return lower
    return 'PENDING'
  }

  // 前端过滤（后端不支持时）
  const filtered = statusFilter === '全部' ? orders : orders.filter(o => o.status === statusFilter)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">订单管理 ({orders.length}条)</h1>
        <button onClick={() => navigate(`${basePath}/orders/new`)} className="btn-primary text-sm inline-flex items-center gap-1.5">
          <Plus size={16} /> 新建订单
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索客户、订单编号..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {allStatuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {s === '全部' ? '全部' : orderStatusLabels[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> 加载中...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card text-center py-8 text-red-500">{error}</div>
      )}

      {/* List */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">暂无订单</div>
          ) : (
            filtered.map(o => (
              <div key={o.id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-gray-500">{o.code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[getStatusKey(o.status)]}`}>{orderStatusLabels[getStatusKey(o.status)]}</span>
                      {o.businessLine && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{o.businessLine === 'INDUSTRIAL' ? '工业' : o.businessLine === 'RETAIL' ? '零售' : o.businessLine}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-1 truncate">{o.customerName || o.customerId}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>下单：{o.createdAt ? new Date(o.createdAt).toLocaleDateString('zh-CN') : ''}</span>
                      <span>交付：{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('zh-CN') : '-'}</span>
                      <span>{o.salesPerson}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-lg font-bold text-brand-600">¥{(o.amount || 0).toLocaleString()}</span>
                    <span className="text-[11px] text-gray-400">未税 ¥{((o.amountWithoutTax || Math.round((o.amount || 0) / (1 + (o.taxRate || 0) / 100) * 100) / 100)).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`${basePath}/customers/${o.customerId}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="查看客户">
                        <Eye size={15} />
                      </button>
                      {isCurrentUserAdmin() && (
                        <button onClick={() => navigate(`${basePath}/orders/${o.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="编辑">
                          <Pencil size={14} />
                        </button>
                      )}
                      {isCurrentUserAdmin() && (
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="删除">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">订单总数</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{filtered.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">订单总额</div>
            <div className="text-lg font-bold text-brand-600 mt-0.5">¥{filtered.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">待交付</div>
            <div className="text-lg font-bold text-yellow-600 mt-0.5">{filtered.filter(o => ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'pending', 'confirmed', 'in_production'].includes(o.status)).length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">已交付</div>
            <div className="text-lg font-bold text-green-600 mt-0.5">{filtered.filter(o => ['DELIVERED', 'delivered'].includes(o.status)).length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
