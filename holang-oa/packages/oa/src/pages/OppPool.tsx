import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Filter, Target, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { getOpportunities, type Opportunity } from '../services/opportunityService'

const STAGE_MAP: Record<string, string> = {
  INITIAL_CONTACT: '初步接洽',
  REQUIREMENT_CONFIRMED: '需求确认',
  QUOTING: '方案报价',
  CONTRACT_NEGOTIATION: '商务谈判',
  WON: '赢单',
  LOST: '输单',
}

function getStageLabel(stage?: string): string {
  if (!stage) return '-'
  return STAGE_MAP[stage] || stage
}

export default function OppPool() {
  const nav = useNavigate()
  const location = useLocation()
  const isExportRoute = location.pathname.startsWith('/export')
  const basePath = isExportRoute ? '/export' : '/domestic'
  const salesType = isExportRoute ? 'EXTERNAL' : 'INTERNAL'
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opps, setOpps] = useState<Opportunity[]>([])

  useEffect(() => {
    loadOpps()
  }, [])

  const loadOpps = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getOpportunities({ pageSize: 100, salesType })
      setOpps(result.list)
    } catch {
      setError('加载商机失败')
      setOpps([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = opps.filter(o => {
    const matchSearch = !search || o.name.includes(search) || (o.code || '').includes(search)
    const matchStage = !stageFilter || getStageLabel(o.stage) === stageFilter
    return matchSearch && matchStage
  })

  const getStageColor = (stage?: string) => {
    const label = getStageLabel(stage)
    if (label === '赢单') return 'bg-green-100 text-green-700'
    if (label === '输单') return 'bg-red-100 text-red-700'
    if (label === '商务谈判' || label === '合同签订') return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  const totalAmount = filtered.reduce((sum, o) => sum + (o.expectedAmount || 0), 0)
  const winAmount = filtered.filter(o => o.stage === 'WON').reduce((sum, o) => sum + (o.expectedAmount || 0), 0)
  const totalProbability = filtered.reduce((sum, o) => sum + (o.expectedAmount || 0) * (o.winProbability || 0) / 100, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">商机管理</h1>
        <button onClick={() => nav(`${basePath}/opportunities/new`)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> 新建商机
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-sm"><p className="text-xs text-gray-500">商机总数</p><p className="text-lg font-bold">{filtered.length}</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">预计总金额</p><p className="text-lg font-bold">¥{(totalAmount/10000).toFixed(1)}万</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">预计收入</p><p className="text-lg font-bold text-brand-600">¥{(totalProbability/10000).toFixed(1)}万</p></div>
        <div className="card-sm"><p className="text-xs text-gray-500">赢单金额</p><p className="text-lg font-bold text-green-600">¥{(winAmount/10000).toFixed(1)}万</p></div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索商机名称或编号..."
            className="input text-sm pl-9"
          />
        </div>
        <button onClick={() => setShowFilter(!showFilter)} className="btn-ghost flex items-center gap-2">
          <Filter size={16} /> 筛选 <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
        </button>
        {showFilter && (
          <div className="flex gap-2 flex-wrap">
            {['', '初步接洽', '需求确认', '方案报价', '商务谈判', '赢单', '输单'].map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1 rounded-full text-xs ${stageFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {s || '全部阶段'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="card overflow-x-auto">
        {loading && <div className="text-center py-8 text-gray-400">加载中...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2">商机编号</th>
                <th className="py-2">商机名称</th>
                <th className="py-2">所属客户</th>
                <th className="py-2">阶段</th>
                <th className="py-2">预计金额</th>
                <th className="py-2">成交概率</th>
                <th className="py-2">预计收入</th>
                <th className="py-2">负责人</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{o.code || '-'}</td>
                  <td className="py-2 font-medium">{o.name}</td>
                  <td className="py-2">{o.customer?.companyName || '-'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStageColor(o.stage)}`}>{getStageLabel(o.stage)}</span>
                  </td>
                  <td className="py-2">¥{(o.expectedAmount || 0).toLocaleString()}</td>
                  <td className="py-2">{o.winProbability || 0}%</td>
                  <td className="py-2">¥{Math.round((o.expectedAmount || 0) * (o.winProbability || 0) / 100).toLocaleString()}</td>
                  <td className="py-2">{o.salesOwner?.name || '-'}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button onClick={() => nav(`${basePath}/opportunities/${o.id}/edit`)} className="text-brand-600 hover:text-brand-800"><Edit2 size={14} /></button>
                      <button className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Target size={32} className="mx-auto mb-2 text-gray-300" />
            <p>暂无商机数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
