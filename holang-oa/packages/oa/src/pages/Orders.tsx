import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Pencil, Loader2, Calendar, MapPin, Building2, Hash } from 'lucide-react'
import { getOrders, type Order } from '../services/orderService'
import { useI18n } from '../i18n/I18nContext'
import { isCurrentUserAdmin } from '../services/rbacStore'
import { useAuth } from '../contexts/AuthContext'

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

// 内销/外销 域标识徽章（逐条清晰可辨，避免混淆）
const salesTypeBadge = (st: string) => {
  const isExport = st === 'EXTERNAL'
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${isExport ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
      {isExport ? '外销' : '内销'}
    </span>
  )
}

// 入职年限 → 可见年数（null 表示不受限，显示全部历史年份）
// 规则：第1年看当年；第2年看当年+去年；第3年+看最近「工龄」年（依此逐年回溯，最终覆盖全部历史）
// 注：User.hireDate（入职时间）字段待补，当前无数据 → 返回 null（显示全部），补字段后传 user?.hireDate 即自动生效
function calcWorkYears(hireDate?: string): number | null {
  if (!hireDate) return null
  const hire = new Date(hireDate)
  if (isNaN(hire.getTime())) return null
  const now = new Date()
  let y = now.getFullYear() - hire.getFullYear()
  const m = now.getMonth() - hire.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < hire.getDate())) y--
  return Math.max(1, y)
}

const getStatusKey = (s: string): string => {
  if (orderStatusColors[s]) return s
  const lower = s.toLowerCase()
  if (orderStatusColors[lower]) return lower
  return 'PENDING'
}

export default function Orders() {
  const navigate = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const { t } = useI18n()
  const { user } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 快速筛选
  const [companySearch, setCompanySearch] = useState('')   // 公司名称 / 简称
  const [orderCodeSearch, setOrderCodeSearch] = useState('') // 订单号
  const [country, setCountry] = useState<string>(salesType === 'INTERNAL' ? '中国' : '全部')
  const [activeYear, setActiveYear] = useState<string>('全部')
  // 省/市：Customer 暂无 province/city 字段，待后端补录后启用（见屏幕提示）
  const [province] = useState('全部')
  const [city] = useState('全部')

  // 入职年限（TODO: User.hireDate 字段补后改为 calcWorkYears(user?.hireDate)）
  const workYears = calcWorkYears(undefined)

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      // 一次拉全量（preview 数据量小），年份/筛选在前端做，先看实物效果
      const result = await getOrders({ page: 1, pageSize: 1000, salesType })
      setOrders(result.list)
    } catch {
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [salesType])

  const orderYear = (o: Order) => {
    const d = new Date(o.orderDate || o.createdAt)
    return isNaN(d.getTime()) ? '' : String(d.getFullYear())
  }

  // 主过滤
  const filtered = useMemo(() => orders.filter(o => {
    if (companySearch && !(o.customerName || '').toLowerCase().includes(companySearch.toLowerCase())) return false
    if (orderCodeSearch && !(o.code || '').toLowerCase().includes(orderCodeSearch.toLowerCase())) return false
    // 国家：内销默认中国；外销按选中国
    const oCountry = o.country || (salesType === 'INTERNAL' ? '中国' : '')
    if (country !== '全部' && oCountry !== country) return false
    // 省/市：待 Customer.province/city 字段补后接入
    return true
  }), [orders, companySearch, orderCodeSearch, country, salesType])

  const currentYear = new Date().getFullYear()
  // 入职年限决定的可见年份集合（null=全部）
  const visibleYears = useMemo(() => {
    if (workYears === null) return null
    const s = new Set<string>()
    for (let i = 0; i < workYears; i++) s.add(String(currentYear - i))
    return s
  }, [workYears])

  // 按年份分组
  const grouped = useMemo(() => {
    const m = new Map<string, Order[]>()
    filtered.forEach(o => {
      const y = orderYear(o)
      if (!y) return
      if (visibleYears && !visibleYears.has(y)) return
      if (activeYear !== '全部' && activeYear !== y) return
      if (!m.has(y)) m.set(y, [])
      m.get(y)!.push(o)
    })
    return Array.from(m.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [filtered, visibleYears, activeYear])

  const allYears = useMemo(() => {
    const s = new Set(filtered.map(orderYear).filter(Boolean))
    return Array.from(s).sort((a, b) => Number(b) - Number(a))
  }, [filtered])

  const countryOptions = useMemo(() => {
    const s = new Set<string>()
    filtered.forEach(o => s.add(o.country || (salesType === 'INTERNAL' ? '中国' : '')))
    return Array.from(s).filter(Boolean).sort()
  }, [filtered, salesType])

  const totalAmount = filtered.reduce((s, o) => s + (o.amount || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{salesType === 'INTERNAL' ? '内销' : '外销'}订单管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            共 {filtered.length} 条
            {user?.name ? ` · 当前用户：${user.name}` : ''}
            {workYears === null
              ? ' · 入职时间未录入，按订单年度逐年单独显示'
              : ` · 入职第 ${workYears} 年，可见近 ${workYears} 年`}
          </p>
        </div>
        <button onClick={() => navigate(`${basePath}/orders/new`)} className="btn-primary text-sm inline-flex items-center gap-1.5">
          <Plus size={16} /> 新建订单
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="card flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="按公司名称 / 简称筛选"
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="按订单号筛选"
              value={orderCodeSearch}
              onChange={e => setOrderCodeSearch(e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {/* 国家 */}
          {salesType === 'INTERNAL' ? (
            <select value={country} onChange={e => setCountry(e.target.value)} className="input text-sm py-1 w-auto">
              <option value="中国">中国（默认）</option>
            </select>
          ) : (
            <select value={country} onChange={e => setCountry(e.target.value)} className="input text-sm py-1 w-auto">
              <option value="全部">全部国家</option>
              {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {/* 省/市：占位，待补字段 */}
          <select value={province} disabled className="input text-sm py-1 w-auto opacity-60" title="待后端补充 Customer.province 字段">
            <option>省份（待补录）</option>
          </select>
          <select value={city} disabled className="input text-sm py-1 w-auto opacity-60" title="待后端补充 Customer.city 字段">
            <option>城市（待补录）</option>
          </select>
          {salesType === 'INTERNAL' && (
            <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
              <MapPin size={12} />内销固定中国，按省/市筛选待数据补录
            </span>
          )}
        </div>
      </div>

      {/* 年份快捷筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar size={14} className="text-gray-400 shrink-0" />
        <button
          onClick={() => setActiveYear('全部')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${activeYear === '全部' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}
        >全部年份</button>
        {allYears.map(y => {
          const disabled = visibleYears !== null && !visibleYears.has(y)
          return (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              disabled={disabled}
              className={`px-3 py-1 rounded-full text-xs font-medium ${activeYear === y ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >{y}年</button>
          )
        })}
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

      {/* 年度卡片 */}
      {!loading && !error && grouped.map(([year, list]) => (
        <div key={year} className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              {year} 年订单 <span className="text-sm font-normal text-gray-400">（{list.length} 笔）</span>
            </h2>
            <span className="text-sm text-brand-600 font-semibold">
              ¥{list.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="space-y-3">
            {list.map(o => (
              <div
                key={o.id}
                onClick={() => navigate(`${basePath}/orders/${o.id}`)}
                className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-gray-500">{o.code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusColors[getStatusKey(o.status)]}`}>
                    {orderStatusLabels[getStatusKey(o.status)]}
                  </span>
                  {salesTypeBadge(salesType)}
                  {o.country && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{o.country}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-1 truncate">{o.customerName || o.customerId}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>下单：{o.orderDate ? new Date(o.orderDate).toLocaleDateString('zh-CN') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('zh-CN') : '-')}</span>
                      <span>{o.salesPerson}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-lg font-bold text-brand-600">¥{(o.amount || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); navigate(`${basePath}/customers/${o.customerId}`) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="查看客户">
                        <Eye size={15} />
                      </button>
                      {isCurrentUserAdmin() && (
                        <button onClick={e => { e.stopPropagation(); navigate(`${basePath}/orders/${o.id}/edit`) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="编辑">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && !error && grouped.length === 0 && (
        <div className="card text-center py-12 text-gray-400">暂无符合条件的订单</div>
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
            <div className="text-lg font-bold text-brand-600 mt-0.5">¥{totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">年份数</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{allYears.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">可见年份</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{visibleYears ? visibleYears.size : '全部'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
