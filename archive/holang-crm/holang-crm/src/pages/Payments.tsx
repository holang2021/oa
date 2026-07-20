import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, ArrowUpDown, Eye, Pencil, Trash2, DollarSign } from 'lucide-react'
import { payments, customers, orders } from '../data/mockData'
import { Payment } from '../data/mockData'
import { useI18n } from '../i18n/I18nContext'
import { isCurrentUserAdmin } from '../services/rbacStore'

const paymentTypeLabels: Record<string, string> = { deposit: '定金', progress: '进度款', final: '尾款', retention: '质保金' }

export default function Payments() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [typeFilter, setTypeFilter] = useState<string>('全部')

  const allStatuses = ['全部', ...Array.from(new Set(payments.map(p => p.status)))]
  const allTypes = ['全部', ...Array.from(new Set(payments.map(p => p.type)))]

  const filtered = payments.filter(p => {
    if (statusFilter !== '全部' && p.status !== statusFilter) return false
    if (typeFilter !== '全部' && p.type !== typeFilter) return false
    if (search) {
      const cid = p.customerId.toLowerCase()
      const cname = customers.find(c => c.id === p.customerId)?.name.toLowerCase() || ''
      const ocode = orders.find(o => o.id === p.orderId)?.code.toLowerCase() || ''
      const code = p.code.toLowerCase()
      const kw = search.toLowerCase()
      return cid.includes(kw) || cname.includes(kw) || ocode.includes(kw) || code.includes(kw)
    }
    return true
  })

  const getCustomerName = (cid: string) => customers.find(c => c.id === cid)?.name || cid
  const getOrderCode = (oid: string) => orders.find(o => o.id === oid)?.code || oid

  const totalReceived = payments.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">回款管理</h1>
        <button onClick={() => navigate('/domestic/collections/new')} className="btn-primary text-sm inline-flex items-center gap-1.5">
          <Plus size={16} /> 新建回款
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">回款记录</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{filtered.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">已到账</div>
          <div className="text-lg font-bold text-green-600 mt-0.5">¥{totalReceived.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">待回款</div>
          <div className="text-lg font-bold text-orange-500 mt-0.5">¥{totalPending.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400">回款比例</div>
          <div className="text-lg font-bold text-brand-600 mt-0.5">
            {totalReceived + totalPending > 0 ? Math.round(totalReceived / (totalReceived + totalPending) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索客户、订单编号、回款编号..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {allTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {t === '全部' ? '全部类型' : paymentTypeLabels[t] || t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {allStatuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {s === '全部' ? '全部状态' : s === 'pending' ? '待回款' : '已到账'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">暂无回款记录</div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-500">{p.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{paymentTypeLabels[p.type]}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === 'received' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {p.status === 'received' ? '已到账' : '待回款'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1 truncate">{getCustomerName(p.customerId)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">订单：{getOrderCode(p.orderId)}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {p.plannedDate && <span>计划：{p.plannedDate}</span>}
                    {p.receivedDate && <span>到账：{p.receivedDate}</span>}
                    {p.paymentMethod && <span>{p.paymentMethod}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-lg font-bold ${p.status === 'received' ? 'text-green-600' : 'text-orange-500'}`}>
                    ¥{p.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {isCurrentUserAdmin() && (
                      <button onClick={() => navigate(`/domestic/collections/${p.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="编辑">
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
    </div>
  )
}
