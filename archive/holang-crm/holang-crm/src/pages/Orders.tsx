import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react'
import { orders, customers } from '../data/mockData'
import { Order } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'
import { isCurrentUserAdmin } from '../services/rbacStore'

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

export default function Orders() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [sortField, setSortField] = useState<keyof Order>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const allStatuses = ['全部', ...Array.from(new Set(orders.map(o => o.status)))]

  const filtered = orders
    .filter(o => {
      if (statusFilter !== '全部' && o.status !== statusFilter) return false
      if (search) {
        const cid = o.customerId.toLowerCase()
        const cname = customers.find(c => c.id === o.customerId)?.name.toLowerCase() || ''
        const code = o.code.toLowerCase()
        const kw = search.toLowerCase()
        return cid.includes(kw) || cname.includes(kw) || code.includes(kw)
      }
      return true
    })
    .sort((a, b) => {
      const av = a[sortField]; const bv = b[sortField]
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string)
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      return 0
    })

  const getCustomerName = (cid: string) => customers.find(c => c.id === cid)?.name || cid

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">订单管理</h1>
        <button onClick={() => navigate('/domestic/orders/new')} className="btn-primary text-sm inline-flex items-center gap-1.5">
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
            onChange={e => setSearch(e.target.value)}
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

      {/* List */}
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[o.status]}`}>{orderStatusLabels[o.status]}</span>
                    {o.businessLine && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{o.businessLine === 'industrial' ? '工业' : o.businessLine === 'retail' ? '零售' : 'OEM'}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1 truncate">{getCustomerName(o.customerId)}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>下单：{o.createdAt}</span>
                    <span>交付：{o.deliveryDate}</span>
                    <span>{o.salesPerson}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-brand-600">¥{o.amount.toLocaleString()}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/domestic/customers/${o.customerId}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="查看客户">
                      <Eye size={15} />
                    </button>
                    {isCurrentUserAdmin() && (
                      <button onClick={() => navigate(`/domestic/orders/${o.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="编辑">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">订单总数</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{filtered.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">订单总额</div>
          <div className="text-lg font-bold text-brand-600 mt-0.5">¥{filtered.reduce((s, o) => s + o.amount, 0).toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">待交付</div>
          <div className="text-lg font-bold text-yellow-600 mt-0.5">{filtered.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_production').length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">已交付</div>
          <div className="text-lg font-bold text-green-600 mt-0.5">{filtered.filter(o => o.status === 'delivered').length}</div>
        </div>
      </div>
    </div>
  )
}
