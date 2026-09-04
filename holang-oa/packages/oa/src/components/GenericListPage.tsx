import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Filter, Clock, Loader2 } from 'lucide-react'

export interface PageColumn {
  label: string
  key: string
  render?: (val: any, row: Record<string, any>) => React.ReactNode
  className?: string
  /** 移动端隐藏（仅桌面端显示） */
  hideMobile?: boolean
}

export interface PageFilter {
  key: string
  label: string
  options: { label: string; value: string }[]
}

export interface PageConfig {
  title: string
  subtitle?: string
  searchPlaceholder: string
  searchFields: string[]
  columns: PageColumn[]
  emptyMessage: string
  filters?: PageFilter[]
  mockData?: Record<string, any>[]
  /** 功能开发中标记：为 true 时显示"功能开发中/暂无数据"，不渲染假数据 */
  comingSoon?: boolean
  /** 静态 JSON 数据地址（相对于 public），加载后合并 mockData */
  dataUrl?: string
  idKey?: string
  pageSize?: number
  /** 表格顶部操作区域的自定义按钮 (已传 key) */
  topActions?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  /** 每行的自定义操作按钮 */
  rowActions?: { label: string; onClick: (row: Record<string, any>) => void; className?: string }[]
}

function generateMockRowCount(n: number): Record<string, any>[] {
  const firstNames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴']
  const lastNames = ['伟', '芳', '敏', '静', '丽', '强', '磊', '洋', '勇', '军']
  const industries = ['新能源', '汽车零部件', '电子制造', '医疗器械', '化工', '食品加工', '建筑材料', '纺织服装']
  const cities = ['北京', '上海', '广州', '深圳', '苏州', '杭州', '成都', '武汉', '南京', '重庆']
  const statuses = ['正常', '暂停', '待审核', '已完成', '进行中', '已关闭']

  return Array.from({ length: n }, (_, i) => ({
    id: `AUTO-${String(i + 1).padStart(4, '0')}`,
    name: firstNames[i % 10] + lastNames[(i + 3) % 10],
    contact: firstNames[(i + 5) % 10] + lastNames[(i + 1) % 10],
    phone: `1${String(30 + (i % 70)).padStart(2, '0')}${String(10000000 + i * 12345).slice(0, 8)}`,
    email: `contact${i + 1}@example.com`,
    industry: industries[i % industries.length],
    city: cities[i % cities.length],
    status: statuses[i % statuses.length],
    amount: (Math.random() * 100000 + 5000).toFixed(2),
    date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    qty: Math.floor(Math.random() * 500) + 10,
    code: `SN-${String(20260000 + i).padStart(8, '0')}`,
    desc: `${industries[i % industries.length]}相关产品与服务`,
    category: ['生产物料', '办公用品', '设备配件', '包装材料', '化学品'][i % 5],
    warehouse: ['主仓库', '成品仓', '原料仓', '备件仓'][i % 4],
    supplier: `${cities[i % 10]}${industries[(i + 2) % 8]}有限公司`,
    bom: `BOM-${String(100 + i).padStart(5, '0')}`,
    orderNo: `PO-${String(20260001 + i).padStart(8, '0')}`,
    planNo: `PLAN-${String(20260001 + i).padStart(8, '0')}`,
    taskNo: `TASK-${String(1000 + i).padStart(5, '0')}`,
    docNo: `DOC-${String(20260001 + i).padStart(8, '0')}`,
    changeNo: `ECN-${String(100 + i).padStart(5, '0')}`,
    invoiceNo: `INV-${String(20260001 + i).padStart(8, '0')}`,
    accountName: ['基本户-中国银行', '一般户-工商银行', '外汇户-招商银行', '支付宝企业账户'][i % 4],
    accountNo: `6228${String(20000000 + i * 123).slice(0, 12)}`,
    campaign: `${['春季','夏季','秋季','冬季'][i % 4]}促销活动`,
    channel: ['官网', '线下展会', '代理商', '电商平台', '社交媒体'][i % 5],
    keyword: `${industries[i % 8]}采购`,
    metric: (Math.random() * 50 + 30).toFixed(1) + '%',
    trend: [ '↑', '↓', '→' ][i % 3],
    conversion: (Math.random() * 20 + 5).toFixed(1) + '%',
    roi: ((Math.random() * 2 + 0.5) * 100).toFixed(0) + '%',
  }))
}

export default function GenericListPage({ config }: { config: PageConfig }) {
  const {
    title, subtitle, searchPlaceholder, searchFields, columns, emptyMessage,
    filters, mockData, comingSoon, dataUrl, idKey = 'id', pageSize = 10, topActions, rowActions,
  } = config

  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [fetchedData, setFetchedData] = useState<Record<string, any>[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!dataUrl) return
    setLoading(true)
    setFetchError(null)
    fetch(dataUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((arr: any) => {
        setFetchedData(Array.isArray(arr) ? arr : [])
      })
      .catch(e => {
        setFetchError(e?.message || '加载失败')
      })
      .finally(() => setLoading(false))
  }, [dataUrl])

  const sourceData = useMemo(() => {
    const base = mockData || []
    const extra = fetchedData || []
    return extra.length > 0 ? extra : base
  }, [mockData, fetchedData])

  const filtered = useMemo(() => {
    let data = sourceData
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(row =>
        searchFields.some(f => {
          const val = row[f]
          return val != null ? String(val).toLowerCase().includes(q) : false
        })
      )
    }
    if (filters) {
      for (const f of filters) {
        const fv = filterValues[f.key]
        if (fv && fv !== 'all') {
          data = data.filter(row => String(row[f.key]) === fv)
        }
      }
    }
    return data
  }, [search, filterValues, sourceData, searchFields, filters])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const getCellValue = (row: Record<string, any>, col: PageColumn) => {
    if (col.render) return col.render(row[col.key], row)
    const val = row[col.key]
    if (val == null) return '-'
    return String(val)
  }

  if (comingSoon) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20">
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <Clock size={40} />
            <p className="text-base font-medium text-gray-500">功能开发中</p>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">数据加载中...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 flex flex-col items-center justify-center gap-3 text-red-500">
          <p className="text-base font-medium">数据加载失败</p>
          <p className="text-sm text-gray-500">{fetchError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>

      {/* Search + Filters + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            className="input-field pl-9"
          />
        </div>
        {filters?.map(f => (
          <select
            key={f.key}
            value={filterValues[f.key] || 'all'}
            onChange={e => {
              setFilterValues(prev => ({ ...prev, [f.key]: e.target.value }))
              setPage(1)
            }}
            className="input-field w-auto"
          >
            <option value="all">全部{f.label}</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {topActions?.map((act, i) => (
          <button key={i} onClick={act.onClick} className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto ml-auto">
            {act.icon}{act.label}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className={`text-left px-4 py-3 font-medium text-gray-500 ${col.className || ''}`}>
                    {col.label}
                  </th>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <th className="text-right px-4 py-3 font-medium text-gray-500 w-20">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-12 text-gray-400">{emptyMessage}</td></tr>
              ) : paged.map((row, ri) => (
                <tr key={row[idKey] ?? ri} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map((col, ci) => (
                    <td key={ci} className={`px-4 py-3 ${col.className || ''}`}>
                      {getCellValue(row, col)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rowActions.map((act, ai) => (
                          <button
                            key={ai}
                            onClick={() => act.onClick(row)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${act.className || 'text-blue-600 hover:bg-blue-50'}`}
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">{emptyMessage}</div>
        ) : paged.map((row, ri) => (
          <div key={row[idKey] ?? ri} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            {columns.filter(c => !c.hideMobile).map((col, ci) => (
              <div key={ci} className="flex items-start justify-between gap-2">
                <span className="text-xs text-gray-400 shrink-0">{col.label}</span>
                <span className="text-xs text-right text-gray-700 break-all">{getCellValue(row, col)}</span>
              </div>
            ))}
            {rowActions && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                {rowActions.map((act, ai) => (
                  <button
                    key={ai}
                    onClick={() => act.onClick(row)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${act.className || 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">共 {filtered.length} 条，第 {page}/{totalPages} 页</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pg = i + 1
              if (totalPages > 5 && page > 3) pg = page - 2 + i
              if (totalPages > 5 && page > totalPages - 2) pg = totalPages - 4 + i
              if (pg > totalPages) return null
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded-md text-xs ${pg === page ? 'bg-brand-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { generateMockRowCount }
