import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getQuotes, type Quote } from '../services/quoteService'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-yellow-100 text-yellow-700',
}

const statusLabels: Record<string, string> = {
  DRAFT: '草稿', draft: '草稿',
  SENT: '已发送', sent: '已发送',
  APPROVED: '已通过', approved: '已通过',
  REJECTED: '已驳回', rejected: '已驳回',
  EXPIRED: '已过期', expired: '已过期',
}

export default function Quotations() {
  const nav = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'

  const [list, setList] = useState<Quote[]>([])
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getQuotes({ pageSize: 500, salesType })
      setList(res.list)
    } catch {
      setError('加载报价单失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salesType])

  const filtered = list.filter(q => {
    if (status && (q.status || '').toUpperCase() !== status.toUpperCase()) return false
    if (kw) {
      const s = [q.code, q.customerName, q.creatorName].join(' ').toLowerCase()
      if (!s.includes(kw.toLowerCase())) return false
    }
    return true
  })

  const stats = [
    { label: '报价单', value: list.length, color: 'text-blue-600' },
    { label: '草稿', value: list.filter(q => (q.status || '').toUpperCase() === 'DRAFT').length, color: 'text-gray-600' },
    { label: '已发送', value: list.filter(q => (q.status || '').toUpperCase() === 'SENT').length, color: 'text-blue-600' },
    { label: '已通过', value: list.filter(q => (q.status || '').toUpperCase() === 'APPROVED').length, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card flex flex-col items-center py-3">
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="card flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="搜索报价单号/客户/创建人..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="SENT">已发送</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
          <option value="EXPIRED">已过期</option>
        </select>
        <button onClick={() => nav(`${basePath}/quotations/new`)} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建报价
        </button>
      </div>

      {/* 列表 */}
      <div className="card overflow-x-auto">
        {loading && <div className="text-center py-8 text-gray-400">加载中...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2">报价单号</th>
                <th>客户</th>
                <th>含税金额</th>
                <th>未税金额</th>
                <th>状态</th>
                <th>有效期至</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{q.code || '-'}</td>
                  <td>{q.customerName || '-'}</td>
                  <td className="font-medium">¥{(q.amount || 0).toLocaleString()}</td>
                  <td className="text-xs text-gray-500">¥{(q.amountWithoutTax || 0).toLocaleString()}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[q.status] || 'bg-gray-100'}`}>
                      {statusLabels[q.status] || q.status || '-'}
                    </span>
                  </td>
                  <td className="text-xs">{q.validUntil ? q.validUntil.slice(0, 10) : '-'}</td>
                  <td className="space-x-2">
                    <button onClick={() => nav(`${basePath}/quotations/${q.id}/edit`)} className="text-brand-600 hover:underline text-xs">
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">暂无报价单</div>
        )}
      </div>
    </div>
  )
}
