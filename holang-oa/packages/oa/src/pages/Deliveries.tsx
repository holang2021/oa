import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, Edit } from 'lucide-react'
import { getDeliveries, type Delivery } from '../services/deliveryService'

export default function Deliveries() {
  const nav = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveries, setDeliveries] = useState<Delivery[]>([])

  useEffect(() => {
    loadDeliveries()
  }, [])

  const loadDeliveries = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getDeliveries({ pageSize: 500, salesType })
      setDeliveries(result.list)
    } catch {
      setError('加载发货数据失败')
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = deliveries.filter(d => {
    if (status && (d.flowStatus || '普通') !== status) return false
    if (kw) {
      const s = [d.id, d.order?.orderCode, d.customer?.companyName, d.receiver, d.code].join(' ')
      if (!s.includes(kw)) return false
    }
    return true
  })

  const stats = [
    { label: '发货申请', value: deliveries.length, color: 'text-blue-600' },
    { label: '普通发货', value: deliveries.filter(d => (d.flowStatus || '普通') === '普通').length, color: 'text-gray-600' },
    { label: '加急发货', value: deliveries.filter(d => (d.flowStatus || '普通') === '加急').length, color: 'text-orange-600' },
    { label: '已完成', value: deliveries.filter(d => d.deliveryDate).length, color: 'text-green-600' },
  ]

  const statusColors: Record<string, string> = {
    '普通': 'bg-gray-100 text-gray-600',
    '加急': 'bg-orange-100 text-orange-700',
    '已发货': 'bg-green-100 text-green-700',
  }

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
          placeholder="搜索编号/客户/收货人..."
          className="input text-sm flex-1"
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm w-40">
          <option value="">全部状态</option>
          <option value="普通">普通发货</option>
          <option value="加急">加急发货</option>
          <option value="已发货">已发货</option>
        </select>
        <button onClick={() => nav(`${basePath}/deliveries/new`)} className="btn btn-primary text-sm whitespace-nowrap">
          + 新建发货申请
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
                <th className="py-2">编号</th>
                <th>关联订单</th>
                <th>客户</th>
                <th>发货时间</th>
                <th>收货人</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{d.code || d.id.slice(-8)}</td>
                  <td className="font-mono text-xs">{d.order?.orderCode || '-'}</td>
                  <td>{d.customer?.companyName || '-'}</td>
                  <td>{d.deliveryDate ? d.deliveryDate.slice(0, 10) : '-'}</td>
                  <td>{d.receiver || '-'}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[d.flowStatus || '普通'] || 'bg-gray-100'}`}>
                      {d.flowStatus || '普通'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => nav(`${basePath}/deliveries/${d.id}`)} className="text-brand-600 hover:text-brand-800" title="查看明细"><Eye size={14} /></button>
                      <button onClick={() => nav(`${basePath}/deliveries/${d.id}/edit`)} className="text-brand-600 hover:underline text-xs">编辑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">暂无发货申请</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
