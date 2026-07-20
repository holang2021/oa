import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Pencil, Trash2, DollarSign } from 'lucide-react'
import { getPayments, type Payment } from '../services/paymentService'
import { useI18n } from '../i18n/I18nContext'
import { isCurrentUserAdmin } from '../services/rbacStore'

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
  return status === 'RECEIVED' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
}

export default function Payments() {
  const navigate = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [typeFilter, setTypeFilter] = useState<string>('全部')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getPayments({ pageSize: 500, salesType })
      setPayments(result.list)
    } catch {
      setError('加载回款数据失败')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const allStatuses = ['全部', ...Array.from(new Set(payments.map(p => getStatusLabel(p.status))))]
  const allTypes = ['全部', ...Array.from(new Set(payments.map(p => paymentTypeLabels[p.type || ''] || p.type || '')))]

  const filtered = payments.filter(p => {
    if (statusFilter !== '全部' && getStatusLabel(p.status) !== statusFilter) return false
    if (typeFilter !== '全部' && (paymentTypeLabels[p.type || ''] || p.type || '') !== typeFilter) return false
    if (search) {
      const kw = search.toLowerCase()
      const cname = (p.customer?.companyName || '').toLowerCase()
      const ocode = (p.order?.orderCode || '').toLowerCase()
      const code = (p.paymentCode || '').toLowerCase()
      return cname.includes(kw) || ocode.includes(kw) || code.includes(kw)
    }
    return true
  })

  const totalReceived = filtered.filter(p => p.status === 'RECEIVED').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPending = filtered.filter(p => p.status === 'PENDING').reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">回款管理</h1>
        <button onClick={() => navigate(`${basePath}/collections/new`)} className="btn-primary text-sm inline-flex items-center gap-1.5">
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
              {t === '全部' ? '全部类型' : t}
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
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && <div className="card text-center py-12 text-gray-400">加载中...</div>}
        {error && <div className="card text-center py-12 text-red-500">{error}</div>}
        {!loading && !error && filtered.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">暂无回款记录</div>
        ) : (
          !loading && !error && filtered.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`${basePath}/collections/${p.id}`)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-500">{p.paymentCode || '-'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{paymentTypeLabels[p.type || ''] || p.type || '-'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1 truncate">{p.customer?.companyName || '-'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">订单：{p.order?.orderCode || '-'}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {p.plannedDate && <span>计划：{p.plannedDate.slice(0, 10)}</span>}
                    {p.receivedDate && <span>到账：{p.receivedDate.slice(0, 10)}</span>}
                    {p.paymentMethod && <span>{p.paymentMethod}</span>}
                  </div>
                </div>
                  <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-lg font-bold ${p.status === 'RECEIVED' ? 'text-green-600' : 'text-orange-500'}`}>
                    ¥{(p.amount || 0).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`${basePath}/collections/${p.id}`)} className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600" title="查看明细">
                      <Eye size={14} />
                    </button>
                    {isCurrentUserAdmin() && (
                      <button onClick={() => navigate(`${basePath}/collections/${p.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="编辑">
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
